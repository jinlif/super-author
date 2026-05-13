# 超级作者 Phase 3-6 实施计划（路线 B：Tauri + cline 核心）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 cline-main 核心模块，在 Tauri + React 壳上构建完整的 AI 写作 Agent 系统。

**Architecture:** 保持 Tauri v2 壳和 Phase 2 的所有成果（BookStore、ModelService、EditorPanel、四面板布局），从 cline-main 选择性搬运 Provider 抽象层、Agent 循环骨架、MCP 集成、Chat UI 组件。重写系统提示词为网文创作场景，替换代码工具为写作工具（章节读写/角色查询/大纲搜索）。Agent 循环采用 AsyncGenerator 模式，工具系统采用统一 Tool 接口。

**Tech Stack:** Tauri v2, React 19, TypeScript 5, Zustand 5, @anthropic-ai/sdk, openai, @modelcontextprotocol/sdk, Monaco Editor, Vite 6, Vitest 4

**源码参考:** cline-main (`C:\Users\77537\Desktop\cline-main\src/`)

---

## 文件结构

```
src/
├── domain/types/
│   ├── agent.ts              ← NEW: ChatMessage, AgentEvent, ToolCall, IProvider 等
│   ├── tool.ts               ← NEW: Tool<TInput, TOutput> 接口
│   ├── book.ts               (已有)
│   ├── chapter.ts            (已有)
│   ├── file.ts               (已有)
│   ├── layout.ts             (已有)
│   └── model.ts              (已有)
│
├── application/
│   ├── agent/
│   │   ├── AgentLoop.ts      ← NEW: 核心 async generator 循环
│   │   ├── ToolRegistry.ts   ← NEW: 工具注册/查找
│   │   ├── ToolExecutor.ts   ← NEW: 单个工具执行器
│   │   ├── SystemPrompt.ts   ← NEW: 系统提示词构建
│   │   ├── ContextBuilder.ts ← NEW: 写作上下文构建
│   │   └── ConversationStore.ts ← NEW: 对话持久化
│   │
│   ├── services/
│   │   └── ModelService.ts   (已有)
│   │
│   └── stores/
│       ├── bookStore.ts      (已有)
│       ├── editorStore.ts    (已有)
│       ├── layoutStore.ts    (已有)
│       └── agentStore.ts     ← NEW: Agent 会话 UI 状态
│
├── infrastructure/
│   ├── providers/
│   │   ├── IProvider.ts      ← NEW: Provider 接口 (参考 cline core/api/index.ts ApiHandler)
│   │   ├── ClaudeProvider.ts ← NEW: Anthropic SDK 适配 (参考 cline core/api/providers/anthropic.ts)
│   │   ├── OpenAIProvider.ts ← NEW: OpenAI SDK 适配 (参考 cline core/api/providers/openai.ts)
│   │   └── createProvider.ts ← NEW: Provider 工厂
│   │
│   ├── tools/
│   │   ├── ReadChapterTool.ts    ← NEW: 读取章节内容
│   │   ├── WriteChapterTool.ts   ← NEW: 写入章节/临时章节
│   │   ├── SearchChaptersTool.ts ← NEW: 搜索章节
│   │   ├── GetCharactersTool.ts  ← NEW: 获取角色列表
│   │   └── CreateChapterTool.ts  ← NEW: 创建新章节
│   │
│   ├── mcp/                       ← Phase 5 (从 cline services/mcp/ 搬运)
│   │   ├── McpHub.ts
│   │   ├── McpClient.ts
│   │   └── McpConfigStore.ts
│   │
│   ├── skills/                    ← Phase 4
│   │   ├── SkillLoader.ts
│   │   ├── SkillMatcher.ts
│   │   └── builtin/
│   │       ├── continue-writing.md
│   │       ├── polish.md
│   │       ├── generate-outline.md
│   │       └── extract-characters.md
│   │
│   ├── IFileService.ts       (已有)
│   ├── MockFileService.ts    (已有)
│   ├── TauriFileService.ts   (已有)
│   ├── createFileService.ts  (已有)
│   ├── BookRepository.ts     (已有)
│   └── ChapterRepository.ts  (已有)
│
└── presentation/
    ├── agentPanel/
    │   ├── AgentPanel.tsx    ← REWRITE: 完整的对话面板
    │   ├── AgentMessages.tsx ← NEW: 消息列表（流式渲染）
    │   ├── AgentInput.tsx    ← NEW: 输入框 + 发送按钮 + 快捷操作
    │   └── ChatRow.tsx       ← NEW: 单条消息（参考 cline webview ChatRow）
    ├── editor/
    │   ├── EditorPanel.tsx   (MODIFY: 接收 Agent 写入内容)
    │   └── ...
    ├── sidebar/              (已有)
    ├── layout/               (已有)
    └── bookSelector/         (已有)
```

