import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const deleteEntryTool: ToolDef = {
  name: 'delete_entry',
  description: '删除指定的文件或目录',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件或目录路径',
      },
    },
    required: ['path'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    if (!input.path || typeof input.path !== 'string') {
      return { content: 'Parameter "path" is required', isError: true }
    }
    let resolvedPath: string
    try {
      resolvedPath = resolvePath(input.path, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    try {
      const exists = await context.fileService.exists(resolvedPath)
      if (!exists) {
        return { content: `路径不存在: ${resolvedPath}`, isError: true }
      }
      await context.fileService.remove(resolvedPath)
      return { content: `已删除: ${resolvedPath}` }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
