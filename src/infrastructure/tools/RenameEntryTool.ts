import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const renameEntryTool: ToolDef = {
  name: 'rename_entry',
  description: '重命名文件或目录',
  inputSchema: {
    type: 'object',
    properties: {
      oldPath: {
        type: 'string',
        description: '原路径',
      },
      newPath: {
        type: 'string',
        description: '新路径',
      },
    },
    required: ['oldPath', 'newPath'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    if (!input.oldPath || typeof input.oldPath !== 'string') {
      return { content: 'Parameter "oldPath" is required', isError: true }
    }
    if (!input.newPath || typeof input.newPath !== 'string') {
      return { content: 'Parameter "newPath" is required', isError: true }
    }
    let oldPath: string
    let newPath: string
    try {
      oldPath = resolvePath(input.oldPath, context.bookDir)
      newPath = resolvePath(input.newPath, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    try {
      const exists = await context.fileService.exists(oldPath)
      if (!exists) {
        return { content: `源路径不存在: ${oldPath}`, isError: true }
      }
      const targetExists = await context.fileService.exists(newPath)
      if (targetExists) {
        return { content: `目标路径已存在: ${newPath}`, isError: true }
      }

      // IFileService 没有 rename 方法，使用 read + write + remove 实现
      // 对于目录，这不适用，但 IFileService 的 remove 应该能处理目录
      try {
        await context.fileService.readDir(oldPath)
        // 是目录 —— IFileService 不支持目录重命名
        return {
          content: '目录重命名暂不支持，请使用创建新目录 + 移动文件的方式',
          isError: true,
        }
      } catch {
        // 是文件
        const content = await context.fileService.readFile(oldPath)
        await context.fileService.writeFile(newPath, content)
        await context.fileService.remove(oldPath)
        return { content: `已重命名: ${oldPath} -> ${newPath}` }
      }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