---

## Phase 3: Agent 核心 + 多 Provider

> **参考源码:**
> - Provider: `cline-main/src/core/api/index.ts` (ApiHandler 接口), `core/api/providers/anthropic.ts`, `core/api/providers/openai.ts`, `core/api/transform/stream.ts` (ApiStream)
> - Agent Loop: `cline-main/src/core/task/index.ts` (Task 类), `core/task/ToolExecutor.ts` (工具执行)
> - Message Types: `cline-main/src/shared/messages/`, `core/assistant-message/`
> - Chat UI: `cline-main/webview-ui/src/components/chat/ChatRow.tsx`, `ChatView.tsx`

### 3.1 Agent 类型定义

**Files:**
- Create: `src/domain/types/agent.ts`
- Create: `src/domain/types/tool.ts`

**接口定义：**

```typescript
// src/domain/types/agent.ts

// 统一消息格式（不依赖任何 SDK 类型）
type AgentRole = 'user' | 'assistant' | 'system'

type AgentMessage =
  | { role: 'user'; content: UserContentBlock[] }
  | { role: 'assistant'; content: AssistantContentBlock[]; model?: string }
  | { role: 'system'; content: string }

type UserContentBlock =
  | { type: 'text'; text: string }
  | { type: 'chapter_ref'; chapterId: string }

type AssistantContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'thinking'; text: string }

type ToolResultBlock = {
  toolUseId: string
  content: string
  isError?: boolean
}

// Provider 流式事件（合并两个 SDK 的输出为统一格式）
type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; arguments: string }
  | { type: 'tool_call_end'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'thinking_delta'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'error'; message: string }

// Agent 循环对外暴露的事件
type AgentUIEvent =
  | { type: 'stream_chunk'; chunk: AgentStreamEvent }
  | { type: 'tool_executing'; toolId: string; toolName: string }
  | { type: 'tool_complete'; toolId: string; result: ToolResultBlock }
  | { type: 'turn_start'; turn: number }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'aborted' }

// Provider 配置
type ProviderConfig = {
  id: string       // 'claude' | 'openai'
  name: string
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
}
```

```typescript
// src/domain/types/tool.ts

interface ToolDef {
  name: string
  description: string                          // 给 AI 看的工具描述
  inputSchema: Record<string, unknown>         // JSON Schema
  isReadOnly: boolean                          // 读操作可并发
  handler(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}

interface ToolResult {
  content: string
  isError?: boolean
  structuredContent?: Record<string, unknown>  // MCP 结构化输出预留
}

interface ToolContext {
  bookId: string
  bookDir: string
  currentChapterPath: string | null
  chapters: Chapter[]
}
```

### 3.2 Provider 接口 + Claude 适配

**Files:**
- Create: `src/infrastructure/providers/IProvider.ts`
- Create: `src/infrastructure/providers/ClaudeProvider.ts`
- Create: `src/infrastructure/providers/createProvider.ts`
- Create: `tests/infrastructure/ClaudeProvider.test.ts`

**IProvider 接口：**

参考 cline `core/api/index.ts:53-58` — `ApiHandler` 接口，简化为：

