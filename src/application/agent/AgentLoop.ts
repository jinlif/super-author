import type { AgentMessage, AgentUIEvent } from '../../domain/types/agent'
import type { BookMeta } from '../../domain/types/book'
import type { ToolContext, ToolResult } from '../../domain/types/tool'
import type { IProvider } from '../../infrastructure/providers/IProvider'
import { SystemPrompt } from './SystemPrompt'
import { ToolExecutor } from './ToolExecutor'
import type { ToolRegistry } from './ToolRegistry'

const DEFAULT_MAX_TURNS = 30

export interface AgentLoopOptions {
  provider: IProvider
  registry: ToolRegistry
  toolContext: ToolContext
  bookMeta?: BookMeta | null
  dirDescriptions?: Record<string, string>
  description?: string
  signal?: AbortSignal
  maxTurns?: number
  onUserInput?: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>
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
      bookMeta,
      dirDescriptions,
      description,
      signal,
      maxTurns = DEFAULT_MAX_TURNS,
      onUserInput,
    } = options

    const executor = new ToolExecutor(registry)
    const systemPrompt = SystemPrompt.build(
      registry.list(),
      bookMeta ?? null,
      dirDescriptions ?? {},
      description,
      toolContext.bookDir,
    )
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

      // 分离 needsUserInput 工具和普通工具
      const needsInputCalls: typeof toolCalls = []
      const normalCalls: typeof toolCalls = []
      for (const tc of toolCalls) {
        const tool = registry.get(tc.name)
        if (tool?.needsUserInput && onUserInput) {
          needsInputCalls.push(tc)
        } else {
          normalCalls.push(tc)
        }
      }

      // 执行需要用户输入的工具（在 ToolExecutor 外处理）
      const needsInputResults: { id: string; result: ToolResult }[] = []
      for (const tc of needsInputCalls) {
        yield { type: 'waiting_confirm', toolName: tc.name, input: tc.input }
        const userResult = await onUserInput!(tc.name, tc.input)
        if (userResult === null) {
          yield { type: 'done' }
          return
        }
        needsInputResults.push({
          id: tc.id,
          result: { content: JSON.stringify(userResult) },
        })
      }

      // 执行普通工具
      const normalResults = await executor.executeAll(normalCalls, toolContext)

      // 合并结果
      const toolResults = [...needsInputResults, ...normalResults]

      for (const tr of toolResults) {
        const matchedCall = toolCalls.find((tc) => tc.id === tr.id)
        yield {
          type: 'tool_complete',
          toolId: tr.id,
          toolName: matchedCall?.name ?? '',
          input: matchedCall?.input ?? {},
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
    yield {
      type: 'error',
      message: `已达到最大对话轮次（${maxTurns}轮），Agent 已停止。如需继续，请发送新消息。`,
    }
  }
}
