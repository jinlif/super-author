import { describe, expect, it } from 'vitest'
import { SystemPrompt } from '../../src/application/agent/SystemPrompt'
import type { ToolDef } from '../../src/domain/types/tool'

const mockTool: ToolDef = {
  name: 'read_file',
  description: '读取文件内容',
  inputSchema: { type: 'object', properties: {} },
  isReadOnly: true,
  handler: async () => ({ content: '' }),
}

const mockBookMeta = {
  title: '测试小说',
  author: '作者',
  tags: ['玄幻', '修仙'],
  style: '热血',
  dirDescriptions: {
    'chapters/': '存放章节正文',
    'characters/': '角色设定卡',
  },
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
}

describe('SystemPrompt', () => {
  it('应包含角色定义', () => {
    const prompt = SystemPrompt.build([mockTool], null, {})
    expect(prompt).toContain('超级作者')
    expect(prompt).toContain('网文写作助手')
  })

  it('应包含工具列表', () => {
    const prompt = SystemPrompt.build([mockTool], null, {})
    expect(prompt).toContain('read_file')
    expect(prompt).toContain('读取文件内容')
  })

  it('应包含书籍信息', () => {
    const prompt = SystemPrompt.build([mockTool], mockBookMeta, mockBookMeta.dirDescriptions)
    expect(prompt).toContain('测试小说')
    expect(prompt).toContain('玄幻')
    expect(prompt).toContain('热血')
  })

  it('应包含目录描述', () => {
    const prompt = SystemPrompt.build([mockTool], null, {
      'chapters/': '存放章节正文',
    })
    expect(prompt).toContain('chapters/')
    expect(prompt).toContain('存放章节正文')
  })

  it('应包含章节摘要声明', () => {
    const prompt = SystemPrompt.build([mockTool], null, {})
    expect(prompt).toContain('/chapter-summaries.json')
    expect(prompt).toContain('书籍根目录')
  })

  it('应包含章节/卷命名规范', () => {
    const prompt = SystemPrompt.build([mockTool], null, {})
    expect(prompt).toContain('章节文件')
    expect(prompt).toContain('卷目录')
    expect(prompt).toContain('listDir')
  })

  it('应包含 DESCRIPTION.md 内容', () => {
    const prompt = SystemPrompt.build([mockTool], mockBookMeta, {}, '这是一本好书')
    expect(prompt).toContain('这是一本好书')
  })

  it('应包含书籍根目录路径指引', () => {
    const prompt = SystemPrompt.build(
      [mockTool],
      mockBookMeta,
      mockBookMeta.dirDescriptions,
      undefined,
      'C:/Users/test/books/mybook',
    )
    expect(prompt).toContain('当前书籍根目录: /')
    expect(prompt).toContain('所有路径均相对于根目录')
  })

  it('无 bookDir 时不注入路径指引', () => {
    const prompt = SystemPrompt.build([mockTool], mockBookMeta, {})
    expect(prompt).not.toContain('当前书籍根目录')
  })
})

describe('SystemPrompt.buildForSubAgent', () => {
  it('应返回简化提示', () => {
    const prompt = SystemPrompt.buildForSubAgent([mockTool])
    expect(prompt).toContain('通用写作助手')
    expect(prompt).toContain('read_file')
    expect(prompt).not.toContain('超级作者')
  })

  it('应包含工具列表', () => {
    const prompt = SystemPrompt.buildForSubAgent([mockTool])
    expect(prompt).toContain('read_file')
    expect(prompt).toContain('读取文件内容')
  })
})
