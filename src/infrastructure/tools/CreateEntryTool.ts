import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const createEntryTool: ToolDef = {
  name: 'create_entry',
  description: '创建新文件或目录。传入 content 创建文件，不传则创建目录',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件或目录路径',
      },
      content: {
        type: 'string',
        description: '文件内容（可选，不传则创建目录）',
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
      if (input.content != null && typeof input.content === 'string') {
        await context.fileService.writeFile(resolvedPath, input.content)
        return { content: `文件已创建: ${resolvedPath}` }
      }
      await context.fileService.createDir(resolvedPath)
      return { content: `目录已创建: ${resolvedPath}` }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
