// 工具系统类型

import type { IFileService } from '../../infrastructure/IFileService'
import type { AgentUIEvent } from './agent'

export interface ToolContext {
  fileService: IFileService
  bookDir: string
  onSubAgentEvent?: (event: AgentUIEvent) => void
}

export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolResult>

export interface ToolResult {
  content: string
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

/**
 * inputSchema 使用 JSON Schema 格式
 */
export interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: ToolHandler
  isReadOnly: boolean
  needsUserInput?: boolean
}

/** API 兼容格式（snake_case 字段名，不含 handler/isReadOnly） */
export interface ToolAPIFormat {
  name: string
  description: string
  input_schema: Record<string, unknown>
}
