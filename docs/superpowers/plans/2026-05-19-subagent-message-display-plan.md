# SubAgent 消息独立展示 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SubAgent 的消息（thinking、tool calls、text）在父 Agent 面板中实时独立展示，标签显示"SubAgent"而非"AI 助手"。

**Architecture:** 通过扩展 ToolContext 注入 `onSubAgentEvent` 回调，SubAgentTool 执行时将 AgentLoop 事件实时透传给父级 agentStore，agentStore 为 SubAgent 创建独立的 assistant 消息（标记 `source: 'sub_agent'`），ChatRow 根据 source 字段渲染不同标签。

**Tech Stack:** TypeScript, React, Zustand, Vitest

**设计文档:** `docs/superpowers/specs/2026-05-19-subagent-message-display-design.md`

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/domain/types/tool.ts` | 修改 | ToolContext 新增 `onSubAgentEvent` |
| `src/domain/types/agent.ts` | 修改 | AgentMessage 新增 `source` |
| `src/infrastructure/tools/SubAgentTool.ts` | 修改 | 事件透传回调 |
| `src/application/stores/agentStore.ts` | 修改 | SubAgent 事件实时处理 |
| `src/presentation/agentPanel/ChatRow.tsx` | 修改 | SubAgent 标签渲染 |
| `src/presentation/agentPanel/AgentPanel.css` | 修改 | SubAgent 样式 |
| `tests/application/SubAgentTool.test.ts` | 新建 | SubAgentTool 事件透传测试 |
| `tests/stores/agentStore.test.ts` | 修改 | SubAgent 事件处理测试 |
| `tests/presentation/ChatRow.test.tsx` | 新建 | ChatRow SubAgent 渲染测试 |

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `src/domain/types/tool.ts`
- Modify: `src/domain/types/agent.ts`

- [ ] **Step 1: 修改 ToolContext，新增 onSubAgentEvent**

```typescript
// src/domain/types/tool.ts
import type { IFileService } from '../../infrastructure/IFileService'
import type { AgentUIEvent } from './agent'

export interface ToolContext {
  fileService: IFileService
  bookDir: string
  onSubAgentEvent?: (event: AgentUIEvent) => void
}

// ... 其余不变
```

具体改动：在 `ToolContext` 接口中新增一行 `onSubAgentEvent?: (event: AgentUIEvent) => void`，并在文件顶部添加 `AgentUIEvent` 的 import。

- [ ] **Step 2: 修改 AgentMessage，新增 source 字段**

```typescript
// src/domain/types/agent.ts — AgentMessage 接口
export interface AgentMessage {
  role: MessageRole
  content: (UserContentBlock | AssistantContentBlock | ToolResultContentBlock)[]
  source?: 'main' | 'sub_agent'
}
```

具体改动：在 `AgentMessage` 接口中新增 `source?: 'main' | 'sub_agent'` 字段。

- [ ] **Step 3: 验证类型编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 运行现有测试确保无破坏**

Run: `npm test`
Expected: 所有现有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/domain/types/tool.ts src/domain/types/agent.ts
git commit -m "feat: 扩展 ToolContext 和 AgentMessage 类型，支持 SubAgent 事件回调和消息来源标识"
```

---

### Task 2: SubAgentTool 事件透传

**Files:**
- Modify: `src/infrastructure/tools/SubAgentTool.ts`
- Create: `tests/application/SubAgentTool.test.ts`

- [ ] **Step 1: 编写 SubAgentTool 事件透传测试**

