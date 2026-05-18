import { create } from 'zustand'
import type { AgentMessage, ConversationSummary, ProviderConfig } from '../../domain/types/agent'
import type { ToolContext } from '../../domain/types/tool'
import { ConfigService } from '../../infrastructure/ConfigService'
import { createFileService } from '../../infrastructure/createFileService'
import type { IFileService } from '../../infrastructure/IFileService'
import { createProvider } from '../../infrastructure/providers/createProvider'
import type { IProvider } from '../../infrastructure/providers/IProvider'
import { createEntryTool } from '../../infrastructure/tools/CreateEntryTool'
import { deleteEntryTool } from '../../infrastructure/tools/DeleteEntryTool'
import { resolvePath } from '../../infrastructure/tools/resolvePath'
import { applyUnifiedDiff } from '../../infrastructure/tools/DiffUpdateFileTool'
import { parseRegex } from '../../infrastructure/tools/ReplaceFileTool'
import { diffUpdateFileTool } from '../../infrastructure/tools/DiffUpdateFileTool'
import { getFileInfoTool } from '../../infrastructure/tools/GetFileInfoTool'
import { grepTool } from '../../infrastructure/tools/GrepTool'
import { listDirTool } from '../../infrastructure/tools/ListDirTool'
import { readFileTool } from '../../infrastructure/tools/ReadFileTool'
import { renameEntryTool } from '../../infrastructure/tools/RenameEntryTool'
import { replaceFileTool } from '../../infrastructure/tools/ReplaceFileTool'
import { createSubAgentTool } from '../../infrastructure/tools/SubAgentTool'
import { writeFileTool } from '../../infrastructure/tools/WriteFileTool'
import { approvalTool } from '../../infrastructure/tools/ApprovalTool'
import { askQuestionTool } from '../../infrastructure/tools/AskQuestionTool'
import { AgentLoop } from '../agent/AgentLoop'
import { CommandRegistry } from '../agent/CommandRegistry'
import { ConversationStore } from '../agent/ConversationStore'
import { ToolRegistry } from '../agent/ToolRegistry'
import { useModelService } from '../services/ModelService'
import { useBookStore } from './bookStore'
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
  pendingTool: {
    name: string
    input: Record<string, unknown>
    resolve: (result: Record<string, unknown> | null) => void
  } | null
  diffForReview: {
    title: string
    filePath: string
    original: string
    modified: string
  } | null
  _conversationCache: Record<string, AgentMessage[]>

  // Dependencies (injected)
  _registry: ToolRegistry | null
  _toolContext: ToolContext | null
  _abortController: AbortController | null
  _fs: IFileService
  _homeDir: string | null
  _configService: ConfigService | null
  _conversationStore: ConversationStore | null
  commandRegistry: CommandRegistry

  // Actions
  setRegistry: (registry: ToolRegistry) => void
  setToolContext: (context: ToolContext) => void
  setFileService: (fs: IFileService, homeDir: string) => void
  init: () => Promise<void>
  initRegistry: (bookDir: string) => Promise<void>
  reloadCommands: (bookDir: string) => Promise<void>
  sendMessage: (
    text: string,
    currentChapterContent?: string,
    mentionContents?: string[],
  ) => Promise<void>
  abortStreaming: () => void
  resolvePending: (result: Record<string, unknown> | null) => void
  clearConversation: () => void
  setProviderConfig: (config: Partial<ProviderConfig>) => void
  loadConversation: (
    conversationId: string,
    messages: AgentMessage[],
    providerConfig: ProviderConfig,
  ) => void
  loadConversationFromHistory: (id: string) => Promise<void>
  deleteConversationFromHistory: (id: string) => void
  loadConversationHistory: () => Promise<void>
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
  pendingTool: null,
  diffForReview: null,
  _conversationCache: {},

  _registry: null,
  _toolContext: null,
  _abortController: null,
  _fs: createFileService(),
  _homeDir: null,
  _configService: null,
  _conversationStore: null,
  commandRegistry: (() => {
    const reg = new CommandRegistry()
    reg.registerBuiltin()
    return reg
  })(),

  setRegistry: (registry) => set({ _registry: registry }),

  setToolContext: (context) => set({ _toolContext: context }),

  setFileService: (fs: IFileService, homeDir: string) => {
    const configService = new ConfigService(fs, homeDir)
    set({
      _fs: fs,
      _homeDir: homeDir,
      _configService: configService,
      _conversationStore: new ConversationStore(fs, configService.historyDir),
    })
  },

  init: async () => {
    const state = get()
    let configService = state._configService
    if (!configService) {
      const homeDir = await state._fs.getHomeDir()
      configService = new ConfigService(state._fs, homeDir)
      set({
        _homeDir: homeDir,
        _configService: configService,
        _conversationStore: new ConversationStore(state._fs, configService.historyDir),
      })
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

    registry.register(readFileTool)
    registry.register(listDirTool)
    registry.register(createEntryTool)
    registry.register(getFileInfoTool)
    registry.register(deleteEntryTool)
    registry.register(renameEntryTool)
    registry.register(grepTool)
    registry.register(writeFileTool)
    registry.register(diffUpdateFileTool)
    registry.register(replaceFileTool)
    registry.register(approvalTool)
    registry.register(askQuestionTool)
    registry.register(
      createSubAgentTool({
        getProviderConfig: () => get().providerConfig,
        getRegistry: () => registry,
      }),
    )

    set({
      _registry: registry,
      _toolContext: {
        fileService: state._fs,
        bookDir,
      },
    })
  },

  sendMessage: async (text, _currentChapterContent, mentionContents) => {
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

    // 构建上下文
    const toolContext = state._toolContext
    const bookStore = useBookStore.getState()
    const bookMeta = bookStore.currentBook
      ? {
          title: bookStore.currentBook.title,
          author: bookStore.currentBook.author,
          tags: bookStore.currentBook.tags,
          style: bookStore.currentBook.style,
          dirDescriptions: bookStore.currentBook.dirDescriptions,
          createdAt: bookStore.currentBook.createdAt,
          updatedAt: bookStore.currentBook.updatedAt,
        }
      : null
    const dirDescriptions = bookMeta?.dirDescriptions ?? {}
    const description = bookStore.bookDescription

    // 创建用户消息
    const userMessage: AgentMessage = {
      role: 'user',
      content: [{ type: 'text', text }],
    }

    // 更新 messages 状态（不包含 AGENT.md，避免重复保存到历史）
    const messages = [...state.messages, userMessage]
    set({
      messages,
      isStreaming: true,
      error: null,
      currentTurn: 0,
    })

    // 构建发送给 API 的消息（临时注入 AGENT.md，不影响保存的消息）
    let apiMessages = [...messages]
    if (toolContext) {
      try {
        const agentMdPath = `${toolContext.bookDir}/AGENT.md`
        if (await state._fs.exists(agentMdPath)) {
          const agentMdContent = await state._fs.readFile(agentMdPath)
          if (agentMdContent.trim()) {
            const agentMdMessage: AgentMessage = {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `<system-reminder>\n# AGENT.md\n${agentMdContent}\n</system-reminder>`,
                },
              ],
            }
            apiMessages = [agentMdMessage, ...apiMessages]
          }
        }
      } catch {
        // AGENT.md 读取失败，跳过
      }
    }

    // 注入引用文件内容
    if (mentionContents && mentionContents.length > 0) {
      const mentionMessage: AgentMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `<system-reminder>\n# 引用文件\n\n${mentionContents.join('\n\n---\n\n')}\n</system-reminder>`,
          },
        ],
      }
      apiMessages = [...apiMessages.slice(0, 1), mentionMessage, ...apiMessages.slice(1)]
    }

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

    // 创建 AbortController
    const controller = new AbortController()
    set({ _abortController: controller })

    let pendingResolve: ((result: Record<string, unknown> | null) => void) | null = null

    try {
      const gen = AgentLoop.run(apiMessages, {
        provider,
        registry: state._registry,
        toolContext: toolContext ?? {
          fileService: null as unknown as ToolContext['fileService'],
          bookDir: '',
        },
        bookMeta,
        dirDescriptions,
        description,
        signal: controller.signal,
        onUserInput: (_toolName, _input) => {
          return new Promise<Record<string, unknown> | null>((resolve) => {
            pendingResolve = resolve
          })
        },
      })

      // 流式处理 UI 事件
      let assistantText = ''
      let assistantThinking = ''
      const toolCallMap = new Map<string, { name: string; input: Record<string, unknown> }>()
      let turnCount = 0

      // 确保当前轮次有 assistant 消息（每轮创建新消息，避免 thinking 内容被覆盖）
      const ensureAssistantMessage = () => {
        set((state) => {
          // 每轮都创建新的 assistant 消息，确保每个轮次的 thinking 内容独立保存
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
            set(() => {
              const state = get()
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
            set(() => {
              const state = get()
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

          case 'waiting_confirm': {
            const toolName = event.toolName
            const input = event.input
            const filePath = input.filePath as string | undefined
            const title = String(input.title ?? `确认 ${toolName} 操作`)

            const newPendingTool = {
              name: toolName,
              input,
              resolve: (result: Record<string, unknown> | null) => {
                pendingResolve?.(result)
                pendingResolve = null
              },
            }

            // 文件写入工具：计算 diffForReview
            const writeFileTools = ['write_file', 'diff_update_file', 'replace_file']
            if (writeFileTools.includes(toolName) && filePath) {
              const bookDir = get()._toolContext?.bookDir
              let originalContent = ''
              try {
                const absolutePath = resolvePath(filePath, bookDir ?? '')
                originalContent = await get()._fs.readFile(absolutePath)
              } catch {
                // 文件不存在（新建）— original 为空
                originalContent = ''
              }

              let modifiedContent = ''
              if (toolName === 'write_file') {
                modifiedContent = String(input.content ?? '')
              } else if (toolName === 'diff_update_file') {
                const diff = String(input.diff ?? '')
                modifiedContent = applyUnifiedDiff(originalContent, diff)
              } else if (toolName === 'replace_file') {
                const pattern = String(input.pattern ?? '')
                const replacement = String(input.replacement ?? '')
                const regex = parseRegex(pattern)
                if (regex) {
                  modifiedContent = originalContent.replace(regex, replacement)
                }
              }

              set({
                pendingTool: newPendingTool,
                diffForReview: { title, filePath, original: originalContent, modified: modifiedContent },
              })
            } else {
              // 非文件工具（approval、ask_question 等）
              set({ pendingTool: newPendingTool, diffForReview: null })
            }
            break
          }

          case 'tool_complete': {
            const tc = toolCallMap.get(event.toolId)
            // 使用 AgentLoop 传递的 input（已从流式 delta 中正确解析）
            const toolInput = event.input ?? tc?.input ?? {}
            if (tc) {
              // 更新 toolCallMap 中的 input，确保后续引用正确
              tc.input = toolInput
            }
            set((state) => {
              const msgs = state.messages.map((m) => ({ ...m, content: [...m.content] }))
              const lastMsg = msgs[msgs.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.content.push({
                  type: 'tool_use',
                  id: event.toolId,
                  name: event.toolName,
                  input: toolInput,
                })
                // 添加结果告知用户（不截断，完整显示）
                lastMsg.content.push({
                  type: 'text',
                  text: `\n\n[工具 ${event.toolName} 执行完成:\n${event.result}]`,
                })
              }
              return { messages: msgs }
            })

            // Agent 内容写回：如果 write_file 写入的是已打开文件，更新编辑器
            if (
              event.toolName === 'write_file' ||
              event.toolName === 'diff_update_file' ||
              event.toolName === 'replace_file'
            ) {
              const filePath = toolInput.filePath
              if (filePath && typeof filePath === 'string') {
                // 将相对路径转换为绝对路径
                const bookDir = get()._toolContext?.bookDir
                const absolutePath = bookDir ? resolvePath(filePath, bookDir) : filePath
                // 统一为正斜杠进行比较（Windows 反斜杠 vs 正斜杠）
                const normalizedPath = absolutePath.replace(/\\/g, '/')
                const es = useEditorStore.getState()
                const matchingTab = es.tabs.find(
                  (t) => t.filePath.replace(/\\/g, '/') === normalizedPath,
                )
                if (matchingTab) {
                  // 重新读取文件内容，使用 tab 中的原始路径格式
                  try {
                    const fs = get()._fs
                    const newContent = await fs.readFile(matchingTab.filePath)
                    useModelService.getState().updateValue(matchingTab.filePath, newContent)
                  } catch {
                    // 读取失败，忽略
                  }
                }
              }
            }

            // 文件系统操作后刷新资源管理器
            if (
              event.toolName === 'create_entry' ||
              event.toolName === 'delete_entry' ||
              event.toolName === 'rename_entry' ||
              event.toolName === 'write_file'
            ) {
              useBookStore.getState().refreshFileExplorer()
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
              return { messages: msgs, error: event.message, pendingTool: null, diffForReview: null }
            })
            break

          case 'done':
            set({ pendingTool: null, diffForReview: null })
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
      set({ isStreaming: false, _abortController: null, pendingTool: null, diffForReview: null })

      // 实时保存会话到历史记录
      const finalState = get()
      if (finalState.messages.length > 0) {
        // 提取会话标题：跳过 system-reminder 消息，取第一个真正的用户消息
        const firstUserMsg = finalState.messages.find(
          (m) =>
            m.role === 'user' &&
            !m.content.some(
              (b) => b.type === 'text' && (b as { type: 'text'; text: string }).text.includes('<system-reminder>'),
            ),
        )
        const textBlock = firstUserMsg?.content.find((b) => b.type === 'text') as
          | { type: 'text'; text: string }
          | undefined
        const title = textBlock?.text?.slice(0, 50) || '未命名对话'
        const id = finalState.conversationId || `conv-${Date.now()}`
        const now = new Date().toISOString()

        // 确保 conversationId 被设置
        if (!finalState.conversationId) {
          set({ conversationId: id })
        }

        const summary: ConversationSummary = {
          id,
          title,
          createdAt: finalState.conversationHistory.find((h) => h.id === id)?.createdAt || now,
          updatedAt: now,
        }
        set((s) => ({
          conversationHistory: [summary, ...s.conversationHistory.filter((h) => h.id !== id)],
          _conversationCache: { ...s._conversationCache, [id]: [...s.messages] },
        }))

        // 持久化到文件系统
        const conversationStore = finalState._conversationStore
        const bookStore = useBookStore.getState()
        if (conversationStore && bookStore.currentBook) {
          const conversation = {
            id,
            title,
            messages: finalState.messages,
            providerId: finalState.providerConfig.id,
            modelId: finalState.providerConfig.model,
            createdAt: summary.createdAt,
            updatedAt: now,
            version: 1,
          }
          conversationStore.save(bookStore.currentBook.directory, conversation).catch(() => {
            // 保存失败，忽略
          })
        }
      }
    }
  },

  abortStreaming: () => {
    const state = get()
    const controller = state._abortController
    if (controller) {
      state.pendingTool?.resolve(null)
      controller.abort()
      set({ isStreaming: false, _abortController: null, pendingTool: null, diffForReview: null })
    }
  },

  resolvePending: (result: Record<string, unknown> | null) => {
    const state = get()
    if (state.pendingTool) {
      state.pendingTool.resolve(result)
      set({ pendingTool: null, diffForReview: null })
    }
  },

  clearConversation: () => {
    const state = get()
    // 自动保存当前会话到历史
    if (state.messages.length > 0) {
      // 提取会话标题：跳过 system-reminder 消息，取第一个真正的用户消息
      const firstUserMsg = state.messages.find(
        (m) =>
          m.role === 'user' &&
          !m.content.some(
            (b) => b.type === 'text' && (b as { type: 'text'; text: string }).text.includes('<system-reminder>'),
          ),
      )
      const textBlock = firstUserMsg?.content.find((b) => b.type === 'text') as
        | { type: 'text'; text: string }
        | undefined
      const title = textBlock?.text?.slice(0, 50) || '未命名对话'
      const id = state.conversationId || `conv-${Date.now()}`
      const now = new Date().toISOString()
      const summary: ConversationSummary = {
        id,
        title,
        createdAt: now,
        updatedAt: now,
      }
      set((s) => ({
        conversationHistory: [summary, ...s.conversationHistory.filter((h) => h.id !== id)],
        _conversationCache: { ...s._conversationCache, [id]: [...s.messages] },
      }))

      // 持久化到文件系统
      const conversationStore = state._conversationStore
      const bookStore = useBookStore.getState()
      if (conversationStore && bookStore.currentBook) {
        const conversation = {
          id,
          title,
          messages: state.messages,
          providerId: state.providerConfig.id,
          modelId: state.providerConfig.model,
          createdAt: now,
          updatedAt: now,
          version: 1,
        }
        conversationStore.save(bookStore.currentBook.directory, conversation).catch(() => {
          // 保存失败，忽略
        })
      }
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

  loadConversationFromHistory: async (id: string) => {
    const state = get()
    // 先检查内存缓存
    const cached = state._conversationCache[id]
    if (cached) {
      set({ messages: cached, conversationId: id, error: null, currentTurn: 0 })
      return
    }
    // 从文件系统加载
    const conversationStore = state._conversationStore
    const bookStore = useBookStore.getState()
    if (conversationStore && bookStore.currentBook) {
      const conversation = await conversationStore.load(bookStore.currentBook.directory, id)
      if (conversation) {
        set({
          messages: conversation.messages,
          conversationId: id,
          providerConfig: {
            ...state.providerConfig,
            id: conversation.providerId as ProviderConfig['id'],
            model: conversation.modelId,
          },
          error: null,
          currentTurn: 0,
        })
      }
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
    // 从文件系统删除
    const state = get()
    const conversationStore = state._conversationStore
    const bookStore = useBookStore.getState()
    if (conversationStore && bookStore.currentBook) {
      conversationStore.delete(bookStore.currentBook.directory, id).catch(() => {
        // 删除失败，忽略
      })
    }
  },

  loadConversationHistory: async () => {
    const state = get()
    const conversationStore = state._conversationStore
    const bookStore = useBookStore.getState()
    if (conversationStore && bookStore.currentBook) {
      const summaries = await conversationStore.list(bookStore.currentBook.directory)
      set({ conversationHistory: summaries })
    }
  },

  setTempChapterData: (_data) => {
    // 临时章节功能已废弃，保留方法签名兼容 UI 组件
  },
}))
