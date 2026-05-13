import type { ToolDef } from '../../domain/types/tool'

export const getCharactersTool: ToolDef = {
  name: 'get_characters',
  description: '获取当前书籍的角色列表',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  isReadOnly: true,
  handler: async (_input, context) => {
    try {
      const charactersDir = `${context.bookDir}/characters`
      const exists = await context.fileService.exists(charactersDir)
      if (!exists) {
        return { content: '暂无角色信息' }
      }

      const entries = await context.fileService.readDir(charactersDir)
      const characterFiles = entries.filter((e) => !e.isDir && e.name.endsWith('.md'))

      if (characterFiles.length === 0) {
        return { content: '暂无角色信息' }
      }

      const characters: string[] = []
      for (const entry of characterFiles) {
        try {
          const content = await context.fileService.readFile(entry.path)
          characters.push(`--- ${entry.name} ---\n${content.trim()}`)
        } catch {
          characters.push(`--- ${entry.name} ---\n（读取失败）`)
        }
      }

      return { content: characters.join('\n\n') }
    } catch (e) {
      return { content: `读取角色失败: ${(e as Error).message}`, isError: true }
    }
  },
}
