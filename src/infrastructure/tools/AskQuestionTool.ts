import type { ToolDef } from '../../domain/types/tool'

export const askQuestionTool: ToolDef = {
  name: 'ask_question',
  description:
    '向用户提问，获取用户的输入或选择。当需要用户做出决策、提供反馈或选择选项时使用。',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '向用户提出的问题' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: '选项显示文本' },
            value: { type: 'string', description: '选项值' },
            recommended: {
              type: 'boolean',
              description: '是否为推荐选项',
            },
          },
          required: ['label', 'value'],
        },
        description: '候选项列表（可选）',
      },
      allowInput: { type: 'boolean', description: '是否允许用户自由输入文本' },
      multiple: { type: 'boolean', description: '是否允许多选（默认单选）' },
    },
    required: ['question'],
  },
  isReadOnly: true,
  needsUserInput: true,
  handler: async () => ({ content: '' }),
}
