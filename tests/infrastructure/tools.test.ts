import { describe, expect, it } from 'vitest'
import type { ToolContext } from '../../src/domain/types/tool'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { createChapterTool } from '../../src/infrastructure/tools/CreateChapterTool'
import { getCharactersTool } from '../../src/infrastructure/tools/GetCharactersTool'
import { readChapterTool } from '../../src/infrastructure/tools/ReadChapterTool'
import { readOutlineTool } from '../../src/infrastructure/tools/ReadOutlineTool'
import { searchChaptersTool } from '../../src/infrastructure/tools/SearchChaptersTool'
import { writeChapterTool } from '../../src/infrastructure/tools/WriteChapterTool'

function createContext(fs: MockFileService): ToolContext {
  return { fileService: fs, bookDir: '/book' }
}

describe('ReadChapterTool', () => {
  it('应该读取章节文件', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '# 第一章\n\n正文内容')
    const result = await readChapterTool.handler({ filePath: '/book/ch01.md' }, createContext(fs))
    expect(result.content).toBe('# 第一章\n\n正文内容')
    expect(result.isError).toBeFalsy()
  })

  it('缺少 filePath 应返回错误', async () => {
    const result = await readChapterTool.handler({}, createContext(new MockFileService()))
    expect(result.isError).toBe(true)
    expect(result.content).toContain('filePath')
  })

  it('文件不存在应返回错误', async () => {
    const result = await readChapterTool.handler(
      { filePath: '/nonexistent.md' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('Error')
  })
})

describe('WriteChapterTool', () => {
  it('应写入已有章节', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '# 第一章')
    const result = await writeChapterTool.handler(
      { filePath: '/book/ch01.md', content: '# 第一章\n\n新内容' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('已更新')
    const content = await fs.readFile('/book/ch01.md')
    expect(content).toBe('# 第一章\n\n新内容')
  })

  it('内容为空应返回错误', async () => {
    const result = await writeChapterTool.handler(
      { content: '' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('Content cannot be empty')
  })

  it('应创建临时章节', async () => {
    const result = await writeChapterTool.handler(
      { title: '续写片段', content: '这是AI生成的内容' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('临时章节')
    expect(result.structuredContent?.isTemporary).toBe(true)
    expect(result.structuredContent?.content).toBe('这是AI生成的内容')
  })
})

describe('SearchChaptersTool', () => {
  it('应搜索章节内容', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '# 第一章\n\n张三走进屋里')
    await fs.writeFile('/book/ch02.md', '# 第二章\n\n李四正在看书')
    const result = await searchChaptersTool.handler(
      { query: '张三' },
      { fileService: fs, bookDir: '/book' },
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('张三')
    expect(result.content).not.toContain('李四')
  })

  it('无匹配应返回未找到', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '# 第一章\n\n正文')
    const result = await searchChaptersTool.handler(
      { query: '不存在的内容' },
      { fileService: fs, bookDir: '/book' },
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('未找到')
  })
})

describe('GetCharactersTool', () => {
  it('应读取角色文件', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/characters')
    await fs.writeFile('/book/characters/张三.md', '姓名：张三\n年龄：25\n性格：勇敢')
    const result = await getCharactersTool.handler({}, { fileService: fs, bookDir: '/book' })
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('张三')
    expect(result.content).toContain('勇敢')
  })

  it('角色文件不存在应返回提示', async () => {
    const result = await getCharactersTool.handler(
      {},
      { fileService: new MockFileService(), bookDir: '/book' },
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toBe('暂无角色信息')
  })
})

describe('CreateChapterTool', () => {
  it('应创建新章节', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/chapters')
    const result = await createChapterTool.handler(
      { title: '第三章 初遇' },
      { fileService: fs, bookDir: '/book' },
    )
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent?.filePath).toBeTruthy()
    expect(result.structuredContent?.title).toBe('第三章 初遇')
  })

  it('缺少 title 应返回错误', async () => {
    const result = await createChapterTool.handler(
      {},
      { fileService: new MockFileService(), bookDir: '/book' },
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('title')
  })
})

describe('ReadOutlineTool', () => {
  it('应读取大纲文件', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/outline')
    await fs.writeFile('/book/outline/outline.md', '# 大纲\n\n## 第一章\n\n开篇')
    const result = await readOutlineTool.handler({}, { fileService: fs, bookDir: '/book' })
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('# 大纲')
    expect(result.content).toContain('第一章')
  })

  it('大纲不存在应返回提示', async () => {
    const result = await readOutlineTool.handler(
      {},
      { fileService: new MockFileService(), bookDir: '/book' },
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toBe('暂无大纲文件')
  })
})
