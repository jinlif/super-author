import type { ProviderConfig } from '../../domain/types/agent'
import { ClaudeProvider } from './ClaudeProvider'
import type { IProvider } from './IProvider'
import { OpenAIProvider } from './OpenAIProvider'

export function createProvider(config: ProviderConfig): IProvider {
  switch (config.id) {
    case 'anthropic':
      return new ClaudeProvider(config)
    case 'openai':
      return new OpenAIProvider(config)
    default:
      throw new Error(`Unknown provider: ${config.id}`)
  }
}
