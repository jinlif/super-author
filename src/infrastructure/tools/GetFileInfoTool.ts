import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'

export const getFileInfoTool: ToolDef = {
  name: 'get_file_info',
  description: '获取文件或目录的元信息（大小、修改时间、类型）',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件或目录路径',
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
      const exists = await context.fileService.exists(filePath)
      if (!exists) {
        return { content: `文件不存在: ${filePath}`, isError: true }
      }

      // 先尝试作为文件读取来判断类型
      let isDir = false
      let size: number | null = null
      try {
        const content = await context.fileService.readFile(filePath)
        size = new TextEncoder().encode(content).length
      } catch {
        // 读取失败，说明是目录
        isDir = true
      }

      const info: string[] = [`路径: ${filePath}`, `类型: ${isDir ? '目录' : '文件'}`]
      if (size !== null) {
        info.push(`大小: ${size} bytes`)
      }

      return { content: info.join('\n') }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}
