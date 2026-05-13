import { create } from 'zustand'
import type { AgentMessage, ConversationSummary, ProviderConfig } from '../../domain/types/agent'
import type { ToolContext } from '../../domain/types/tool'
import { ConfigService } from '../../infrastructure/ConfigService'
import { createFileService } from '../../infrastructure/createFileService'
import type { IFileService } from '../../infrastructure/IFileService'
import { createProvider } from '../../infrastructure/providers/createProvider'
import type { IProvider } from '../../infrastructure/providers/IProvider'
import { createChapterTool } from '../../infrastructure/tools/CreateChapterTool'
import { getCharactersTool } from '../../infrastructure/tools/GetCharactersTool'
import { readChapterTool } from '../../infrastructure/tools/ReadChapterTool'
import { readOutlineTool } from '../../infrastructure/tools/ReadOutlineTool'
import { searchChaptersTool } from '../../infrastructure/tools/SearchChaptersTool'
import { writeChapterTool } from '../../infrastructure/tools/WriteChapterTool'
import { AgentLoop } from '../agent/AgentLoop'
import { CommandRegistry } from '../agent/CommandRegistry'
import { ContextBuilder } from '../agent/ContextBuilder'
import { ToolRegistry } from '../agent/ToolRegistry'
import { useModelService } from '../services/ModelService'
import { useEditorStore } from './editorStore'

interface AgentStore {
  // State
  messages: AgentMessage[]
  isStreaming: boolean
  currentTurn: number
  error: string | null
  conversationId: string | null
  providerConfig: ProviderConfig
  tempChapterData: { title: string; content: string } | null
  conversationHistory: ConversationSummary[]
  _conversationCache: Record<string, AgentMessage[]>

  // Dependencies (injected)
  _registry: ToolRegistry | null
  _toolContext: ToolContext | null
  _abortController: AbortController | null
  _fs: IFileService
  _homeDir: string | null
  _configService: ConfigService | null
  commandRegistry: CommandRegistry

  // Actions
  setRegistry: (registry: ToolRegistry) => void
  setToolContext: (context: ToolContext) => void
  setFileService: (fs: IFileService, homeDir: string) => void
  init: () => Promise<void>
  initRegistry: (bookDir: string) => Promise<void>
  reloadCommands: (bookDir: string) => Promise<void>
  sendMessage: (text: string, currentChapterContent?: string) => Promise<void>
  abortStreaming: () => void
  clearConversation: () => void
  setProviderConfig: (config: Partial<ProviderConfig>) => void
  loadConversation: (
    conversationId: string,
    messages: AgentMessage[],
    providerConfig: ProviderConfig,
  ) => void
  loadConversationFromHistory: (id: string) => void
  deleteConversationFromHistory: (id: string) => void
  setTempChapterData: (data: { title: string; content: string } | null) => void
}

