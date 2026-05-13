import { describe, expect, it } from 'vitest'
import { AgentLoop } from '../../src/application/agent/AgentLoop'
import { ToolRegistry } from '../../src/application/agent/ToolRegistry'
import type { AgentStreamEvent } from '../../src/domain/types/agent'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import type { IProvider } from '../../src/infrastructure/providers/IProvider'

describe('AgentLoop', () => {
  function createMockProvider(events: AgentStreamEvent[]): IProvider {
    return {
      id: 'mock',
      model: 'mock-model',
      async *createMessage() {
        for (const e of events) {
          yield e
        }
      },
    }
  }

  it('单轮文本回复应直接完成', async () => {
    const provider = createMockProvider([
      { type: 'text_delta', text: '你好' },
      { type: 'text_delta', text: '世界' },
    ])
    const registry = new ToolRegistry()
    const events: import('../../src/domain/types/agent').AgentUIEvent[] = []

    for await (const event of AgentLoop.run([], {
      provider,
      registry,
      toolContext: { fileService: new MockFileService(), bookDir: '/book' },
    })) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'stream_chunk')).toBe(true)
    expect(events.some((e) => e.type === 'done')).toBe(true)
  })

  it('多轮工具调用', async () => {
    const readTool = {
      name: 'read_chapter',
      description: '读取章节',
      inputSchema: { type: 'object', properties: {} },
      isReadOnly: true,
      handler: async () => ({ content: '章节内容' }),
    }

    const registry = new ToolRegistry()
    registry.register(readTool)

    // 第一轮：工具调用，第二轮：文本回复
    let callCount = 0
    const provider: IProvider = {
      id: 'mock',
      model: 'mock-model',
      async *createMessage() {
        callCount++
        if (callCount === 1) {
          yield { type: 'tool_call_start', id: 'tool1', name: 'read_chapter' }
          yield { type: 'tool_call_end', id: 'tool1', name: 'read_chapter', input: {} }
        } else {
          yield { type: 'text_delta', text: '完成' }
        }
      },
    }

    const events: import('../../src/domain/types/agent').AgentUIEvent[] = []
    for await (const event of AgentLoop.run([], {
      provider,
      registry,
      toolContext: { fileService: new MockFileService(), bookDir: '/book' },
      maxTurns: 3,
    })) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'tool_executing')).toBe(true)
    expect(events.some((e) => e.type === 'tool_complete')).toBe(true)
    expect(events.some((e) => e.type === 'done')).toBe(true)
  })

  it('应响应中止信号', async () => {
    const provider: IProvider = {
      id: 'mock',
      model: 'mock-model',
      async *createMessage() {
        yield { type: 'text_delta', text: '正在生成...' }
        // 不继续 yield
      },
    }

    const controller = new AbortController()
    const events: import('../../src/domain/types/agent').AgentUIEvent[] = []

    const gen = AgentLoop.run([], {
      provider,
      registry: new ToolRegistry(),
      toolContext: { fileService: new MockFileService(), bookDir: '/book' },
      signal: controller.signal,
    })

    // 消费第一项后中止
    const first = await gen.next()
    if (first.value) events.push(first.value)
    controller.abort()

    for await (const event of gen) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'aborted')).toBe(true)
  })

  it('达到最大轮次应完成', async () => {
    const registry = new ToolRegistry()
    registry.register({
      name: 'dummy_tool',
      description: 'dummy',
      inputSchema: { type: 'object', properties: {} },
      isReadOnly: true,
      handler: async () => ({ content: 'ok' }),
    })

    const provider: IProvider = {
      id: 'mock',
      model: 'mock-model',
      async *createMessage() {
        yield { type: 'tool_call_start', id: 't1', name: 'dummy_tool' }
        yield { type: 'tool_call_end', id: 't1', name: 'dummy_tool', input: {} }
      },
    }

    const events: import('../../src/domain/types/agent').AgentUIEvent[] = []
    for await (const event of AgentLoop.run([], {
      provider,
      registry,
      toolContext: { fileService: new MockFileService(), bookDir: '/book' },
      maxTurns: 2,
    })) {
      events.push(event)
    }

    // 应该有 done 事件
    expect(events.some((e) => e.type === 'done')).toBe(true)
    // 最多 2 轮 turn_start
    const turnStarts = events.filter((e) => e.type === 'turn_start')
    expect(turnStarts.length).toBeLessThanOrEqual(2)
  })
})