```typescript
// tests/application/SubAgentTool.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createSubAgentTool } from '../../src/infrastructure/tools/SubAgentTool'
import { ToolRegistry } from '../../src/application/agent/ToolRegistry'
import type { AgentStreamEvent, AgentUIEvent } from '../../src/domain/types/agent'
import type { IProvider } from '../../src/infrastructure/providers/IProvider'
import { MockFileService } from '../../src/infrastructure/MockFileService'

function createMockProvider(events: AgentStreamEvent[]): IProvider {
  return {
    id: 'mock',
    model: 'mock-model',
    async *createMessage() {
      for (const e of events) yield e
    },
  }
}

describe('SubAgentTool 事件透传', () => {
  it('应将 AgentLoop 事件通过 onSubAgentEvent 透传给父级', async () => {
    const provider = createMockProvider([
      { type: 'text_delta', text: '子Agent回复' },
    ])

    const registry = new ToolRegistry()
    const tool = createSubAgentTool({
      getProviderConfig: () => ({
        id: 'mock',
        name: 'Mock',
        apiKey: 'sk-test',
        model: 'mock-model',
        models: ['mock-model'],
      }),
      getRegistry: () => registry,
    })

    // Mock createProvider 返回我们控制的 provider
    vi.mock('../../src/infrastructure/providers/createProvider', () => ({
      createProvider: () => provider,
    }))

    const collectedEvents: AgentUIEvent[] = []
    const context = {
      fileService: new MockFileService(),
      bookDir: '/book',
      onSubAgentEvent: (event: AgentUIEvent) => collectedEvents.push(event),
    }

    const result = await tool.handler({ prompt: '测试任务' }, context)

    expect(result.isError).toBeFalsy()
    expect(collectedEvents.some((e) => e.type === 'turn_start')).toBe(true)
    expect(collectedEvents.some((e) => e.type === 'stream_chunk')).toBe(true)
    expect(collectedEvents.some((e) => e.type === 'done')).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/application/SubAgentTool.test.ts`
Expected: 测试失败（当前 SubAgentTool 不调用 onSubAgentEvent）

- [ ] **Step 3: 修改 SubAgentTool，透传事件**

在 `src/infrastructure/tools/SubAgentTool.ts` 的 `for await` 循环中，添加 `context.onSubAgentEvent?.(event)` 调用：

```typescript
// SubAgentTool.ts handler 中的 for await 循环
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

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/application/SubAgentTool.test.ts`
Expected: 测试通过

- [ ] **Step 5: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 6: 提交**

```bash
git add src/infrastructure/tools/SubAgentTool.ts tests/application/SubAgentTool.test.ts
git commit -m "feat: SubAgentTool 事件透传，通过 onSubAgentEvent 回调实时传递 AgentLoop 事件"
```

---

### Task 3: agentStore 集成 SubAgent 事件处理

**Files:**
- Modify: `src/application/stores/agentStore.ts`
- Modify: `tests/stores/agentStore.test.ts`

- [ ] **Step 1: 编写 SubAgent 事件处理测试**

在 `tests/stores/agentStore.test.ts` 中添加测试：

```typescript
it('SubAgent 事件应创建独立消息', () => {
  const store = useAgentStore.getState()
  // 模拟 SubAgent 的 turn_start 事件
  store.handleSubAgentEvent({ type: 'turn_start', turn: 1 })
  const msgs = useAgentStore.getState().messages
  expect(msgs).toHaveLength(1)
  expect(msgs[0].role).toBe('assistant')
  expect(msgs[0].source).toBe('sub_agent')

  // 模拟 stream_chunk
  store.handleSubAgentEvent({ type: 'stream_chunk', text: '子Agent文本' })
  const msgs2 = useAgentStore.getState().messages
  const lastContent = msgs2[msgs2.length - 1].content
  expect(lastContent.some((b) => b.type === 'text' && b.text === '子Agent文本')).toBe(true)
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/stores/agentStore.test.ts`
Expected: 测试失败（handleSubAgentEvent 不存在）

- [ ] **Step 3: 在 agentStore 中实现 SubAgent 事件处理**

在 `agentStore.ts` 中添加 `handleSubAgentEvent` 方法，并在 `sendMessage` 的 `tool_executing` 事件中创建回调注入到 toolContext。

核心逻辑：

