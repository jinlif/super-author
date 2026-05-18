import type { ToolDef } from '../../domain/types/tool'

export const approvalTool: ToolDef = {
  name: 'approval',
  description:
    '请求用户审批一个操作。在执行敏感操作（如写入文件）前调用此工具获取用户许可。传递给用户的 title 应清晰描述需要确认的操作。',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '审批标题，清晰描述需要用户确认的操作' },
    },
    required: ['title'],
  },
  isReadOnly: true,
  needsUserInput: true,
  handler: async () => ({ content: '' }),
}