```typescript
// src/infrastructure/providers/IProvider.ts
import type { AgentMessage, AgentStreamEvent, ProviderConfig } from '../../domain/types/agent'

interface IProvider {
  readonly id: string
  readonly model: string

  // 核心方法：发送消息，返回异步可迭代流
  createMessage(
    systemPrompt: string,
    messages: AgentMessage[],
    tools: ToolDef[],
    signal: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent>

  // 获取 token 用量（可选）
  getUsage?(): Promise<{ inputTokens: number; outputTokens: number } | null>

  // 中断当前请求
  abort?(): void
}
```

**ClaudeProvider 关键实现：**

参考 cline `core/api/providers/anthropic.ts` — 使用 `@anthropic-ai/sdk`。

核心逻辑：
- `messages.create()` 发起 streaming 请求
- 将 Anthropic 的 `content_block_start/delta/stop` 事件映射为 `AgentStreamEvent`
- `text_delta` → text content block delta
- `tool_use` block (start → tool_call_start, delta → tool_call_delta, stop → tool_call_end)
- `thinking` block → thinking_delta
- `message_stop` → usage event

```typescript
// createProvider.ts — 环境检测自动切换
function createProvider(config: ProviderConfig): IProvider {
  switch (config.id) {
    case 'claude':
      return new ClaudeProvider(config)
    case 'openai':
      return new OpenAIProvider(config)
    default:
      throw new Error(`Unknown provider: ${config.id}`)
  }
}
```

### 3.3 OpenAI Provider

**Files:**
- Create: `src/infrastructure/providers/OpenAIProvider.ts`
- Create: `tests/infrastructure/OpenAIProvider.test.ts`

**关键差异处理：**

| 特性 | Claude | OpenAI |
|------|--------|--------|
| SDK | `@anthropic-ai/sdk` | `openai` |
| API 方法 | `messages.create({stream: true})` | `chat.completions.create({stream: true})` |
| 消息格式 | `{role, content: ContentBlock[]}` | `{role, content: string}` |
| Tool use | Content block type `tool_use` | `finish_reason: 'tool_calls'` + `delta.tool_calls[]` |
| Tool input | JSON 对象 | JSON 字符串 |
| Thinking | `thinking` content block | 不支持（忽略） |

OpenAI 适配器负责：
- 将 AgentMessage 转换为 OpenAI messages 格式
- 将工具调用 JSON 字符串解析为对象
- 映射 streaming delta 事件为 AgentStreamEvent

### 3.4 写作工具

**Files:**
- Create: `src/infrastructure/tools/ReadChapterTool.ts`
- Create: `src/infrastructure/tools/WriteChapterTool.ts`
- Create: `src/infrastructure/tools/SearchChaptersTool.ts`
- Create: `src/infrastructure/tools/GetCharactersTool.ts`
- Create: `src/infrastructure/tools/CreateChapterTool.ts`
- Create: `tests/infrastructure/tools.test.ts`

**工具设计原则：**
- 每个工具封装已有 `BookStore`/`ChapterRepository` 的功能
- 输入输出完全独立，不依赖 UI 状态
- `WriteChapter` 支持写入"临时章节"（用户审阅后确认）

```typescript
// ReadChapterTool.ts — 示例
const readChapterTool: ToolDef = {
  name: 'read_chapter',
  description: '读取指定章节的完整 Markdown 内容。用于了解已有剧情、角色对话、场景描写。',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: '章节文件路径' },
    },
    required: ['filePath'],
  },
  isReadOnly: true,
  async handler(params, context) {
    const { filePath } = params
    const fs = createFileService()
    const chapterRepo = new ChapterRepository(fs)
    const content = await chapterRepo.readChapter(filePath)
    return { content }
  },
}

// WriteChapterTool.ts — 支持临时章节
const writeChapterTool: ToolDef = {
  name: 'write_chapter',
  description: `写入章节内容。支持两种模式：
- 写入已有章节：提供 filePath
- 创建临时章节：提供 title 和 content，不提供 filePath
临时章节不会出现在章节目录中，需要用户审阅后确认。`,
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: '已有章节的路径（如果不提供则创建临时章节）' },
      title: { type: 'string', description: '临时章节标题' },
      content: { type: 'string', description: '要写入的内容' },
    },
    required: ['content'],
  },
  isReadOnly: false,
  async handler(params, context) {
    // 临时章节 → 输出到暂存区；已有章节 → 直接写入
    // 返回状态告知 UI 层如何展示
  },
}
```

