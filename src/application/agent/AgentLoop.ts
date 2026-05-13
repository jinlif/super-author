import type { AgentMessage, AgentUIEvent } from '../../domain/types/agent'
import type { ToolContext } from '../../domain/types/tool'
import type { IProvider } from '../../infrastructure/providers/IProvider'
import type { WritingContext } from './SystemPrompt'
import { SystemPrompt } from './SystemPrompt'
import { ToolExecutor } from './ToolExecutor'
import type { ToolRegistry } from './ToolRegistry'

const DEFAULT_MAX_TURNS = 10

export interface AgentLoopOptions {
  provider: IProvider
  registry: ToolRegistry
  toolContext: ToolContext
  systemContext?: WritingContext
  signal?: AbortSignal
  maxTurns?: number
}

export class AgentLoop {
  static async *run(
    messages: AgentMessage[],
    options: AgentLoopOptions,
  ): AsyncGenerator<AgentUIEvent> {
    const {
      provider,
      registry,
      toolContext,
      systemContext,
      signal,
      maxTurns = DEFAULT_MAX_TURNS,
    } = options

    const executor = new ToolExecutor(registry)
    const systemPrompt = SystemPrompt.build(registry.list(), systemContext)
    let currentMessages = [...messages]

    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) {
        yield { type: 'aborted' }
        return
      }

      yield { type: 'turn_start', turn: turn + 1 }

      // 收集本次调用的文本内容、思考内容和工具调用
      let fullText = ''
      let fullThinking = ''
      const toolCalls: { id: string; name: string; input: Record<string, unknown> }[] = []
      const toolAccum = new Map<string, string>() // toolId -> arguments JSON fragments

      const stream = provider.createMessage(
        systemPrompt,
        currentMessages,
        registry.listForAPI(),
        signal,
      )

      try {
        for await (const event of stream) {
          if (signal?.aborted) {
            yield { type: 'aborted' }
            return
          }

          if (event.type === 'text_delta') {
            fullText += event.text
            yield { type: 'stream_chunk', text: event.text }
          }

          if (event.type === 'thinking_delta') {
            fullThinking += event.text
            yield { type: 'thinking_delta', text: event.text }
          }

          if (event.type === 'tool_call_start') {
            yield { type: 'tool_executing', toolId: event.id, toolName: event.name }
            toolAccum.set(event.id, '')
          }

          if (event.type === 'tool_call_delta') {
            const existing = toolAccum.get(event.id) ?? ''
            toolAccum.set(event.id, existing + event.arguments)
          }

          if (event.type === 'tool_call_end') {
            let input = event.input
            // 如果有累积的 JSON 参数，尝试解析
            const rawJson = toolAccum.get(event.id)
            if (rawJson && (!input || Object.keys(input).length === 0)) {
              try {
                input = JSON.parse(rawJson)
              } catch {
                input = { _arguments: rawJson }
              }
            }
            toolCalls.push({ id: event.id, name: event.name, input })
          }
        }
      } catch (e) {
        if (signal?.aborted) {
          yield { type: 'aborted' }
          return
        }
        yield { type: 'error', message: (e as Error).message }
        return
      }

      // 添加助手消息到历史
      const assistantBlocks: AgentMessage['content'] = []
      if (fullThinking) {
        assistantBlocks.push({ type: 'thinking', text: fullThinking })
      }
      if (fullText) {
        assistantBlocks.push({ type: 'text', text: fullText })
      }
      for (const tc of toolCalls) {
        assistantBlocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.input,
        })
      }
      if (assistantBlocks.length > 0) {
        currentMessages = [...currentMessages, { role: 'assistant', content: assistantBlocks }]
      }

      // 如果没有工具调用，本轮结束
      if (toolCalls.length === 0) {
        yield { type: 'done' }
        return
      }

      // 执行工具
      const toolResults = await executor.executeAll(toolCalls, toolContext)

      for (const tr of toolResults) {
        yield {
          type: 'tool_complete',
          toolId: tr.id,
          toolName: toolCalls.find((tc) => tc.id === tr.id)?.name ?? '',
          result: tr.result.content,
        }
      }

      // 将工具结果作为 user 消息反馈给下一轮
      const toolResultBlocks: AgentMessage['content'] = toolResults.map((tr) => ({
        type: 'tool_result' as const,
        tool_use_id: tr.id,
        content: tr.result.content,
        is_error: tr.result.isError,
      }))
      currentMessages = [...currentMessages, { role: 'user', content: toolResultBlocks }]
    }

    // 达到最大轮次
    yield { type: 'done' }
  }
}
