import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const readFileTool: ToolDef = {
  name: 'read_file',
  description: '读取指定路径的文件内容',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件路径',
      },
    },
    required: ['filePath'],
  },
  isReadOnly: true,
  handler: async (input, context) => {
    if (!input.filePath || typeof input.filePath !== 'string') {
      return { content: 'Parameter "filePath" is required', isError: true }
    }
    let filePath: string
    try {
      filePath = resolvePath(input.filePath, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    try {
      const content = await context.fileService.readFile(filePath)
      return { content }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