**写作工具清单：**

| 工具名 | 功能 | ReadOnly |
|--------|------|----------|
| `read_chapter` | 读取章节 Markdown 内容 | ✅ |
| `write_chapter` | 写入章节/临时章节 | ✗ |
| `search_chapters` | 全文搜索所有章节 | ✅ |
| `get_characters` | 获取当前书籍角色列表 | ✅ |
| `create_chapter` | 创建新章（空模板） | ✗ |
| `read_outline` | 读取大纲文件 | ✅ |

### 3.5 ToolRegistry

**Files:**
- Create: `src/application/agent/ToolRegistry.ts`
- Create: `tests/application/ToolRegistry.test.ts`

参考 cline `shared/tools.ts` 工具注册模式：

```typescript
// ToolRegistry.ts
class ToolRegistry {
  private tools: Map<string, ToolDef> = new Map()

  register(tool: ToolDef): void
  unregister(name: string): void
  get(name: string): ToolDef | undefined
  list(): ToolDef[]                     // 所有已注册工具
  listForAPI(): Record<string, unknown>[]  // 转为 API 兼容格式
  getReadOnlyTools(): ToolDef[]         // 可并发执行的工具
}
```

注册时机：
- 应用启动 → 注册内置工具
- MCP 连接成功 → 注册 MCP 工具（Phase 5）
- Skill 触发 → 临时注入 skill 专用工具（Phase 4）

### 3.6 SystemPrompt 构建

**Files:**
- Create: `src/application/agent/SystemPrompt.ts`
- Create: `tests/application/SystemPrompt.test.ts`

**写作专用系统提示词结构：**

```
系统提示词 (SystemPrompt.build)
├── 角色定义
│   └── "你是一位专业的网文写作助手，擅长..."
├── 写作能力说明
│   ├── 续写/润色/大纲/角色提取
│   ├── 风格适配（轻松/严肃/热血/虐恋...）
│   └── 字数控制（200字/500字/1000字...）
├── 工具使用指南
│   ├── read_chapter — 读取已有章节
│   ├── write_chapter — 写入章节（临时章节会展示给用户审阅）
│   ├── search_chapters — 搜索关键词
│   └── get_characters — 获取角色列表
├── 写作规范
│   ├── 保持角色人设一致
│   ├── 遵循已有大纲
│   ├── 维持既定写作风格
│   └── 避免剧情矛盾
├── 输出格式指南
│   └── 续写直接输出正文，润色输出对比，大纲输出结构
└── 当前写作上下文 (ContextBuilder 注入)
    ├── 当前章节内容
    ├── 相关角色卡
    └── 大纲节点
```

### 3.7 ContextBuilder

**Files:**
- Create: `src/application/agent/ContextBuilder.ts`
- Create: `tests/application/ContextBuilder.test.ts`

```typescript
class ContextBuilder {
  constructor(
    private bookStore: typeof useBookStore,
    private modelService: typeof useModelService,
  ) {}

  async build(): Promise<WritingContext> {
    return {
      currentChapter: await this.getCurrentChapterContext(),
      adjacentChapters: await this.getAdjacentChapterSummaries(),
      relevantCharacters: this.getCharacters(),
      activeOutline: this.getActiveOutlineNode(),
      editorSelection: this.getEditorSelection(),
    }
  }

  // 智能上下文窗口管理
  fitToBudget(context: WritingContext, maxTokens: number): WritingContext {
    // 优先保留：当前章节 > 角色卡 > 大纲 > 相邻章节
  }
}
```

### 3.8 AgentLoop 核心循环

**Files:**
- Create: `src/application/agent/AgentLoop.ts`
- Create: `tests/application/AgentLoop.test.ts`

参考 cline `core/task/index.ts:1453-1480` — `initiateTaskLoop()` 和 `core/task/index.ts:2858` — main streaming loop。

**核心结构：**

