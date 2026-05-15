import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const grepTool: ToolDef = {
  name: 'grep',
  description: '使用正则表达式搜索文件内容，返回匹配的文件路径、行号和内容',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '正则表达式模式',
      },
      searchPath: {
        type: 'string',
        description: '搜索目录路径',
      },
    },
    required: ['pattern', 'searchPath'],
  },
  isReadOnly: true,
  handler: async (input, context) => {
    const pattern = input.pattern
    if (!pattern || typeof pattern !== 'string') {
      return { content: 'Parameter "pattern" is required', isError: true }
    }
    let searchPath: string
    try {
      searchPath = resolvePath(
        typeof input.searchPath === 'string' ? input.searchPath : undefined,
        context.bookDir,
      )
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }

    try {
      const regex = new RegExp(pattern, 'gi')
      const results: string[] = []

      async function searchDir(dirPath: string): Promise<void> {
        const entries = await context.fileService.readDir(dirPath)
        for (const entry of entries) {
          if (entry.isDir) {
            await searchDir(entry.path)
          } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
            try {
              const content = await context.fileService.readFile(entry.path)
              const lines = content.split('\n')
              for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                  results.push(`${entry.path}:${i + 1}: ${lines[i].trim()}`)
                }
                regex.lastIndex = 0
              }
            } catch {
              // 跳过不可读文件
            }
          }
        }
      }

      await searchDir(searchPath)

      if (results.length === 0) {
        return { content: `未找到匹配 "${pattern}" 的内容` }
      }

      return { content: results.slice(0, 50).join('\n') }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
