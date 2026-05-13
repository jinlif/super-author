import type { ToolAPIFormat, ToolDef } from '../../domain/types/tool'

export class ToolRegistry {
  private tools = new Map<string, ToolDef>()

  register(tool: ToolDef): void {
    this.tools.set(tool.name, tool)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name)
  }

  list(): ToolDef[] {
    return Array.from(this.tools.values())
  }

  listForAPI(): ToolAPIFormat[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Record<string, unknown>,
    }))
  }

  getReadOnlyTools(): ToolDef[] {
    return this.list().filter((t) => t.isReadOnly)
  }
}
