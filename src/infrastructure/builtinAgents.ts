import type { AgentDefinition } from '../domain/types/agent'
import { parseAgentFile } from './ConfigService'

const builtinModules = import.meta.glob('./builtin-agents/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

let cached: AgentDefinition[] | null = null

export function loadBuiltinAgents(): AgentDefinition[] {
  if (cached) return cached
  cached = []
  for (const [path, content] of Object.entries(builtinModules)) {
    const agent = parseAgentFile(content)
    if (agent) {
      cached.push(agent)
    } else {
      console.warn(`跳过无效内置 agent 文件: ${path}`)
    }
  }
  return cached
}
