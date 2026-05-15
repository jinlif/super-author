import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const writeFileTool: ToolDef = {
  name: 'write_file',
  description: '全量覆盖写入文件内容',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件路径',
      },
      content: {
        type: 'string',
        description: '文件内容',
      },
    },
    required: ['filePath', 'content'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    if (!input.filePath || typeof input.filePath !== 'string') {
      return { content: 'Parameter "filePath" is required', isError: true }
    }
    const content = input.content
    let filePath: string
    try {
      filePath = resolvePath(input.filePath, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    if (content == null || typeof content !== 'string') {
      return { content: 'Parameter "content" is required', isError: true }
    }
    if (content.length === 0) {
      return { content: 'Content cannot be empty', isError: true }
    }
    try {
      await context.fileService.writeFile(filePath, content)
      return { content: `文件已写入: ${filePath}` }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
