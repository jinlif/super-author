import { describe, expect, it } from 'vitest'
import type { ToolContext } from '../../src/domain/types/tool'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { readFileTool } from '../../src/infrastructure/tools/ReadFileTool'
import { writeFileTool } from '../../src/infrastructure/tools/WriteFileTool'
import { listDirTool } from '../../src/infrastructure/tools/ListDirTool'
import { createEntryTool } from '../../src/infrastructure/tools/CreateEntryTool'
import { getFileInfoTool } from '../../src/infrastructure/tools/GetFileInfoTool'
import { deleteEntryTool } from '../../src/infrastructure/tools/DeleteEntryTool'
import { grepTool } from '../../src/infrastructure/tools/GrepTool'
import { replaceFileTool } from '../../src/infrastructure/tools/ReplaceFileTool'
import { diffUpdateFileTool } from '../../src/infrastructure/tools/DiffUpdateFileTool'
import { renameEntryTool } from '../../src/infrastructure/tools/RenameEntryTool'

function createContext(fs: MockFileService): ToolContext {
  return { fileService: fs, bookDir: '/book' }
}

describe('ReadFileTool', () => {
  it('应该读取文件内容', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '# 第一章\n\n正文内容')
    const result = await readFileTool.handler({ filePath: '/book/ch01.md' }, createContext(fs))
    expect(result.content).toBe('# 第一章\n\n正文内容')
    expect(result.isError).toBeFalsy()
  })

  it('缺少 filePath 应返回错误', async () => {
    const result = await readFileTool.handler({}, createContext(new MockFileService()))
    expect(result.isError).toBe(true)
    expect(result.content).toContain('filePath')
  })

  it('文件不存在应返回错误', async () => {
    const result = await readFileTool.handler(
      { filePath: '/book/nonexistent.md' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('Error')
  })
})

