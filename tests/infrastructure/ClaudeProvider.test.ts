import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '../../src/domain/types/agent'
import { ClaudeProvider } from '../../src/infrastructure/providers/ClaudeProvider'

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn()
  return { default: MockAnthropic }
})

describe('ClaudeProvider', () => {
  const config: ProviderConfig = {
    id: 'anthropic',
    name: 'Anthropic',
    apiKey: 'sk-test',
    model: 'claude-sonnet-4-20250514',
    models: [{ modelName: 'claude-sonnet-4-20250514', maxTokens: 8192, thinkingMode: false, effort: 'high' }],
  }

  it('应该创建 ClaudeProvider 实例', () => {
    const provider = new ClaudeProvider(config)
    expect(provider.id).toBe('anthropic')
    expect(provider.model).toBe('claude-sonnet-4-20250514')
  })

  it('应该使用默认 model', () => {
    const c = { ...config, model: '' }
    const provider = new ClaudeProvider(c)
    expect(provider.model).toBe('claude-sonnet-4-20250514')
  })
})
