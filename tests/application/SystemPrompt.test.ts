import { describe, expect, it } from 'vitest'
import { SystemPrompt } from '../../src/application/agent/SystemPrompt'
import type { ToolDef } from '../../src/domain/types/tool'

const mockTool: ToolDef = {
  name: 'read_chapter',
  description: '读取章节内容',
  inputSchema: { type: 'object', properties: {} },
  isReadOnly: true,
  handler: async () => ({ content: '' }),
}

describe('SystemPrompt', () => {
  it('应包含角色定义', () => {
    const prompt = SystemPrompt.build([mockTool])
    expect(prompt).toContain('超级作者')
    expect(prompt).toContain('网文写作助手')
  })

  it('应包含工具列表', () => {
    const prompt = SystemPrompt.build([mockTool])
    expect(prompt).toContain('read_chapter')
    expect(prompt).toContain('读取章节内容')
  })

  it('应注入写作上下文', () => {
    const prompt = SystemPrompt.build([mockTool], {
      currentChapter: '第一章 正文',
      characters: '张三：主角',
    })
    expect(prompt).toContain('第一章 正文')
    expect(prompt).toContain('张三：主角')
  })
})