describe('WriteFileTool', () => {
  it('应写入文件', async () => {
    const fs = new MockFileService()
    const result = await writeFileTool.handler(
      { filePath: '/book/ch01.md', content: '# 第一章\n\n新内容' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('已写入')
    const content = await fs.readFile('/book/ch01.md')
    expect(content).toBe('# 第一章\n\n新内容')
  })

  it('内容为空应返回错误', async () => {
    const result = await writeFileTool.handler(
      { filePath: '/book/test.md', content: '' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
  })

  it('缺少 filePath 应返回错误', async () => {
    const result = await writeFileTool.handler(
      { content: 'test' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
  })
})

describe('ListDirTool', () => {
  it('应列出目录内容', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/chapters')
    await fs.writeFile('/book/chapters/ch01.md', '# 第一章')
    const result = await listDirTool.handler({ dirPath: '/book/chapters' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('ch01.md')
  })

  it('空目录应返回提示', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/empty')
    const result = await listDirTool.handler({ dirPath: '/book/empty' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('空目录')
  })

  it('目录不存在应返回错误', async () => {
    const result = await listDirTool.handler(
      { dirPath: '/book/nonexistent' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
  })
})

describe('CreateEntryTool', () => {
  it('应创建文件', async () => {
    const fs = new MockFileService()
    const result = await createEntryTool.handler(
      { path: '/book/notes/idea.md', content: '# 想法' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('文件已创建')
    expect(await fs.readFile('/book/notes/idea.md')).toBe('# 想法')
  })

  it('应创建目录', async () => {
    const fs = new MockFileService()
    const result = await createEntryTool.handler({ path: '/book/notes' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('目录已创建')
    expect(await fs.exists('/book/notes')).toBe(true)
  })
})

describe('GetFileInfoTool', () => {
  it('应获取文件信息', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/test.md', 'hello world')
    const result = await getFileInfoTool.handler({ filePath: '/book/test.md' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('文件')
    expect(result.content).toContain('大小')
  })

  it('应获取目录信息', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/chapters')
    const result = await getFileInfoTool.handler({ filePath: '/book/chapters' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('目录')
  })

  it('不存在的路径应返回错误', async () => {
    const result = await getFileInfoTool.handler(
      { filePath: '/book/nonexistent' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
  })
})

describe('DeleteEntryTool', () => {
  it('应删除文件', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/temp.md', '临时文件')
    const result = await deleteEntryTool.handler({ path: '/book/temp.md' }, createContext(fs))
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('已删除')
    expect(await fs.exists('/book/temp.md')).toBe(false)
  })

  it('不存在的路径应返回错误', async () => {
    const result = await deleteEntryTool.handler(
      { path: '/book/nonexistent' },
      createContext(new MockFileService()),
    )
    expect(result.isError).toBe(true)
  })
})

describe('GrepTool', () => {
  it('应搜索文件内容', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/chapters')
    await fs.writeFile('/book/chapters/ch01.md', '# 第一章\n\n张三走进屋里')
    await fs.writeFile('/book/chapters/ch02.md', '# 第二章\n\n李四正在看书')
    const result = await grepTool.handler(
      { pattern: '张三', searchPath: '/book/chapters' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('张三')
    expect(result.content).not.toContain('李四')
  })

  it('无匹配应返回未找到', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/chapters')
    await fs.writeFile('/book/chapters/ch01.md', '# 第一章\n\n正文')
    const result = await grepTool.handler(
      { pattern: '不存在的内容', searchPath: '/book/chapters' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    expect(result.content).toContain('未找到')
  })
})

describe('ReplaceFileTool', () => {
  it('应替换文件内容', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '张三走进屋里\n张三坐下')
    const result = await replaceFileTool.handler(
      { filePath: '/book/ch01.md', pattern: '/张三/g', replacement: '李四' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    const content = await fs.readFile('/book/ch01.md')
    expect(content).toBe('李四走进屋里\n李四坐下')
  })

  it('非 global 匹配多个应报错', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '张三走进屋里\n张三坐下')
    const result = await replaceFileTool.handler(
      { filePath: '/book/ch01.md', pattern: '张三', replacement: '李四' },
      createContext(fs),
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('global')
  })

  it('单个匹配无需 global 也能替换', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/book/ch01.md', '张三走进屋里\n李四坐下')
    const result = await replaceFileTool.handler(
      { filePath: '/book/ch01.md', pattern: '张三', replacement: '王五' },
      createContext(fs),
    )
    expect(result.isError).toBeFalsy()
    const content = await fs.readFile('/book/ch01.md')
    expect(content).toBe('王五走进屋里\n李四坐下')
  })
})

describe('路径沙箱 — 越权路径拒绝', () => {
  const ctx = createContext(new MockFileService())

  it('read_file 拒绝 bookDir 外绝对路径', async () => {
    const result = await readFileTool.handler({ filePath: '/etc/passwd' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('write_file 拒绝 bookDir 外绝对路径', async () => {
    const result = await writeFileTool.handler(
      { filePath: '/etc/passwd', content: 'hack' },
      ctx,
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('create_entry 拒绝 bookDir 外绝对路径', async () => {
    const result = await createEntryTool.handler({ path: '/tmp/evil' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('delete_entry 拒绝 bookDir 外绝对路径', async () => {
    const result = await deleteEntryTool.handler({ path: '/tmp/target' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('rename_entry 拒绝 oldPath 越权', async () => {
    const result = await renameEntryTool.handler(
      { oldPath: '/etc/passwd', newPath: '/book/new.md' },
      ctx,
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('rename_entry 拒绝 newPath 越权', async () => {
    const result = await renameEntryTool.handler(
      { oldPath: '/book/old.md', newPath: '/etc/new' },
      ctx,
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('grep 拒绝 bookDir 外绝对路径', async () => {
    const result = await grepTool.handler({ pattern: 'test', searchPath: '/etc' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('diff_update_file 拒绝 bookDir 外绝对路径', async () => {
    const result = await diffUpdateFileTool.handler(
      { filePath: '/etc/passwd', diff: '@@ -1,0 +1,0 @@\n+test' },
      ctx,
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('get_file_info 拒绝 bookDir 外绝对路径', async () => {
    const result = await getFileInfoTool.handler({ filePath: '/etc/passwd' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })

  it('replace_file 拒绝 bookDir 外绝对路径', async () => {
    const result = await replaceFileTool.handler(
      { filePath: '/etc/passwd', pattern: 'root', replacement: 'admin' },
      ctx,
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('路径越权')
  })
})
