# Agent 交互工具设计（3.9b）

日期: 2026-05-17

## 目标

Agent 增加两个与用户交互的工具：`approval`（权限审批）和 `ask_question`（提问），均通过异步挂起机制等待用户操作，不阻塞 UI。

## 架构

```
AgentLoop (async generator)
  │  检测到 needsUserInput 工具
  │  → yield waiting_confirm 事件（UI 收到后显示对话框）
  │  → await onUserInput() 挂起（等待用户操作）
  │  → 用户响应后继续
  │  → yield tool_complete 事件
  │  → 下一轮 AI 看到结果

agentStore (sendMessage for-await)
  │  waiting_confirm → 设置 pendingTool 状态
  │  → 用户操作 → resolvePending(result) → onUserInput Promise 恢复
  │  → for-await 继续消费后续事件
```

## 改动清单

### 1. ToolDef 扩展

文件: `src/domain/types/tool.ts`

ToolDef 新增可选字段 `needsUserInput`，标记需要用户交互的工具（handler 不会被 ToolExecutor 调用，由 AgentLoop 直接处理）：

```typescript
export interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: ToolHandler
  isReadOnly: boolean
  needsUserInput?: boolean  // 新增
}
```

### 2. AgentUIEvent 扩展

文件: `src/domain/types/agent.ts`

新增 `waiting_confirm` 事件类型：

```typescript
export type AgentUIEvent =
  | { type: 'stream_chunk'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_executing'; toolId: string; toolName: string }
  | { type: 'tool_complete'; toolId: string; toolName: string; input: Record<string, unknown>; result: string }
  | { type: 'turn_start'; turn: number }
  | { type: 'waiting_confirm'; toolName: string; input: Record<string, unknown> }  // 新增
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'aborted' }
```

### 3. AgentLoop 改造 — 异步挂起机制

文件: `src/application/agent/AgentLoop.ts`

`run()` 新增 `onUserInput` 回调参数。在 `executeAll` 执行前，先分离 `needsUserInput` 工具由 AgentLoop 直接处理：

```typescript
export interface AgentLoopOptions {
  // ... 现有字段
  onUserInput?: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>  // null = aborted
}
```

处理流程（在 `toolCalls` 收集完成后，`executeAll` 之前）：

```
1. 遍历 toolCalls，分离 needsUserInput 工具和普通工具
2. 对每个 needsUserInput 工具：
   a. yield { type: 'waiting_confirm', toolName, input }
   b. const result = await onUserInput(toolName, input)
   c. if (result === null) → yield { type: 'done' }; return (loop 终止)
   d. 将 result 作为 tool result 加入结果列表
3. 剩余普通工具交给 ToolExecutor.executeAll 执行
4. 合并结果，yield tool_complete 事件
```

此设计让 ToolExecutor 无需改动——needsUserInput 工具在 AgentLoop 层面处理。

### 4. agentStore 新增状态和方法

文件: `src/application/stores/agentStore.ts`

新增状态:

```typescript
interface AgentStore {
  // ... 现有状态
  pendingTool: {
    name: string
    input: Record<string, unknown>
    resolve: (result: Record<string, unknown>) => void
  } | null

  // 新增方法
  resolvePending: (result: Record<string, unknown>) => void
}
```

`sendMessage` 改动：

- 创建 `onUserInput` 回调 → 返回 Promise（resolve 由 pendingTool 持有）
- 在 `for await` 循环中处理 `waiting_confirm` 事件：
  - 设置 `pendingTool` 状态（含 resolve 回调）
- 在 `done` / `error` / `aborted` 事件处理中清空 `pendingTool`

`resolvePending` 方法：

```typescript
resolvePending: (result) => {
  const state = get()
  if (state.pendingTool) {
    state.pendingTool.resolve(result)  // 恢复 onUserInput Promise
    set({ pendingTool: null })
  }
}
```

拒绝/终止流程：
- 用户点"拒绝" → `resolvePending({ action: 'rejected', reason: '用户拒绝' })` → onUserInput 恢复 → AgentLoop 收到结果 → 继续
- 同时通过 `abortStreaming()` 终止循环（AbortController）

### 5. 新增 `approval` 工具

文件: `src/infrastructure/tools/ApprovalTool.ts`

```typescript
export const approvalTool: ToolDef = {
  name: 'approval',
  description: '请求用户审批一个操作。在执行敏感操作前调用此工具获取用户许可。',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '审批标题' },
    },
    required: ['title'],
  },
  isReadOnly: false,
  needsUserInput: true,
  handler: async () => ({ content: '' }), // 不会被调用
}
```

在 `agentStore.initRegistry` 中注册。

### 6. 新增 `ask_question` 工具

文件: `src/infrastructure/tools/AskQuestionTool.ts`