```typescript
async function* agentLoop(options: {
  provider: IProvider,
  messages: AgentMessage[],
  tools: ToolRegistry,
  context: WritingContext,
  systemPrompt: string,
  maxTurns: number,
  signal: AbortSignal,
}): AsyncGenerator<AgentUIEvent> {

  let messages = [...options.messages]
  let turnCount = 0

  while (turnCount < options.maxTurns) {
    if (options.signal.aborted) {
      yield { type: 'aborted' }
      return
    }

    yield { type: 'turn_start', turn: turnCount + 1 }

    // 1. API 调用 — 流式输出
    const assistantContent: AssistantContentBlock[] = []
    const toolCalls: ToolCall[] = []

    for await (const chunk of options.provider.createMessage(
      options.systemPrompt, messages, options.tools.listForAPI(), options.signal
    )) {
      yield { type: 'stream_chunk', chunk }

      // 累积 assistant 消息
      switch (chunk.type) {
        case 'text_delta':
          appendText(assistantContent, chunk.text)
          break
        case 'tool_call_end':
          toolCalls.push({ id: chunk.id, name: chunk.name, input: chunk.input })
          appendToolUse(assistantContent, chunk)
          break
        case 'thinking_delta':
          appendThinking(assistantContent, chunk.text)
          break
      }
    }

    // 2. 没有工具调用 → 结束循环
    if (toolCalls.length === 0) {
      messages.push({ role: 'assistant', content: assistantContent })
      yield { type: 'done' }
      return
    }

    // 3. 执行工具
    messages.push({ role: 'assistant', content: assistantContent })

    for (const toolCall of toolCalls) {
      yield { type: 'tool_executing', toolId: toolCall.id, toolName: toolCall.name }

      const tool = options.tools.get(toolCall.name)
      const result = tool
        ? await tool.handler(toolCall.input, buildToolContext(options.context))
        : { content: `未知工具: ${toolCall.name}`, isError: true }

      yield { type: 'tool_complete', toolId: toolCall.id, result }

      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: toolCall.id, content: result.content, isError: result.isError }],
      })
    }

    turnCount++
  }

  yield { type: 'done' }
}
```

**与 cline 的关键简化：**
- 移除权限确认（写作场景无需审批）
- 移除 hook 系统
- 移除 compact 机制（Phase 6 再加）
- 移除 focus chain 系统
- 不实现 StreamingToolExecutor（写作工具毫秒级完成）

### 3.9 ToolExecutor

**Files:**
- Create: `src/application/agent/ToolExecutor.ts`

参考 cline `core/task/ToolExecutor.ts:43-100`。单个工具执行封装：

```typescript
class ToolExecutor {
  constructor(private registry: ToolRegistry, private context: ToolContext) {}

  async execute(
    toolName: string,
    toolId: string,
    input: Record<string, unknown>,
  ): Promise<{ toolId: string; result: ToolResult }>
}
```

读操作可并发执行（`Promise.all`），写操作串行执行。

### 3.10 Agent Store

**Files:**
- Create: `src/application/stores/agentStore.ts`
- Create: `tests/stores/agentStore.test.ts`

```typescript
interface AgentStore {
  // 会话状态
  conversationId: string | null
  messages: AgentMessage[]
  isStreaming: boolean
  currentTurn: number
  error: string | null

  // Provider 配置
  providerConfig: ProviderConfig

  // 操作
  sendMessage: (text: string) => Promise<void>
  abortStreaming: () => void
  clearConversation: () => void
  setProviderConfig: (config: ProviderConfig) => void
  loadConversation: (id: string) => Promise<void>
}
```

`sendMessage` 调用链：
```
AgentInput → agentStore.sendMessage(text)
  → ContextBuilder.build() → 获取写作上下文
  → SystemPrompt.build(context) → 构建系统提示词
  → agentLoop(provider, messages, tools, context, systemPrompt, maxTurns, signal)
  → for await (event of loop) → 更新 store → React 渲染
```

### 3.11 Agent UI（Chat Panel）

