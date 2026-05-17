import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'
import { toVirtualPath } from './virtualPath'

export const replaceFileTool: ToolDef = {
  name: 'replace_file',
  description: '使用正则表达式替换文件内容。匹配多个结果且非 global 模式时报错',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件路径',
      },
      pattern: {
        type: 'string',
        description: '正则表达式模式（如 /foo/gi 或 foo）',
      },
      replacement: {
        type: 'string',
        description: '替换内容',
      },
    },
    required: ['filePath', 'pattern', 'replacement'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    if (!input.filePath || typeof input.filePath !== 'string') {
      return { content: 'Parameter "filePath" is required', isError: true }
    }
    const pattern = input.pattern
    const replacement = input.replacement
    let filePath: string
    try {
      filePath = resolvePath(input.filePath, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    if (!pattern || typeof pattern !== 'string') {
      return { content: 'Parameter "pattern" is required', isError: true }
    }
    if (replacement == null || typeof replacement !== 'string') {
      return { content: 'Parameter "replacement" is required', isError: true }
    }

    try {
      const content = await context.fileService.readFile(filePath)

      // 解析正则表达式
      const regex = parseRegex(pattern)
      if (!regex) {
        return { content: `无效的正则表达式: ${pattern}`, isError: true }
      }

      // 使用全局 regex 统计所有匹配
      const globalRegex = new RegExp(
        regex.source,
        regex.flags.includes('g') ? regex.flags : `${regex.flags}g`,
      )
      const allMatches = content.match(globalRegex)
      if (!allMatches || allMatches.length === 0) {
        return { content: `未找到匹配 "${pattern}" 的内容` }
      }

      // 非 global 模式下匹配多个时报错
      if (!regex.global && allMatches.length > 1) {
        return {
          content: `正则匹配到 ${allMatches.length} 个结果，请使用 global 标志 (/g) 以替换所有匹配`,
          isError: true,
        }
      }

      const result = content.replace(regex, replacement)
      await context.fileService.writeFile(filePath, result)
      return { content: `已替换 ${allMatches.length} 处匹配: ${toVirtualPath(filePath, context.bookDir)}` }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}

/** 解析正则表达式字符串，支持 /pattern/flags 格式和纯文本格式 */
function parseRegex(pattern: string): RegExp | null {
  // 尝试 /pattern/flags 格式
  const regexMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/)
  if (regexMatch) {
    try {
      return new RegExp(regexMatch[1], regexMatch[2])
    } catch {
      return null
    }
  }
  // 纯文本格式，默认 case-insensitive
  try {
    return new RegExp(pattern, 'i')
  } catch {
    return null
  }
}
