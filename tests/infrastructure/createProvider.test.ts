import { describe, expect, it } from 'vitest'
import { ClaudeProvider } from '../../src/infrastructure/providers/ClaudeProvider'
import { createProvider } from '../../src/infrastructure/providers/createProvider'
import { OpenAIProvider } from '../../src/infrastructure/providers/OpenAIProvider'

describe('createProvider', () => {
  it('应该创建 ClaudeProvider', () => {
    const provider = createProvider({
      id: 'anthropic',
      name: 'Anthropic',
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-20250514',
      models: [{ modelName: 'claude-sonnet-4-20250514', maxTokens: 8192, thinkingMode: false, effort: 'high' }],
    })
    expect(provider).toBeInstanceOf(ClaudeProvider)
  })

  it('应该创建 OpenAIProvider', () => {
    const provider = createProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      models: [{ modelName: 'gpt-4o', maxTokens: 8192, thinkingMode: false, effort: 'high' }],
    })
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('未知 provider 应该抛出错误', () => {
    expect(() =>
      createProvider({
        id: 'unknown' as 'anthropic',
        name: 'Unknown',
        apiKey: '',
        model: '',
        models: [],
      }),
    ).toThrow('Unknown provider: unknown')
  })
})
