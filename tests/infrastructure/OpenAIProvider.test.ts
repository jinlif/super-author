import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '../../src/domain/types/agent'
import { OpenAIProvider } from '../../src/infrastructure/providers/OpenAIProvider'

vi.mock('openai', () => {
  const MockOpenAI = vi.fn()
  return { default: MockOpenAI }
})

describe('OpenAIProvider', () => {
  const config: ProviderConfig = {
    id: 'openai',
    name: 'OpenAI',
    apiKey: 'sk-test',
    model: 'gpt-4o',
  }

  it('应该创建 OpenAIProvider 实例', () => {
    const provider = new OpenAIProvider(config)
    expect(provider.id).toBe('openai')
    expect(provider.model).toBe('gpt-4o')
  })

  it('应该使用默认 model', () => {
    const c = { ...config, model: '' }
    const provider = new OpenAIProvider(c)
    expect(provider.model).toBe('gpt-4o')
  })
})
