import type { ToolDef } from '../../domain/types/tool'
import { ChapterRepository } from '../ChapterRepository'

export const createChapterTool: ToolDef = {
  name: 'create_chapter',
  description: '创建新的章节文件',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: '章节标题',
      },
      outline: {
        type: 'string',
        description: '章节大纲（可选）',
      },
    },
    required: ['title'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    const title = input.title
    if (!title || typeof title !== 'string') {
      return { content: 'Parameter "title" is required', isError: true }
    }

    try {
      const repo = new ChapterRepository(context.fileService)
      const chapter = await repo.createChapter(context.bookDir, title)

      // 如果提供了 outline，写入章节文件
      if (input.outline && typeof input.outline === 'string') {
        const content = `# ${title}\n\n${input.outline}\n\n`
        await context.fileService.writeFile(chapter.filePath, content)
      }

      return {
        content: `新章节已创建: ${chapter.filePath}`,
        structuredContent: { filePath: chapter.filePath, title, order: chapter.order },
      }
    } catch (e) {
      return { content: `创建章节失败: ${(e as Error).message}`, isError: true }
    }
  },
}
