import { describe, expect, it } from 'vitest'
import { ClaudeProvider } from '../../src/infrastructure/providers/ClaudeProvider'
import { createProvider } from '../../src/infrastructure/providers/createProvider'
import { OpenAIProvider } from '../../src/infrastructure/providers/OpenAIProvider'

describe('createProvider', () => {
  it('应该创建 ClaudeProvider', () => {
    const provider = createProvider({
      id: 'claude',
      name: 'Claude',
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-20250514',
    })
    expect(provider).toBeInstanceOf(ClaudeProvider)
  })

  it('应该创建 OpenAIProvider', () => {
    const provider = createProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
    })
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('未知 provider 应该抛出错误', () => {
    expect(() =>
      createProvider({
        id: 'unknown' as 'claude',
        name: 'Unknown',
        apiKey: '',
        model: '',
      }),
    ).toThrow('Unknown provider: unknown')
  })
})