**Files:**
- Rewrite: `src/presentation/agentPanel/AgentPanel.tsx`
- Create: `src/presentation/agentPanel/AgentMessages.tsx`
- Create: `src/presentation/agentPanel/AgentInput.tsx`
- Create: `src/presentation/agentPanel/ChatRow.tsx`
- Create: `src/presentation/agentPanel/AgentPanel.css` (update)

参考 cline webview:
- `webview-ui/src/components/chat/ChatView.tsx` — 聊天视图布局
- `webview-ui/src/components/chat/ChatRow.tsx` — 单条消息渲染（text/thinking/tool/error）
- `webview-ui/src/components/chat/ChatTextArea.tsx` — 输入框
- `webview-ui/src/components/chat/chat-view/components/MessagesArea.tsx` — 消息列表

**AgentPanel 结构：**
```
AgentPanel
├── AgentHeader (标题 + 关闭按钮 + Provider 标签)
├── AgentMessages
│   ├── ChatRow (type: 'user')         → 用户消息气泡
│   ├── ChatRow (type: 'assistant')    → 助手回复
│   │   ├── ThinkingRow (可折叠)       → 思考过程
│   │   ├── MarkdownRow               → 正文（markdown 渲染）
│   │   ├── ToolCallRow               → 工具调用展示
│   │   └── ErrorRow                  → 错误提示
│   └── StreamingIndicator            → 流式输出中的闪烁光标
└── AgentInput
    ├── TextArea (自动增高)
    ├── SendButton
    └── StatusBar (当前 model / token 用量)
```

**ChatRow 消息类型处理（参考 cline webview `ChatRow.tsx:72-79`）：**

| 消息内容 | 渲染组件 | 说明 |
|---------|---------|------|
| `text` | `MarkdownRow` | 渲染 markdown，支持代码块 |
| `thinking` | `ThinkingRow` | 默认折叠，灰色文字 |
| `tool_use` | `ToolCallRow` | 工具名 + 参数摘要 |
| `tool_result` | 附属在 tool_use 下方 | 结果摘要/错误信息 |

### 3.12 Agent 内容写入编辑器

**Files:**
- Modify: `src/presentation/editor/EditorPanel.tsx`

当 Agent 调用 `write_chapter` 工具时：
- **已有章节** → `ModelService.updateValue()` + `BookStore.saveChapter()` → 编辑器立即更新
- **临时章节** → 在编辑器中以只读模式打开（带审阅标记），用户确认后转为正式章节

```
write_chapter(filePath=null, content="...")
  → Agent 返回临时章节信息
  → ModelService 创建临时 model
  → EditorPanel 打开只读标签 (title: "AI 生成 - 待审阅")
  → AgentInput 显示 "确认此内容？  [保存] [放弃] [修改]"
  → 用户操作 → 正式写入 / 丢弃 / 复制到输入框继续对话
```

### 3.13 对话历史持久化

**Files:**
- Create: `src/application/agent/ConversationStore.ts`
- Create: `tests/application/ConversationStore.test.ts`

参考 cline `core/storage/disk.ts` 和 claude-code-main `history.ts`。

```
存储位置：{书籍目录}/.super-author/conversations/{conversationId}.json

文件格式：
{
  "id": "uuid",
  "title": "用户首条消息截取",
  "messages": AgentMessage[],
  "providerId": "claude",
  "modelId": "claude-sonnet-4-6",
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

```typescript
class ConversationStore {
  constructor(private fs: IFileService) {}

