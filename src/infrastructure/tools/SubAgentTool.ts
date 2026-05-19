import { AgentLoop } from '../../application/agent/AgentLoop'
import type { ToolRegistry } from '../../application/agent/ToolRegistry'
import type { AgentMessage, ProviderConfig } from '../../domain/types/agent'
import type { ToolDef } from '../../domain/types/tool'
import { createProvider } from '../providers/createProvider'

export interface SubAgentToolDeps {
  getProviderConfig: () => ProviderConfig
  getRegistry: () => ToolRegistry
}

export function createSubAgentTool(deps: SubAgentToolDeps): ToolDef {
  return {
    name: 'agent',
    description: '派生子任务。创建一个独立的子 Agent 执行指定任务，拥有干净的上下文',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '子任务描述',
        },
        model: {
          type: 'string',
          description: '模型名称（可选，默认使用当前配置的模型）',
        },
        maxTurns: {
          type: 'number',
          description: '最大执行轮次（可选，默认 5）',
        },
      },
      required: ['prompt'],
    },
    isReadOnly: false,
    handler: async (input, context) => {
      const prompt = input.prompt
      if (!prompt || typeof prompt !== 'string') {
        return { content: 'Parameter "prompt" is required', isError: true }
      }

      const maxTurns = typeof input.maxTurns === 'number' ? input.maxTurns : 5
      const modelOverride = typeof input.model === 'string' ? input.model : undefined

      try {
        // 获取父 Registry，排除 agent 工具防递归
        const parentRegistry = deps.getRegistry()
        const childTools = parentRegistry.list().filter((t) => t.name !== 'agent')

        // 准备 provider config
        const config = { ...deps.getProviderConfig() }
        if (modelOverride) {
          config.model = modelOverride
          // 同步 maxTokens
          if (config.modelsConfig?.[modelOverride]?.maxTokens) {
            config.maxTokens = config.modelsConfig[modelOverride].maxTokens
          }
        }

        const provider = createProvider(config)

        // 构建子 Agent 的初始消息（干净上下文）
        const messages: AgentMessage[] = [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ]

        // 创建子 ToolRegistry（排除 agent）
        const { ToolRegistry } = await import('../../application/agent/ToolRegistry')
        const childRegistry = new ToolRegistry()
        for (const tool of childTools) {
          childRegistry.register(tool)
        }

        // 执行子 Agent
        const gen = AgentLoop.run(messages, {
          provider,
          registry: childRegistry,
          toolContext: context,
          maxTurns,
        })

        let finalText = ''
        for await (const event of gen) {
          context.onSubAgentEvent?.(event)

          if (event.type === 'stream_chunk') {
            finalText += event.text
          }
          if (event.type === 'error') {
            return { content: `SubAgent 错误: ${event.message}`, isError: true }
          }
        }

        return { content: finalText || '（SubAgent 未产生输出）' }
      } catch (e) {
        return { content: `SubAgent 执行失败: ${(e as Error).message}`, isError: true }
      }
    },
  }
}
