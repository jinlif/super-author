import type { ToolDef } from '../../domain/types/tool'
import { resolvePath } from './resolvePath'
import { toVirtualPath } from './virtualPath'

export const diffUpdateFileTool: ToolDef = {
  name: 'diff_update_file',
  description: '使用 diff 格式更新文件，只修改差异部分',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件路径',
      },
      diff: {
        type: 'string',
        description: 'diff 格式的变更内容（unified diff 格式）',
      },
    },
    required: ['filePath', 'diff'],
  },
  isReadOnly: false,
  handler: async (input, context) => {
    if (!input.filePath || typeof input.filePath !== 'string') {
      return { content: 'Parameter "filePath" is required', isError: true }
    }
    const diff = input.diff
    let filePath: string
    try {
      filePath = resolvePath(input.filePath, context.bookDir)
    } catch (e) {
      return { content: (e as Error).message, isError: true }
    }
    if (!diff || typeof diff !== 'string') {
      return { content: 'Parameter "diff" is required', isError: true }
    }

    try {
      const original = await context.fileService.readFile(filePath)
      const result = applyUnifiedDiff(original, diff)
      await context.fileService.writeFile(filePath, result)
      return { content: `文件已更新: ${toVirtualPath(filePath, context.bookDir)}` }
    } catch (e) {
      return { content: `Error: ${(e as Error).message}`, isError: true }
    }
  },
}

/**
 * 简单的 unified diff 应用器
 * 解析 unified diff 格式并应用到原文
 */
function applyUnifiedDiff(original: string, diff: string): string {
  const originalLines = original.split('\n')
  const diffLines = diff.split('\n')

  const result: string[] = []
  let origIdx = 0

  for (const line of diffLines) {
    // 跳过 diff 头部（---, +++, @@）
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
      // 解析 @@ 行获取起始位置
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
        if (match) {
          const newPos = Number.parseInt(match[1], 10) - 1
          // 复制原文到新位置之前
          while (origIdx < newPos && origIdx < originalLines.length) {
            result.push(originalLines[origIdx])
            origIdx++
          }
        }
      }
      continue
    }

    if (line.startsWith('-')) {
      // 删除行 — 跳过原文中的对应行
      origIdx++
    } else if (line.startsWith('+')) {
      // 添加行
      result.push(line.slice(1))
    } else {
      // 上下文行 — 从原文复制
      if (origIdx < originalLines.length) {
        result.push(originalLines[origIdx])
        origIdx++
      }
    }
  }

  // 复制剩余原文
  while (origIdx < originalLines.length) {
    result.push(originalLines[origIdx])
    origIdx++
  }

  return result.join('\n')
}
