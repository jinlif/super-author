import { describe, expect, it, vi } from 'vitest'
import { createSubAgentTool } from '../../src/infrastructure/tools/SubAgentTool'
import { ToolRegistry } from '../../src/application/agent/ToolRegistry'
import type { AgentStreamEvent, AgentUIEvent } from '../../src/domain/types/agent'
import type { IProvider } from '../../src/infrastructure/providers/IProvider'
import { MockFileService } from '../../src/infrastructure/MockFileService'

// vi.hoisted 确保 mock 函数在 vi.mock 工厂之前创建
const { mockCreateProvider } = vi.hoisted(() => ({
  mockCreateProvider: vi.fn<(config: unknown) => IProvider>(),
}))

vi.mock('../../src/infrastructure/providers/createProvider', () => ({
  createProvider: (config: unknown) => mockCreateProvider(config),
}))

function createMockProvider(events: AgentStreamEvent[]): IProvider {
  return {
    id: 'mock',
    model: 'mock-model',
    async *createMessage() {
      for (const e of events) yield e
    },
  }
}

describe('SubAgentTool 事件透传', () => {
  it('应将 AgentLoop 事件通过 onSubAgentEvent 透传给父级', async () => {
    const provider = createMockProvider([
      { type: 'text_delta', text: '子Agent回复' },
    ])

    mockCreateProvider.mockReturnValue(provider)

    const registry = new ToolRegistry()
    const tool = createSubAgentTool({
      getProviderConfig: () => ({
        id: 'mock' as 'claude',
        name: 'Mock',
        apiKey: 'sk-test',
        model: 'mock-model',
        models: ['mock-model'],
      }),
      getRegistry: () => registry,
      getAgentDefinitions: () => [],
    })

    const collectedEvents: AgentUIEvent[] = []
    const context = {
      fileService: new MockFileService(),
      bookDir: '/book',
      onSubAgentEvent: (event: AgentUIEvent) => collectedEvents.push(event),
    }

    const result = await tool.handler({ prompt: '测试任务' }, context)

    expect(result.isError).toBeFalsy()
    expect(collectedEvents.some((e) => e.type === 'turn_start')).toBe(true)
    expect(collectedEvents.some((e) => e.type === 'stream_chunk')).toBe(true)
    expect(collectedEvents.some((e) => e.type === 'done')).toBe(true)
  })
})
