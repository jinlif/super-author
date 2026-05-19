import { beforeEach, describe, expect, it } from 'vitest'
import { useAgentStore } from '../../src/application/stores/agentStore'

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
})