  async save(conversation: Conversation): Promise<void>
  async load(id: string): Promise<Conversation>
  async list(bookDir: string): Promise<ConversationSummary[]>
  async delete(id: string): Promise<void>
}
```

### 3.14 Provider 切换

**Files:**
- Modify: `src/application/stores/agentStore.ts`

Provider 配置持久化到本地 JSON 文件：
```
存储位置：~/.super-author/config.json → provider: { id, apiKey, model, baseUrl }
```

API Key 安全存储：
- 开发环境：`localStorage`（WebView 沙箱隔离）
- 生产环境：Tauri 的 `store` plugin 或系统 keychain（后续 Phase 6.5）

### 3.15 Phase 3 测试清单

**Files:**
- Create: `tests/application/AgentLoop.test.ts`
- Create: `tests/application/ToolRegistry.test.ts`
- Create: `tests/application/SystemPrompt.test.ts`
- Create: `tests/infrastructure/ClaudeProvider.test.ts`
- Create: `tests/infrastructure/OpenAIProvider.test.ts`
- Create: `tests/infrastructure/tools.test.ts`
- Create: `tests/stores/agentStore.test.ts`
- Create: `tests/presentation/AgentPanel.test.tsx`

---

## Phase 4: Skill 系统

> **背景：** Skill 系统依赖 Phase 3 的 ToolRegistry 和 AgentLoop。Skill 本质上是一组提示词 + 工具权限声明，在执行时注入到系统提示词中。

### 4.1 Skill 类型定义

**Files:**
- Create: `src/domain/types/skill.ts`

```typescript
interface SkillDefinition {
  name: string              // '续写'
  description: string       // '智能续写下一段...'
  whenToUse: string         // '用户要求续写、继续写...'
  allowedTools: string[]    // ['read_chapter', 'write_chapter', ...]
  argumentHint?: string     // '<风格> <字数>'
  model?: string            // 指定模型
  prompt: string            // 提示词正文 (markdown)
  priority: 'builtin' | 'user' | 'book'
}
```

### 4.2 SkillLoader

**Files:**
- Create: `src/infrastructure/skills/SkillLoader.ts`
- Create: `src/infrastructure/skills/SkillMatcher.ts`

参考 cline `skills/loadSkillsDir.ts` — 从目录加载 markdown + frontmatter。

```typescript
class SkillLoader {
  loadBuiltin(): SkillDefinition[]        // 从 src/infrastructure/skills/builtin/
  loadUser(): Promise<SkillDefinition[]>   // ~/.super-author/skills/
  loadBook(bookDir: string): Promise<SkillDefinition[]>  // {bookDir}/.super-author/skills/
  loadAll(bookDir: string): Promise<SkillDefinition[]>   // 按优先级合并去重
}

class SkillMatcher {
  match(userInput: string, skills: SkillDefinition[]): SkillDefinition | null
  // 语义匹配：用户输入 vs skill 的 whenToUse 描述
}
```

### 4.3 内置 Skill

**Files:**
- Create: `src/infrastructure/skills/builtin/continue-writing.md`
- Create: `src/infrastructure/skills/builtin/polish.md`
- Create: `src/infrastructure/skills/builtin/generate-outline.md`
- Create: `src/infrastructure/skills/builtin/extract-characters.md`

以 markdown frontmatter + 正文格式定义，参考设计文档 3.1 节格式。

### 4.4 Skill Manager UI

**Files:**
- Create: `src/presentation/components/SkillManager.tsx`
- Create: `src/presentation/components/SkillEditor.tsx`

功能：
- 查看已加载的全部 skill（内置/用户/书籍级）
- 编辑用户级 skill
- 添加新 skill
- 启用/禁用 skill
- 实时预览 skill 的 prompt

### 4.5 Phase 4 测试

**Files:**
- Create: `tests/infrastructure/SkillLoader.test.ts`
- Create: `tests/infrastructure/SkillMatcher.test.ts`

---

## Phase 5: MCP 集成

> **背景：** 从 cline 直接搬运 MCP 实现模块。MCP 工具自动注册到 ToolRegistry，命名格式 `mcp__<server>__<tool>`。

### 5.1 MCP Client（从 cline 搬运）

**搬运源：** `cline-main/src/services/mcp/`

**搬运文件：**
- `McpHub.ts` → `src/infrastructure/mcp/McpHub.ts` （核心）
- `client.ts` → `src/infrastructure/mcp/McpClient.ts`
- `types.ts` → `src/infrastructure/mcp/McpTypes.ts`
- `normalization.ts` → `src/infrastructure/mcp/normalization.ts`

修改点：
- 移除 cline 特定的 `Controller` 依赖
- 替换 `StateManager` 为本地 JSON 文件存储
- MCP server 配置持久化到 `~/.super-author/mcp_servers.json`

### 5.2 MCP 工具注册

```
McpHub.connect(serverConfig)
  → discoverTools()
  → ToolRegistry.register(mcpTool)  // name: mcp__websearch__search
  → agentStore.notify('tools_changed')
