import { describe, expect, it } from 'vitest'
import { ToolRegistry } from '../../src/application/agent/ToolRegistry'
import type { ToolDef } from '../../src/domain/types/tool'

const readTool: ToolDef = {
  name: 'read_chapter',
  description: '读取章节',
  inputSchema: { type: 'object', properties: {} },
  isReadOnly: true,
  handler: async () => ({ content: '' }),
}

const writeTool: ToolDef = {
  name: 'write_chapter',
  description: '写入章节',
  inputSchema: { type: 'object', properties: {} },
  isReadOnly: false,
  handler: async () => ({ content: '' }),
}

describe('ToolRegistry', () => {
  it('应注册工具并按名称获取', () => {
    const registry = new ToolRegistry()
    registry.register(readTool)
    expect(registry.get('read_chapter')).toBeDefined()
    expect(registry.get('read_chapter')?.name).toBe('read_chapter')
  })

  it('应注销工具', () => {
    const registry = new ToolRegistry()
    registry.register(readTool)
    registry.unregister('read_chapter')
    expect(registry.get('read_chapter')).toBeUndefined()
  })

  it('重名注册应覆盖', () => {
    const registry = new ToolRegistry()
    const v1: ToolDef = { ...readTool, description: 'v1' }
    const v2: ToolDef = { ...readTool, description: 'v2' }
    registry.register(v1)
    registry.register(v2)
    expect(registry.get('read_chapter')?.description).toBe('v2')
  })

  it('list 应返回所有工具', () => {
    const registry = new ToolRegistry()
    registry.register(readTool)
    registry.register(writeTool)
    expect(registry.list()).toHaveLength(2)
  })

  it('listForAPI 应返回 API 兼容格式', () => {
    const registry = new ToolRegistry()
    registry.register(readTool)
    const api = registry.listForAPI()
    expect(api[0]).toHaveProperty('name')
    expect(api[0]).toHaveProperty('description')
    expect(api[0]).toHaveProperty('input_schema')
    expect(api[0]).not.toHaveProperty('handler')
    expect(api[0]).not.toHaveProperty('isReadOnly')
  })

  it('getReadOnlyTools 应只返回只读工具', () => {
    const registry = new ToolRegistry()
    registry.register(readTool)
    registry.register(writeTool)
    const ro = registry.getReadOnlyTools()
    expect(ro).toHaveLength(1)
    expect(ro[0].name).toBe('read_chapter')
  })
})
