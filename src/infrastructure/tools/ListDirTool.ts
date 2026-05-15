import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const listDirTool: ToolDef = {
  name: 'list_dir',
  description: '列出指定目录下的文件和子目录',
  inputSchema: {
    type: 'object',
    properties: {
      dirPath: {
        type: 'string',
        description: '目录路径',
      },
    },
    required: ['dirPath'],
  },
  isReadOnly: true,
  handler: async (input, context) => {
    let dirPath: string
    try {
      dirPath = resolvePath(
        typeof input.dirPath === 'string' ? input.dirPath : undefined,
        context.bookDir,
      )
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    try {
      const exists = await context.fileService.exists(dirPath)
      if (!exists) {
        return { content: `目录不存在: ${dirPath}`, isError: true }
      }
      const entries = await context.fileService.readDir(dirPath)
      const lines = entries.map((e) => `${e.isDir ? '[DIR]' : '[FILE]'} ${e.name}`)
      return { content: lines.join('\n') || '(空目录)' }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