```

### 5.3 MCP 配置 UI

**Files:**
- Create: `src/presentation/components/McpConfig.tsx`

功能：添加/删除/启用/禁用 MCP server，查看连接状态。

---

## Phase 6: 高级功能 & 打磨

### 6.1 划词备注系统

**Files:**
- Create: `src/presentation/editor/AnnotationOverlay.tsx`
- Create: `src/domain/types/annotation.ts`
- Modify: `src/presentation/editor/EditorPanel.tsx`

功能：在 Monaco Editor 中划选文本 → 弹出气泡 → 添加备注/调用 skill。

### 6.2 角色管理 & 可视化

**Files:**
- Create: `src/presentation/characters/CharacterList.tsx`
- Create: `src/presentation/characters/CharacterCard.tsx`
- Create: `src/presentation/characters/RelationGraph.tsx`
- Create: `src/infrastructure/CharacterRepository.ts`
- Create: `src/domain/types/character.ts`

### 6.3 写作目标追踪

**Files:**
- Create: `src/presentation/components/WritingGoals.tsx`
- Create: `src/domain/types/goal.ts`
- Modify: `src/presentation/editor/EditorStatusBar.tsx`

### 6.4 章节修订历史

**Files:**
- Create: `src/presentation/editor/RevisionHistory.tsx`
- Create: `src/infrastructure/RevisionRepository.ts`

自动保存章节快照到 `.super-author/history/`。

### 6.5 应用设置页面

**Files:**
- Create: `src/presentation/settings/SettingsPanel.tsx`
- Create: `src/application/stores/settingsStore.ts`

功能：API Key 配置、主题切换、快捷键、自动保存间隔等。

### 6.6 性能优化

- 大章节虚拟滚动
- Monaco Editor lazy loading
- 对话历史分页加载

### 6.7 最终集成测试 + E2E

**Files:**
- Create: `tests/e2e/writing-workflow.test.ts`

---

## 实施顺序

```
Phase 3a: 基础设施 (3.1 + 3.2 + 3.3)
  │  类型定义 → Provider 接口 → Claude Provider → OpenAI Provider
  │  依赖：无
  │  产出：可独立测试的 Provider 层
  │
Phase 3b: 工具系统 (3.4 + 3.5)
  │  写作工具 → ToolRegistry
  │  依赖：无（工具直接调用已有 ChapterRepository）
  │  产出：可独立测试的工具集
  │
Phase 3c: Agent 核心 (3.6 + 3.7 + 3.8 + 3.9)
  │  SystemPrompt → ContextBuilder → AgentLoop → ToolExecutor
  │  依赖：3a (Provider) + 3b (Tools)
  │  产出：完整的 Agent 循环，可无 UI 测试
  │
Phase 3d: UI + 持久化 (3.10 + 3.11 + 3.12 + 3.13 + 3.14)
     AgentStore → Chat UI → Editor 集成 → ConversationStore → Provider 切换
     依赖：3c (Agent 循环)
     产出：完整的用户可用的 Agent 功能

Phase 4: Skill 系统
     依赖：Phase 3 完整

Phase 5: MCP 集成
     依赖：Phase 3 完整（ToolRegistry）

Phase 6: 高级功能
     依赖：Phase 3 完整
     （6.1-6.7 之间基本独立，可并行）
```

---

## 关键风险

| 风险 | 缓解措施 |
|------|---------|
| cline 模块解耦困难 | 只搬核心逻辑，不搬 VSCode 集成层；用我们的接口重新包装 |
| Anthropic/OpenAI SDK 版本差异 | 统一 `AgentStreamEvent` 抹平差异，每个 provider 独立测试 |
| 上下文窗口超限 | ContextBuilder 内置 token 预算管理 + 智能截断策略 |
| API Key 安全 | Tauri store plugin / 系统 keychain；不在日志中暴露 |