const defaultProviderConfig: ProviderConfig = {
  id: 'claude',
  name: 'Claude',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
  modelsConfig: {},
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentTurn: 0,
  error: null,
  conversationId: null,
  providerConfig: defaultProviderConfig,
  tempChapterData: null,
  conversationHistory: [],
  _conversationCache: {},

  _registry: null,
  _toolContext: null,
  _abortController: null,
  _fs: createFileService(),
  _homeDir: null,
  _configService: null,
  commandRegistry: (() => {
    const reg = new CommandRegistry()
    reg.registerBuiltin()
    return reg
  })(),

  setRegistry: (registry) => set({ _registry: registry }),

  setToolContext: (context) => set({ _toolContext: context }),

  setFileService: (fs: IFileService, homeDir: string) => {
    set({
      _fs: fs,
      _homeDir: homeDir,
      _configService: new ConfigService(fs, homeDir),
    })
  },

  init: async () => {
    const state = get()
    let configService = state._configService
    if (!configService) {
      const homeDir = await state._fs.getHomeDir()
      configService = new ConfigService(state._fs, homeDir)
      set({ _homeDir: homeDir, _configService: configService })
    }
    const provider = await configService.loadProviderConfig()
    // 同步当前模型的 maxTokens 到全局字段
    if (provider.model && provider.modelsConfig) {
      const modelCfg = provider.modelsConfig[provider.model]
      if (modelCfg?.maxTokens != null) {
        provider.maxTokens = modelCfg.maxTokens
      }
    }
    set({ providerConfig: provider })
  },

  reloadCommands: async (bookDir: string) => {
    const state = get()
    let configService = state._configService
    if (!configService) {
      const homeDir = await state._fs.getHomeDir()
      configService = new ConfigService(state._fs, homeDir)
      set({ _homeDir: homeDir, _configService: configService })
    }
    const commandsDir = `${bookDir}/.super-author/commands`
    const commands = await configService.loadCommandsFromDir(commandsDir)
    const registry = get().commandRegistry
    registry.registerCustom(commands)
  },

  initRegistry: async (bookDir: string) => {
    const state = get()
    const registry = new ToolRegistry()

    registry.register(readChapterTool)
    registry.register(writeChapterTool)
    registry.register(searchChaptersTool)
    registry.register(getCharactersTool)
    registry.register(createChapterTool)
    registry.register(readOutlineTool)

    set({
      _registry: registry,
      _toolContext: {
        fileService: state._fs,
        bookDir,
      },
    })
  },

  sendMessage: async (text, currentChapterContent) => {
    const state = get()
    if (state.isStreaming) return
    if (!state.providerConfig.apiKey) {
      const errorMsg: AgentMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: '⚠️ 请先配置 API Key' }],
      }
      set({ messages: [...state.messages, errorMsg], error: '请先配置 API Key' })
      return
    }
    if (!state._registry) {
      const errorMsg: AgentMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: '⚠️ ToolRegistry 未初始化' }],
      }
      set({ messages: [...state.messages, errorMsg], error: 'ToolRegistry 未初始化' })
      return
    }

    // 创建用户消息
    const userMessage: AgentMessage = {
      role: 'user',
      content: [{ type: 'text', text }],
    }

    const messages = [...state.messages, userMessage]
    set({
      messages,
      isStreaming: true,
      error: null,
      currentTurn: 0,
    })

    // 创建 Provider
    let provider: IProvider
    try {
      provider = createProvider(state.providerConfig)
    } catch (e) {
      const errorMsg: AgentMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: `⚠️ ${(e as Error).message}` }],
      }
      set((state) => ({
        messages: [...state.messages, errorMsg],
        error: (e as Error).message,
        isStreaming: false,
      }))
      return
    }

    // 构建上下文
    const toolContext = state._toolContext
    let systemContext: { currentChapter?: string } | undefined
    if (toolContext) {
      const contextBuilder = new ContextBuilder(toolContext.fileService, toolContext.bookDir)
      const ctx = await contextBuilder.build()
      if (currentChapterContent) {
        ctx.currentChapter = currentChapterContent
      }
      systemContext = ctx.currentChapter ? { currentChapter: ctx.currentChapter } : undefined
    }

    // 创建 AbortController
    const controller = new AbortController()
    set({ _abortController: controller })

    try {
      const gen = AgentLoop.run(messages, {
        provider,
        registry: state._registry,
        toolContext: toolContext ?? {
          fileService: null as unknown as ToolContext['fileService'],
          bookDir: '',
        },
        systemContext,
        signal: controller.signal,
      })

      // 流式处理 UI 事件
      let assistantText = ''
      let assistantThinking = ''
      const toolCallMap = new Map<string, { name: string; input: Record<string, unknown> }>()
      let turnCount = 0

      // 确保当前轮次有 assistant 消息（tool-only 轮次也需要）
      const ensureAssistantMessage = () => {
        set((state) => {
          const lastMsg = state.messages[state.messages.length - 1]
          if (lastMsg?.role === 'assistant') return state
          // 创建空 assistant 消息
          return {
            messages: [...state.messages, { role: 'assistant' as const, content: [] }],
          }
        })
      }

      for await (const event of gen) {
        switch (event.type) {
          case 'turn_start':
            turnCount++
            assistantText = ''
            assistantThinking = ''
            set({ currentTurn: turnCount })
            // 预创建 assistant 消息，确保 tool-only 轮次也有载体
            ensureAssistantMessage()
            break

          case 'thinking_delta':
            assistantThinking += event.text
            set((state) => {
              const msgs = state.messages.map((m) => ({ ...m, content: [...m.content] }))
              const lastMsg = msgs[msgs.length - 1]
              if (lastMsg?.role === 'assistant') {
                const thinkIdx = lastMsg.content.findIndex((b) => b.type === 'thinking')
                if (thinkIdx >= 0) {
                  lastMsg.content[thinkIdx] = { type: 'thinking', text: assistantThinking }
                } else {
                  lastMsg.content.unshift({ type: 'thinking', text: assistantThinking })
                }
              }
              return { messages: msgs }
            })
            break

          case 'stream_chunk':
            assistantText += event.text
            set((state) => {
              const msgs = state.messages.map((m) => ({ ...m, content: [...m.content] }))
              const lastMsg = msgs[msgs.length - 1]
              if (lastMsg?.role === 'assistant') {
                const textIdx = lastMsg.content.findIndex((b) => b.type === 'text')
                if (textIdx >= 0) {
                  lastMsg.content[textIdx] = { type: 'text', text: assistantText }
                } else {
                  lastMsg.content.push({ type: 'text', text: assistantText })
                }
              }
              return { messages: msgs }
            })
            break

          case 'tool_executing':
            toolCallMap.set(event.toolId, { name: event.toolName, input: {} })
            break

          case 'tool_complete': {
            const tc = toolCallMap.get(event.toolId)
            if (tc) {
              set((state) => {
                const msgs = state.messages.map((m) => ({ ...m, content: [...m.content] }))
                const lastMsg = msgs[msgs.length - 1]
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content.push({
                    type: 'tool_use',
                    id: event.toolId,
                    name: event.toolName,
                    input: tc.input,
                  })
                  // 添加结果告知用户
                  lastMsg.content.push({
                    type: 'text',
                    text: `\n\n[工具 ${event.toolName} 执行完成: ${event.result.slice(0, 100)}]`,
                  })
                }
                return { messages: msgs }
              })

              // Agent 内容写回：如果 write_chapter 写入的是已打开章节，更新 ModelService
              if (event.toolName === 'write_chapter') {
                const filePath = tc.input.filePath
                const content = tc.input.content
                if (
                  filePath &&
                  content &&
                  typeof filePath === 'string' &&
                  typeof content === 'string'
                ) {
                  const es = useEditorStore.getState()
                  const isOpen = es.tabs.some((t) => t.filePath === filePath)
                  if (isOpen) {
                    useModelService.getState().updateValue(filePath, content)
                  }
                }
              }

              // 检测临时章节
              if (event.toolName === 'write_chapter') {
                const input = tc.input
                if (!input.filePath && input.content) {
                  get().setTempChapterData({
                    title: (input.title as string) || '未命名',
                    content: input.content as string,
                  })
                }
              }
            }
            break
          }

          case 'error':
            set((state) => {
              const msgs = state.messages.map((m) => ({ ...m, content: [...m.content] }))
              const lastMsg = msgs[msgs.length - 1]
              if (lastMsg?.role === 'assistant') {
                const textIdx = lastMsg.content.findIndex((b) => b.type === 'text')
                const errorText = `⚠️ ${event.message}`
                if (textIdx >= 0) {
                  const existingBlock = lastMsg.content[textIdx]
                  if (existingBlock.type === 'text') {
                    lastMsg.content[textIdx] = {
                      type: 'text',
                      text: `${existingBlock.text}\n\n${errorText}`,
                    }
                  }
                } else {
                  lastMsg.content.push({ type: 'text', text: errorText })
                }
              } else {
                msgs.push({
                  role: 'assistant',
                  content: [{ type: 'text', text: `⚠️ ${event.message}` }],
                })
              }
              return { messages: msgs, error: event.message }
            })
            break

          case 'done':
            break
        }
      }

      // 检查是否有临时章节数据并提取
      // （临时章节由 write_chapter 的 tool result 产生，在 AgentLoop 内已处理）
    } catch (e) {
      if (!controller.signal.aborted) {
        const errorMsg: AgentMessage = {
          role: 'assistant',
          content: [{ type: 'text', text: `⚠️ ${(e as Error).message}` }],
        }
        set((state) => ({
          messages: [...state.messages, errorMsg],
          error: (e as Error).message,
        }))
      }
    } finally {
      set({ isStreaming: false, _abortController: null })
    }
  },

  abortStreaming: () => {
    const controller = get()._abortController
    if (controller) {
      controller.abort()
      set({ isStreaming: false, _abortController: null })
    }
  },

  clearConversation: () => {
    const state = get()
    // 自动保存当前会话到历史
    if (state.messages.length > 0) {
      const firstUserMsg = state.messages.find((m) => m.role === 'user')
      const textBlock = firstUserMsg?.content.find((b) => b.type === 'text') as
        | { type: 'text'; text: string }
        | undefined
      const title = textBlock?.text?.slice(0, 50) || '未命名对话'
      const id = state.conversationId || `conv-${Date.now()}`
      const summary: ConversationSummary = {
        id,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((s) => ({
        conversationHistory: [summary, ...s.conversationHistory.filter((h) => h.id !== id)],
        _conversationCache: { ...s._conversationCache, [id]: [...s.messages] },
      }))
    }
    set({ messages: [], conversationId: null, error: null, currentTurn: 0 })
  },

  setProviderConfig: (config) => {
    const state = get()
    const updated = { ...state.providerConfig, ...config }
    // 切换模型时，同步该模型的 maxTokens 到全局字段
    if (config.model && updated.modelsConfig) {
      const modelCfg = updated.modelsConfig[config.model]
      updated.maxTokens = modelCfg?.maxTokens
    }
    set({ providerConfig: updated })
    // 持久化配置
    const configService = state._configService
    if (configService) {
      configService.saveProviderConfig(updated)
    }
  },

  loadConversation: (conversationId, messages, providerConfig) => {
    set({ conversationId, messages, providerConfig })
  },

  loadConversationFromHistory: (id: string) => {
    const state = get()
    const cached = state._conversationCache[id]
    if (cached) {
      set({ messages: cached, conversationId: id, error: null, currentTurn: 0 })
    }
  },

  deleteConversationFromHistory: (id: string) => {
    set((s) => ({
      conversationHistory: s.conversationHistory.filter((h) => h.id !== id),
      _conversationCache: (() => {
        const cache = { ...s._conversationCache }
        delete cache[id]
        return cache
      })(),
    }))
  },

  setTempChapterData: (data) => set({ tempChapterData: data }),
}))
