import type { ToolDef } from '../../domain/types/tool'

export const readChapterTool: ToolDef = {
  name: 'read_chapter',
  description: '读取指定章节的完整内容',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '章节文件路径',
      },
    },
    required: ['filePath'],
  },
  isReadOnly: true,
  handler: async (input, context) => {
    const filePath = input.filePath
    if (!filePath || typeof filePath !== 'string') {
      return { content: 'Parameter "filePath" is required', isError: true }
    }
    try {
      const content = await context.fileService.readFile(filePath)
      return { content }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
