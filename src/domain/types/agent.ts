// Agent 消息类型

export type MessageRole = 'user' | 'assistant' | 'system'

export interface UserContentBlock {
  type: 'text'
  text: string
}

export interface ToolResultContentBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export interface AssistantContentBlock {
  type: 'text' | 'tool_use' | 'thinking'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

export interface AgentMessage {
  role: MessageRole
  content: (UserContentBlock | AssistantContentBlock | ToolResultContentBlock)[]
  source?: 'main' | 'sub_agent'
}

// Provider 配置

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface ModelsItem {
  modelName: string
  maxTokens: number
  thinkingMode: boolean
  effort: EffortLevel
}

export interface ProviderConfig {
  id: 'anthropic' | 'openai'
  name: string
  apiKey: string
  model: string
  models: ModelsItem[]
  baseUrl?: string
  temperature?: number
  presetName?: string
}

// Token 统计

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number      // Anthropic cache_read / OpenAI cached_tokens
  cacheCreationTokens?: number  // Anthropic 专属
  reasoningTokens?: number      // OpenAI 专属 (o1/o3)
}

// 流式事件（Provider → AgentLoop）

export type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; arguments: string }
  | { type: 'tool_call_end'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'thinking_delta'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number } & Partial<TokenUsage>
  | { type: 'error'; message: string }

// UI 事件（AgentLoop → UI 组件）

export type AgentUIEvent =
  | { type: 'stream_chunk'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_executing'; toolId: string; toolName: string }
  | {
      type: 'tool_complete'
      toolId: string
      toolName: string
      input: Record<string, unknown>
      result: string
    }
  | { type: 'turn_start'; turn: number }
  | { type: 'waiting_confirm'; toolName: string; input: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'usage'; inputTokens: number; outputTokens: number } & Partial<TokenUsage>
  | { type: 'error'; message: string }
  | { type: 'aborted' }

// 对话记录

export interface Conversation {
  id: string
  title: string
  messages: AgentMessage[]
  providerId: string
  modelId: string
  createdAt: string
  updatedAt: string
  version: number
  tokenUsage?: TokenUsage
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

// Agent 定义（从 .md 文件加载）

export interface AgentDefinition {
  name: string
  description: string
  model?: string
  maxTurns?: number
  tools?: string[]
  systemPrompt: string
}

// SubAgent 输入

export interface SubAgentInput {
  prompt: string
  model?: string
  maxTurns?: number
  subagent_type?: string
}
