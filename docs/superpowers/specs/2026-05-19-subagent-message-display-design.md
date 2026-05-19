# SubAgent 消息独立展示设计

## 背景

当前 SubAgent（`agent` 工具）在父 Agent 中执行时，其完整对话过程（thinking、tool calls、text 等）被折叠为一个工具调用块 `🔧 agent`，用户看不到子 Agent 的思考过程和工具调用细节，只看到最终结果文本。

## 目标

SubAgent 的消息展示形式与主 Agent 一致：消息上方显示"SubAgent"名称而非"AI 助手"，其内部的 thinking、tool calls、text 等全部展开可见，且执行过程中实时流式展示。

## 方案：回调注入 + 实时渲染

### 数据流

```
SubAgentTool → AgentLoop.run() → 每个事件调用 onSubAgentEvent 回调
  → agentStore 回调中实时创建/更新 sub_agent 消息
  → ChatRow 检测 source === 'sub_agent'，渲染 "SubAgent" 标签
```

### Step 1: 扩展 ToolContext

文件：`src/domain/types/tool.ts`

```typescript
import type { AgentUIEvent } from './agent'

export interface ToolContext {
  fileService: IFileService
  bookDir: string
  onSubAgentEvent?: (event: AgentUIEvent) => void
}
```

### Step 2: 扩展 AgentMessage

文件：`src/domain/types/agent.ts`

```typescript
export interface AgentMessage {
  role: MessageRole
  content: (UserContentBlock | AssistantContentBlock | ToolResultContentBlock)[]
  source?: 'main' | 'sub_agent'
}
```

### Step 3: 改造 SubAgentTool

文件：`src/infrastructure/tools/SubAgentTool.ts`

遍历 AgentLoop 事件时，将每个事件通过 `context.onSubAgentEvent` 透传给父级：

```typescript
for await (const event of gen) {
  context.onSubAgentEvent?.(event)  // 新增：实时透传

  if (event.type === 'stream_chunk') {
    finalText += event.text
  }
  if (event.type === 'error') {
    return { content: `SubAgent 错误: ${event.message}`, isError: true }
  }
}
```

### Step 4: agentStore 集成 SubAgent 事件

文件：`src/application/stores/agentStore.ts`

在 `sendMessage` 的事件处理循环中，当识别到 `tool_executing` 且 toolName === `'agent'` 时，创建事件处理回调。该回调在 toolContext 上设置 `onSubAgentEvent`，使得 SubAgentTool 执行时能实时将事件推送到父级。

回调处理逻辑：

| 事件 | 处理 |
|------|------|
| `turn_start` | 创建新的 `source: 'sub_agent'` assistant 消息 |
| `thinking_delta` | 追加/更新最后一条 sub_agent 消息的 thinking block |
| `stream_chunk` | 追加/更新最后一条 sub_agent 消息的 text block |
| `tool_executing` | 记录工具调用信息 |
| `tool_complete` | 追加 tool_use 块和结果文本块 |
| `error` | 追加错误文本 |
| `done` | 清理临时状态 |

关键实现细节：
- 回调在 `tool_executing` 事件（toolName === `'agent'`）时创建
- 回调通过 `toolContext.onSubAgentEvent` 传递给 SubAgentTool
- SubAgentTool 执行期间，回调实时更新 store 中的 messages
- agentStore 需要维护一个 `subAgentMsgBuf`（文本/思考缓冲区），与主 Agent 的 `assistantText`/`assistantThinking` 独立
- **tool_complete 特殊处理**：当 `event.toolName === 'agent'` 时，跳过常规的 tool_use + 结果文本块创建（SubAgent 消息已独立展示）。ToolResult 仍正常返回给父 LLM 作为 tool_result 消息，不影响对话逻辑

### Step 5: ChatRow 渲染

文件：`src/presentation/agentPanel/ChatRow.tsx`

```typescript
export function ChatRow({ message, isStreaming }: ChatRowProps) {
  const isUser = message.role === 'user'
  const isSubAgent = message.source === 'sub_agent'

  // ... 用户消息渲染不变 ...

  return (
    <div className={`chat-row assistant${isSubAgent ? ' sub-agent' : ''}`}>
      <div className="chat-label">{isSubAgent ? 'SubAgent' : 'AI 助手'}</div>
      <AssistantBubble content={message.content} isStreaming={isStreaming} />
    </div>
  )
}
```

### Step 6: CSS 样式

文件：`src/presentation/agentPanel/AgentPanel.css`

```css
.chat-row.sub-agent .chat-label {
  color: #c586c0;
}

.chat-row.sub-agent .chat-bubble {
  border-left: 2px solid #c586c0;
}
```

## 不需要修改的文件

- `AgentLoop.ts` — 事件产出逻辑不变
- `ToolExecutor.ts` — 只是透传 context，无需修改
- `AgentMessages.tsx` — ChatRow 自行处理 source 差异

## 持久化考虑

- `source` 字段会随 `AgentMessage` 一起保存到会话持久化数据
- 历史会话中没有 `source` 字段的消息默认视为 `'main'`
- 恢复会话后 SubAgent 消息仍显示 "SubAgent" 标签
