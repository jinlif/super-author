import type { ToolDef } from '../../domain/types/tool'

export const writeChapterTool: ToolDef = {
  name: 'write_chapter',
  description: '写入章节内容。提供 filePath 时覆盖已有章节，不提供时创建临时章节',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '章节文件路径（可选，不填则创建临时章节）',
      },
      title: {
        type: 'string',
        description: '章节标题（创建临时章节时必填）',
      },
      content: {
        type: 'string',
        description: '章节正文内容',
      },
    },
    required: ['content'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    const content = input.content
    if (!content || typeof content !== 'string') {
      return { content: 'Content cannot be empty', isError: true }
    }

    const filePath = input.filePath
    if (filePath && typeof filePath === 'string') {
      // 写入已有章节
      await context.fileService.writeFile(filePath, content)
      return { content: `章节已更新: ${filePath}` }
    }

    // 创建临时章节
    const title = (input.title as string) || '未命名'
    return {
      content: `临时章节已创建: ${title}`,
      structuredContent: {
        tempChapterId: `temp-${Date.now()}`,
        title,
        content,
        isTemporary: true,
      },
    }
  },
}
