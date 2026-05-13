import type { ToolContext, ToolResult } from '../../domain/types/tool'
import type { ToolRegistry } from './ToolRegistry'

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async executeAll(
    toolCalls: { id: string; name: string; input: Record<string, unknown> }[],
    context: ToolContext,
  ): Promise<{ id: string; result: ToolResult }[]> {
    if (toolCalls.length === 0) return []

    // 检查是否全部只读
    const allReadOnly = toolCalls.every((tc) => {
      const tool = this.registry.get(tc.name)
      return tool?.isReadOnly ?? false
    })

    if (allReadOnly) {
      // 并发执行
      return Promise.all(
        toolCalls.map((tc) =>
          this.executeOne(tc, context).then((result) => ({ id: tc.id, result })),
        ),
      )
    }

    // 串行执行
    const results: { id: string; result: ToolResult }[] = []
    for (const tc of toolCalls) {
      const result = await this.executeOne(tc, context)
      results.push({ id: tc.id, result })
    }
    return results
  }

  private async executeOne(
    toolCall: { id: string; name: string; input: Record<string, unknown> },
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.name)
    if (!tool) {
      return { content: `未知工具: ${toolCall.name}`, isError: true }
    }
    try {
      return await tool.handler(toolCall.input, context)
    } catch (e) {
      return { content: `工具执行失败: ${(e as Error).message}`, isError: true }
    }
  }
}
