import type { ToolDef } from '../../domain/types/tool'
import { ChapterRepository } from '../ChapterRepository'

export const searchChaptersTool: ToolDef = {
  name: 'search_chapters',
  description: '在所有章节中全文搜索关键词，返回匹配的章节名和上下文',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词',
      },
    },
    required: ['query'],
  },
  isReadOnly: true,
  handler: async (input, context) => {
    const query = input.query
    if (!query || typeof query !== 'string') {
      return { content: 'Parameter "query" is required', isError: true }
    }

    try {
      const repo = new ChapterRepository(context.fileService)
      const chapters = await repo.listChapters(context.bookDir)
      const results: string[] = []

      for (const ch of chapters) {
        try {
          const content = await context.fileService.readFile(ch.filePath)
          const lines = content.split('\n')
          const matchingLines = lines
            .map((line, i) =>
              line.toLowerCase().includes(query.toLowerCase())
                ? `  L${i + 1}: ${line.trim()}`
                : null,
            )
            .filter(Boolean)
            .slice(0, 10)

          if (matchingLines.length > 0) {
            results.push(`--- ${ch.filePath} ---`)
            results.push(...(matchingLines as string[]))
          }
        } catch {
          // 跳过无法读取的章节
        }
      }

      if (results.length === 0) {
        return { content: `未找到包含 "${query}" 的内容` }
      }

      return { content: results.join('\n') }
    } catch (e) {
      return { content: `搜索失败: ${(e as Error).message}`, isError: true }
    }
  },
}
