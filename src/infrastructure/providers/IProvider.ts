import type { AgentMessage, AgentStreamEvent, ProviderConfig } from '../../domain/types/agent'

export interface IProvider {
  readonly id: string
  readonly model: string
  createMessage(
    systemPrompt: string,
    messages: AgentMessage[],
    tools: { name: string; description: string; input_schema: Record<string, unknown> }[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent>
}

export type ProviderFactory = (config: ProviderConfig) => IProvider
