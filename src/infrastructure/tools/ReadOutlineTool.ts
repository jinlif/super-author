import type { ToolDef } from '../../domain/types/tool'

export const readOutlineTool: ToolDef = {
  name: 'read_outline',
  description: '读取当前书籍的大纲文件',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  isReadOnly: true,
  handler: async (_input, context) => {
    try {
      const outlinePath = `${context.bookDir}/outline/outline.md`
      const exists = await context.fileService.exists(outlinePath)
      if (!exists) {
        return { content: '暂无大纲文件' }
      }
      const content = await context.fileService.readFile(outlinePath)
      return { content }
    } catch (e) {
      return { content: `读取大纲失败: ${(e as Error).message}`, isError: true }
    }
  },
}
