import { beforeEach, describe, expect, it } from 'vitest'
import { accumulateTokenUsage, useAgentStore } from '../../src/application/stores/agentStore'

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.setState({
      messages: [],
      isStreaming: false,
      currentTurn: 0,
      error: null,
      conversationId: null,
      providerConfig: {
        id: 'anthropic',
        name: 'Anthropic',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        models: [{ modelName: 'claude-sonnet-4-20250514', maxTokens: 8192, thinkingMode: false, effort: 'high' }],
      },
      _abortController: null,
      tempChapterData: null,
      _subAgentBuf: { text: '', thinking: '', toolCallMap: new Map() },
    })
  })

  it('应初始化默认状态', () => {
    const state = useAgentStore.getState()
    expect(state.messages).toEqual([])
    expect(state.isStreaming).toBe(false)
    expect(state.error).toBeNull()
  })

  it('清空对话', () => {
    useAgentStore.setState({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      conversationId: 'test-id',
    })
    useAgentStore.getState().clearConversation()
    const state = useAgentStore.getState()
    expect(state.messages).toEqual([])
    expect(state.conversationId).toBeNull()
  })

  it('设置 Provider 配置', () => {
    useAgentStore.getState().setProviderConfig({ model: 'claude-opus-4-7' })
    const config = useAgentStore.getState().providerConfig
    expect(config.model).toBe('claude-opus-4-7')
    expect(config.id).toBe('anthropic') // 未覆盖字段不变
  })

  it('加载已有对话', () => {
    const messages = [
      { role: 'user' as const, content: [{ type: 'text' as const, text: 'hello' }] },
    ]
    useAgentStore.getState().loadConversation('conv-1', messages, {
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-xxx',
      model: 'gpt-4o',
      models: [{ modelName: 'gpt-4o', maxTokens: 8192, thinkingMode: false, effort: 'high' }],
    })
    const state = useAgentStore.getState()
    expect(state.conversationId).toBe('conv-1')
    expect(state.messages).toHaveLength(1)
    expect(state.providerConfig.id).toBe('openai')
  })

  it('apiKey 为空不应发送消息', async () => {
    useAgentStore.setState({
      providerConfig: { id: 'anthropic', name: 'Anthropic', apiKey: '', model: '', models: [] },
    })
    await useAgentStore.getState().sendMessage('测试')
    expect(useAgentStore.getState().error).toBe('请先配置 API Key')
  })

  describe('handleSubAgentEvent', () => {
    it('SubAgent 事件应创建独立消息', () => {
      const store = useAgentStore.getState()
      // 模拟 SubAgent 的 turn_start 事件
      store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
      const msgs = useAgentStore.getState().messages
      expect(msgs).toHaveLength(1)
      expect(msgs[0].role).toBe('assistant')
      expect(msgs[0].source).toBe('sub_agent')

      // 模拟 stream_chunk
      store.handleSubAgentEvent({ type: 'stream_chunk', text: '子Agent文本' })
      const msgs2 = useAgentStore.getState().messages
      const lastContent = msgs2[msgs2.length - 1].content
      expect(lastContent.some((b) => b.type === 'text' && b.text === '子Agent文本')).toBe(true)
    })

    it('thinking_delta 应更新子Agent消息的 thinking 块', () => {
      const store = useAgentStore.getState()
      store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
      store.handleSubAgentEvent({ type: 'thinking_delta', text: '思考中' })
      const msgs = useAgentStore.getState().messages
      const lastContent = msgs[msgs.length - 1].content
      expect(lastContent.some((b) => b.type === 'thinking' && b.text === '思考中')).toBe(true)
    })

    it('tool_complete 应在子Agent消息中添加 tool_use 和结果块', () => {
      const store = useAgentStore.getState()
      store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
      store.handleSubAgentEvent({ type: 'tool_executing', toolId: 't1', toolName: 'read_file' })
      store.handleSubAgentEvent({
        type: 'tool_complete',
        toolId: 't1',
        toolName: 'read_file',
        input: { filePath: '/test.txt' },
        result: '文件内容',
      })
      const msgs = useAgentStore.getState().messages
      const lastContent = msgs[msgs.length - 1].content
      expect(lastContent.some((b) => b.type === 'tool_use' && b.id === 't1')).toBe(true)
      expect(lastContent.some((b) => b.type === 'text' && b.text.includes('文件内容'))).toBe(true)
    })

    it('error 应在子Agent消息中追加错误文本', () => {
      const store = useAgentStore.getState()
      store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
      store.handleSubAgentEvent({ type: 'error', message: '出错了' })
      const msgs = useAgentStore.getState().messages
      const lastContent = msgs[msgs.length - 1].content
      expect(lastContent.some((b) => b.type === 'text' && b.text.includes('出错了'))).toBe(true)
    })

    it('多个 turn_start 应创建多条独立消息', () => {
      const store = useAgentStore.getState()
      store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
      store.handleSubAgentEvent({ type: 'stream_chunk', text: '第一轮' })
      store.handleSubAgentEvent({ type: 'turn_start', turn: 2 })
      store.handleSubAgentEvent({ type: 'stream_chunk', text: '第二轮' })
      const msgs = useAgentStore.getState().messages
      expect(msgs).toHaveLength(2)
      expect(msgs[0].source).toBe('sub_agent')
      expect(msgs[1].source).toBe('sub_agent')
    })
  })

  describe('token 追踪', () => {
    it('accumulateTokenUsage 应正确累积基本字段', () => {
      const session = { inputTokens: 100, outputTokens: 50 }
      const event = { inputTokens: 200, outputTokens: 80 }
      const result = accumulateTokenUsage(session, event)
      expect(result.currentTokenUsage.inputTokens).toBe(200)
      expect(result.currentTokenUsage.outputTokens).toBe(80)
      expect(result.sessionTokenUsage.inputTokens).toBe(300)
      expect(result.sessionTokenUsage.outputTokens).toBe(130)
    })

    it('accumulateTokenUsage 应正确处理可选字段的 undefined', () => {
      const session = { inputTokens: 10, outputTokens: 5 }
      const event = { inputTokens: 20, outputTokens: 8 }
      const result = accumulateTokenUsage(session, event)
      expect(result.sessionTokenUsage.cacheReadTokens).toBe(0)
      expect(result.sessionTokenUsage.cacheCreationTokens).toBe(0)
      expect(result.sessionTokenUsage.reasoningTokens).toBe(0)
    })

    it('accumulateTokenUsage 应正确累加可选字段', () => {
      const session = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 30, reasoningTokens: 10 }
      const event = { inputTokens: 200, outputTokens: 80, cacheReadTokens: 20, reasoningTokens: 5 }
      const result = accumulateTokenUsage(session, event)
      expect(result.sessionTokenUsage.cacheReadTokens).toBe(50)
      expect(result.sessionTokenUsage.reasoningTokens).toBe(15)
      expect(result.currentTokenUsage.cacheReadTokens).toBe(20)
    })

    it('clearConversation 应重置 token 计数器', () => {
      useAgentStore.setState({
        sessionTokenUsage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 100 },
        currentTokenUsage: { inputTokens: 200, outputTokens: 80 },
      })
      useAgentStore.getState().clearConversation()
      const state = useAgentStore.getState()
      expect(state.sessionTokenUsage).toEqual({ inputTokens: 0, outputTokens: 0 })
      expect(state.currentTokenUsage).toEqual({ inputTokens: 0, outputTokens: 0 })
    })

    it('handleSubAgentEvent usage 事件应累积 token', () => {
      const store = useAgentStore.getState()
      store.handleSubAgentEvent({ type: 'usage', inputTokens: 100, outputTokens: 50 })
      const s1 = useAgentStore.getState()
      expect(s1.currentTokenUsage.inputTokens).toBe(100)
      expect(s1.currentTokenUsage.outputTokens).toBe(50)
      expect(s1.sessionTokenUsage.inputTokens).toBe(100)
      expect(s1.sessionTokenUsage.outputTokens).toBe(50)

      store.handleSubAgentEvent({ type: 'usage', inputTokens: 200, outputTokens: 80 })
      const s2 = useAgentStore.getState()
      expect(s2.currentTokenUsage.inputTokens).toBe(200)
      expect(s2.currentTokenUsage.outputTokens).toBe(80)
      expect(s2.sessionTokenUsage.inputTokens).toBe(300)
      expect(s2.sessionTokenUsage.outputTokens).toBe(130)
    })
  })
})