```typescript
export const askQuestionTool: ToolDef = {
  name: 'ask_question',
  description: '向用户提问，获取用户的输入或选择。',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '问题内容' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
          },
        },
        description: '候选项列表',
      },
      allowInput: { type: 'boolean', description: '是否允许自由输入' },
      multiple: { type: 'boolean', description: '是否允许多选' },
    },
    required: ['question'],
  },
  isReadOnly: false,
  needsUserInput: true,
  handler: async () => ({ content: '' }),
}
```

在 `agentStore.initRegistry` 中注册。

### 7. ApprovalDialog 组件

文件: `src/presentation/agentPanel/ApprovalDialog.tsx`

- `position: fixed` 定位在 agent-body 底部
- z-index: 15（高于 AgentInput 的 10）
- 显示 title（来自 pendingTool.input.title）
- 三个交互区域：
  - 按钮行：[拒绝] [同意]（水平排列）
  - 输入框 + [提交] 按钮
- 点击"同意" → `resolvePending({ action: 'approved' })`
- 点击"拒绝" → `resolvePending({ action: 'rejected', reason: '用户拒绝' })` + 同时 abort
- 输入框内容 + 提交 → `resolvePending({ action: 'rejected', reason: '用户输入', text })` + 同时 abort
- 仅在 `pendingTool?.name === 'approval'` 时渲染

### 8. AskDialog 组件

文件: `src/presentation/agentPanel/AskDialog.tsx`

- `position: fixed` 定位在 agent-body 底部
- z-index: 15
- 显示 question（来自 pendingTool.input.question）
- 候选项（单选 radio / 多选 checkbox，由 `multiple` 控制）
- 自由输入框（由 `allowInput` 控制）
- [提交] 按钮→ 收集选定项和输入文本 → `resolvePending({ action: 'answered', selected, text })`
- 仅在 `pendingTool?.name === 'ask_question'` 时渲染

### 9. CSS 样式

文件: `src/presentation/agentPanel/AgentPanel.css`

新增 `.agent-dialog-overlay`（固定定位覆盖层）和 `.agent-dialog`（对话框容器）：

```css
.agent-dialog-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 12;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.agent-dialog {
  background-color: #252526;
  border-top: 1px solid #3c3c3c;
  padding: 12px;
  z-index: 15;
}
```

对话框内部元素样式与现有深色主题保持一致。

### 10. AgentPanel 集成

文件: `src/presentation/agentPanel/AgentPanel.tsx`

在 `<div className="agent-body">` 内、消息列表和输入框之间新增对话框渲染：

```tsx
<div className="agent-body">
  <AgentMessages />
  {pendingTool && <ApprovalDialog />}  // 或 <AskDialog />
  <AgentInput />
</div>
```

两对话框互斥（同一时间只有一个 pendingTool），通过 `pendingTool.name` 判断渲染哪个。

## 数据流

```
Agent 调用 approval/ask_question
  → AgentLoop yield waiting_confirm
  → agentStore 设置 pendingTool
  → UI 渲染对应对话框
  → 用户操作 → resolvePending(result)
  → onUserInput Promise 恢复
  → AgentLoop 将 result 作为 tool result 返回
  → yield tool_complete
  → AI 看到结果并继续
```

## 审批流程细则

| 用户操作 | resolvePending 传入值 | AgentLoop 行为 |
|---|---|---|
| 点击"同意" | `{ action: 'approved' }` | 继续执行，AI 接着调 write_file 等 |
| 点击"拒绝" | `{ action: 'rejected', reason: '用户拒绝' }` | 结果返回 AI，同时 abortStreaming |
| 输入框+提交 | `{ action: 'rejected', reason: '用户输入', text }` | 结果返回 AI，同时 abortStreaming |

拒绝时 abortStreaming 终止循环，但 tool result 仍写入对话消息供后续参考。

## 修改文件汇总

| 文件 | 操作 |
|---|---|
| `src/domain/types/tool.ts` | 修改 — ToolDef 新增 needsUserInput |
| `src/domain/types/agent.ts` | 修改 — AgentUIEvent 新增 waiting_confirm |
| `src/application/agent/AgentLoop.ts` | 修改 — 处理 needsUserInput 工具 + onUserInput |
| `src/application/stores/agentStore.ts` | 修改 — pendingTool + resolvePending + 注册新工具 |
| `src/infrastructure/tools/ApprovalTool.ts` | 新增 |
| `src/infrastructure/tools/AskQuestionTool.ts` | 新增 |
| `src/presentation/agentPanel/ApprovalDialog.tsx` | 新增 |
| `src/presentation/agentPanel/AskDialog.tsx` | 新增 |
| `src/presentation/agentPanel/AgentPanel.tsx` | 修改 — 集成对话框 |
| `src/presentation/agentPanel/AgentPanel.css` | 修改 — 对话框样式 |