```typescript
// agentStore state 中新增
_subAgentBuf: { text: string; thinking: string; toolCallMap: Map<string, { name: string; input: Record<string, unknown> }> }

// 新增方法
handleSubAgentEvent: (event: AgentUIEvent) => {
  const state = get()
  switch (event.type) {
    case 'turn_start':
      // 创建新的 sub_agent assistant 消息
      set({ messages: [...state.messages, { role: 'assistant', source: 'sub_agent', content: [] }] })
      // 重置缓冲区
      set({ _subAgentBuf: { text: '', thinking: '', toolCallMap: new Map() } })
      break

    case 'thinking_delta': {
      const buf = state._subAgentBuf
      buf.thinking += event.text
      set((s) => {
        const msgs = s.messages.map((m) => ({ ...m, content: [...m.content] }))
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg?.source === 'sub_agent') {
          const thinkIdx = lastMsg.content.findIndex((b) => b.type === 'thinking')
          if (thinkIdx >= 0) {
            lastMsg.content[thinkIdx] = { type: 'thinking', text: buf.thinking }
          } else {
            lastMsg.content.unshift({ type: 'thinking', text: buf.thinking })
          }
        }
        return { messages: msgs }
      })
      break
    }

    case 'stream_chunk': {
      const buf = state._subAgentBuf
      buf.text += event.text
      set((s) => {
        const msgs = s.messages.map((m) => ({ ...m, content: [...m.content] }))
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg?.source === 'sub_agent') {
          const textIdx = lastMsg.content.findIndex((b) => b.type === 'text')
          if (textIdx >= 0) {
            lastMsg.content[textIdx] = { type: 'text', text: buf.text }
          } else {
            lastMsg.content.push({ type: 'text', text: buf.text })
          }
        }
        return { messages: msgs }
      })
      break
    }

    case 'tool_executing': {
      state._subAgentBuf.toolCallMap.set(event.toolId, { name: event.toolName, input: {} })
      break
    }

    case 'tool_complete': {
      set((s) => {
        const msgs = s.messages.map((m) => ({ ...m, content: [...m.content] }))
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg?.source === 'sub_agent') {
          lastMsg.content.push({
            type: 'tool_use',
            id: event.toolId,
            name: event.toolName,
            input: event.input,
          })
          lastMsg.content.push({
            type: 'text',
            text: `\n\n[工具 ${event.toolName} 执行完成:\n${event.result}]`,
          })
        }
        return { messages: msgs }
      })
      break
    }

    case 'error': {
      set((s) => {
        const msgs = s.messages.map((m) => ({ ...m, content: [...m.content] }))
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg?.source === 'sub_agent') {
          lastMsg.content.push({ type: 'text', text: `⚠️ ${event.message}` })
        }
        return { messages: msgs }
      })
      break
    }

    case 'done':
      // 清理
      break
  }
}
```

- [ ] **Step 4: 在 sendMessage 中注入回调**

在 `sendMessage` 的 `tool_executing` 事件处理中，当 `event.toolName === 'agent'` 时，将 `handleSubAgentEvent` 绑定到 toolContext：

```typescript
case 'tool_executing':
  toolCallMap.set(event.toolId, { name: event.toolName, input: {} })
  // 新增：为 agent 工具注入 SubAgent 事件回调
  if (event.toolName === 'agent' && toolContext) {
    toolContext.onSubAgentEvent = get().handleSubAgentEvent
  }
  break
```

- [ ] **Step 5: tool_complete 跳过 agent 工具的常规处理**

在 `sendMessage` 的 `tool_complete` 事件处理中，当 `event.toolName === 'agent'` 时，跳过常规的 tool_use + 结果文本块创建：

```typescript
case 'tool_complete': {
  // 新增：agent 工具的 SubAgent 消息已独立展示，跳过常规折叠块
  if (event.toolName === 'agent') break

  // ... 原有逻辑不变
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npx vitest run tests/stores/agentStore.test.ts`
Expected: 测试通过

- [ ] **Step 7: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 8: 提交**

