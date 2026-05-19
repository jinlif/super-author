import { AgentLoop } from '../../application/agent/AgentLoop'
import { SystemPrompt } from '../../application/agent/SystemPrompt'
import type { ToolRegistry } from '../../application/agent/ToolRegistry'
import type { AgentDefinition, AgentMessage, ProviderConfig } from '../../domain/types/agent'
import type { ToolDef } from '../../domain/types/tool'
import { createProvider } from '../providers/createProvider'

export interface SubAgentToolDeps {
  getProviderConfig: () => ProviderConfig
  getRegistry: () => ToolRegistry
  getAgentDefinitions: () => AgentDefinition[]
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
        subagent_type: {
          type: 'string',
          description: 'Agent 类型名称（可选，对应 .md 文件中定义的 name）',
        },
        model: {
          type: 'string',
          description: '模型名称（可选，默认使用当前配置的模型）',
        },
        maxTurns: {
          type: 'number',
          description: '最大执行轮次（可选，默认无限制）',
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
      const subagentType = typeof input.subagent_type === 'string' ? input.subagent_type : undefined

      try {
        // 查找 agent 定义
        const agentDefs = deps.getAgentDefinitions()
        const agentDef = subagentType
          ? agentDefs.find((a) => a.name === subagentType)
          : undefined

        // 获取父 Registry，排除 agent 工具防递归
        const parentRegistry = deps.getRegistry()
        let childTools = parentRegistry.list().filter((t) => t.name !== 'agent')

        // 若 agent 定义限制了工具列表，过滤工具
        if (agentDef?.tools) {
          childTools = childTools.filter((t) => agentDef.tools!.includes(t.name))
        }

        // 准备 provider config
        const parentConfig = deps.getProviderConfig()
        const config = { ...parentConfig, models: [...parentConfig.models] }
        let effectiveModel = modelOverride ?? agentDef?.model
        // 若 agent 定义的模型不在 provider 模型列表中，回退到当前系统模型
        if (effectiveModel && !parentConfig.models.some((m) => m.modelName === effectiveModel)) {
          effectiveModel = undefined
        }
        if (effectiveModel) {
          config.model = effectiveModel
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

        // 构建系统提示
        const systemPromptOverride = agentDef
          ? SystemPrompt.buildForAgent(agentDef, childTools)
          : SystemPrompt.buildForSubAgent(childTools)

        // 执行子 Agent
        const gen = AgentLoop.run(messages, {
          provider,
          registry: childRegistry,
          toolContext: context,
          maxTurns: maxTurns ?? agentDef?.maxTurns,
          systemPromptOverride,
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
