// 工具系统类型

import type { IFileService } from '../../infrastructure/IFileService'

export interface ToolContext {
  fileService: IFileService
  bookDir: string
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
}

/** API 兼容格式（snake_case 字段名，不含 handler/isReadOnly） */
export interface ToolAPIFormat {
  name: string
  description: string
  input_schema: Record<string, unknown>
}