```bash
git add src/application/stores/agentStore.ts tests/stores/agentStore.test.ts
git commit -m "feat: agentStore 集成 SubAgent 事件处理，实时创建独立消息"
```

---

### Task 4: ChatRow 渲染 SubAgent 消息

**Files:**
- Modify: `src/presentation/agentPanel/ChatRow.tsx`
- Create: `tests/presentation/ChatRow.test.tsx`

- [ ] **Step 1: 编写 ChatRow SubAgent 渲染测试**

```typescript
// tests/presentation/ChatRow.test.tsx
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { ChatRow } from '../../src/presentation/agentPanel/ChatRow'

describe('ChatRow SubAgent 渲染', () => {
  it('主 Agent 消息应显示 "AI 助手" 标签', () => {
    render(
      <ChatRow
        message={{
          role: 'assistant',
          content: [{ type: 'text', text: '你好' }],
        }}
      />,
    )
    expect(screen.getByText('AI 助手')).toBeTruthy()
  })

  it('SubAgent 消息应显示 "SubAgent" 标签', () => {
    render(
      <ChatRow
        message={{
          role: 'assistant',
          source: 'sub_agent',
          content: [{ type: 'text', text: '子Agent回复' }],
        }}
      />,
    )
    expect(screen.getByText('SubAgent')).toBeTruthy()
    expect(screen.getByText('子Agent回复')).toBeTruthy()
  })

  it('SubAgent 消息应包含 sub-agent CSS 类', () => {
    const { container } = render(
      <ChatRow
        message={{
          role: 'assistant',
          source: 'sub_agent',
          content: [{ type: 'text', text: '测试' }],
        }}
      />,
    )
    expect(container.querySelector('.chat-row.sub-agent')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/presentation/ChatRow.test.tsx`
Expected: 测试失败（ChatRow 未处理 source 字段）

- [ ] **Step 3: 修改 ChatRow 渲染逻辑**

修改 `src/presentation/agentPanel/ChatRow.tsx` 的 `ChatRow` 组件：

```typescript
export function ChatRow({ message, isStreaming }: ChatRowProps) {
  const isUser = message.role === 'user'
  const isSubAgent = message.source === 'sub_agent'

  if (isUser) {
    // ... 不变
  }

  return (
    <div className={`chat-row assistant${isSubAgent ? ' sub-agent' : ''}`}>
      <div className="chat-label">{isSubAgent ? 'SubAgent' : 'AI 助手'}</div>
      <AssistantBubble content={message.content} isStreaming={isStreaming} />
    </div>
  )
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/presentation/ChatRow.test.tsx`
Expected: 测试通过

- [ ] **Step 5: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 6: 提交**

```bash
git add src/presentation/agentPanel/ChatRow.tsx tests/presentation/ChatRow.test.tsx
git commit -m "feat: ChatRow 渲染 SubAgent 消息，显示独立标签"
```

---

### Task 5: SubAgent CSS 样式

**Files:**
- Modify: `src/presentation/agentPanel/AgentPanel.css`

- [ ] **Step 1: 添加 SubAgent 样式**

在 `src/presentation/agentPanel/AgentPanel.css` 末尾添加：

```css
/* SubAgent 消息样式 */
.chat-row.sub-agent .chat-label {
  color: #c586c0;
}

.chat-row.sub-agent .chat-bubble {
  border-left: 2px solid #c586c0;
}
```

- [ ] **Step 2: 运行 dev 验证样式**

Run: `npm run dev`
Expected: 开发服务器启动无错误

- [ ] **Step 3: 提交**

```bash
git add src/presentation/agentPanel/AgentPanel.css
git commit -m "feat: 添加 SubAgent 消息样式（紫色标签 + 左边框）"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 2: TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Lint 检查**

Run: `npm run lint`
Expected: 无 lint 错误

- [ ] **Step 4: 更新 todo.md**

删除 `3.9d SubAgent 消息独立展示` 条目。

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: 完成 SubAgent 消息独立展示功能（3.9d）"
```
