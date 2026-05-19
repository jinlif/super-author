import type { CustomCommand } from '../domain/types/command'
import { parseCommandFile } from './ConfigService'

const builtinModules = import.meta.glob('./builtin-commands/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

let cached: CustomCommand[] | null = null

export function loadBuiltinCommands(): CustomCommand[] {
  if (cached) return cached
  cached = []
  for (const [path, content] of Object.entries(builtinModules)) {
    const cmd = parseCommandFile(content)
    if (cmd) {
      cached.push(cmd)
    } else {
      console.warn(`跳过无效内置命令文件: ${path}`)
    }
  }
  return cached
}
