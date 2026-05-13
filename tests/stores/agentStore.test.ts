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
        id: 'claude',
        name: 'Claude',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        models: ['claude-sonnet-4-20250514'],
      },
      _abortController: null,
      tempChapterData: null,
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
    expect(config.id).toBe('claude') // 未覆盖字段不变
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
      models: ['gpt-4o'],
    })
    const state = useAgentStore.getState()
    expect(state.conversationId).toBe('conv-1')
    expect(state.messages).toHaveLength(1)
    expect(state.providerConfig.id).toBe('openai')
  })

  it('apiKey 为空不应发送消息', async () => {
    useAgentStore.setState({
      providerConfig: { id: 'claude', name: 'Claude', apiKey: '', model: '', models: [] },
    })
    await useAgentStore.getState().sendMessage('测试')
    expect(useAgentStore.getState().error).toBe('请先配置 API Key')
  })
})
