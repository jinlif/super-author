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
}

// Provider 配置

export interface ModelConfig {
  maxTokens?: number
}

export interface ProviderConfig {
  id: 'claude' | 'openai'
  name: string
  apiKey: string
  model: string
  models: string[]
  baseUrl?: string
  maxTokens?: number
  temperature?: number
  thinkingMode?: boolean
  modelsConfig?: Record<string, ModelConfig>
}

// 流式事件（Provider → AgentLoop）

export type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; arguments: string }
  | { type: 'tool_call_end'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'thinking_delta'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'error'; message: string }

// UI 事件（AgentLoop → UI 组件）

export type AgentUIEvent =
  | { type: 'stream_chunk'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_executing'; toolId: string; toolName: string }
  | { type: 'tool_complete'; toolId: string; toolName: string; result: string }
  | { type: 'turn_start'; turn: number }
  | { type: 'done' }
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
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}
