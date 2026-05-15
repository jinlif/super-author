# 待办

> **维护规则：**
>
> - 完成的任务直接删除，不归档（git history 是真相）
> - Bug 修复后：摘要写入 `docs/bugfix/bug-N.md`，从本文件删除
> - 新增任务：追加到对应 section，注明依赖关系
> - 阶段完成后：删除该阶段所有条目，更新"排队中"为"当前"

> **设计文档：**
>
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [Phase 2 设计](docs/superpowers/specs/2026-05-09-super-author-phase2-design.md)
> - [Model Service 设计](docs/superpowers/specs/2026-05-10-editor-model-service-design.md)
> - [Phase 3-6 实施计划](docs/superpowers/plans/2026-05-10-super-author-phase3-plan.md)
>
> **参考资料：**
>
> - [react-mentions-ts 库文档](docs/context/react-mentions-ts.md) — Phase 3.9a @文件引用使用的第三方库
>
> 路线：B（Tauri + cline 核心模块）

---

## 当前：Phase 3.9

> 3.8 已全部完成

### 3.9a @文件引用增强

**现状：** 当前 `@` 只扫描 4 个硬编码目录、仅 `.md`、无子目录递归、无索引缓存、输入框 `@` 文本无高亮。

**方案：** 安装 `react-mentions-ts`（npm install react-mentions-ts），它内置透明 textarea + overlay 高亮、搜索弹窗、键盘导航、光标感知（`data-mention-selection`），一次性替代自实现的 `detectMention` + `FileMentions` 组件（减少约 200 行自定义代码）。同时改造 `FileMentionService` 为递归全目录扫描 + 索引缓存（requestIdleCallback 延迟构建）。

- [ ] **安装依赖**：`npm install react-mentions-ts`
- [ ] **改造 `FileMentionService` → 递归全目录扫描 + 索引缓存**
  - 递归扫描 `bookDir`（排除 `book.json`、`.super-author/`），不限制文件扩展名
  - requestIdleCallback 延迟构建索引，搜索变为同步 filter
  - 书架切换/文件夹刷新时重建索引
- [ ] **替换 `AgentInput.tsx` 中的输入组件**
  - 移除 `detectMention()` + `FileMentions` 组件及 `FileMentions.css` 弹窗样式
  - 引入 `<MentionsInput>` + `<Mention trigger="@" data={async provider}>`
  - async data provider 对接 `FileMentionService.searchFiles`（走缓存索引）
  - 移除 `react-textarea-autosize`，使用库的 `autoResize` prop
- [ ] **调整发送逻辑**
  - `value` 中存储 markup 格式 `@[文件名](filePath)`，`plainTextValue` 发给 AI
  - `handleSend` 从 `value` 解析 markup 提取 filePath → 读取文件内容
  - `selectedMentions` chips 保留，数据源改为从 `value` 解析
- [ ] **CSS 适配**
  - 删除 `FileMentions.css` 弹窗样式，保留 mention-chips 样式
  - 配置 react-mentions-ts 的 Tailwind 样式
- [ ] **测试**：索引构建、@ 选择 → 发送全链路、大目录性能

### 3.9b Agent 交互工具：approval + ask_question

**现状：** Agent 没有与用户交互的能力，无法在执行敏感操作前请求用户审批，也无法在对话中间向用户提问。

**方案：** 新增两个通用交互工具，均基于 AgentLoop 异步挂起机制。对话框固定定位在聊天面板底部覆盖输入框。

**两个工具定义：**

| 工具           | 用途         | 输入                                                                                                             | 输出                                                         | 交互方式                 |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------ |
| `approval`     | 通用权限审批 | `title: string`                                                                                                  | 见下方三种情况                                               | 点击按钮直接触发         |
| `ask_question` | 向用户提问   | `question: string`, `options?: { label: string, value: string }[]`, `allowInput?: boolean`, `multiple?: boolean` | `{ action: 'answered', selected?: string[], text?: string }` | 选择候选项后点"提交"按钮 |

**approval 三种交互逻辑：**

| 用户操作          | 行为                             | tool result                                               | AgentLoop                               |
| ----------------- | -------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| 点击"同意"        | 执行变更（由实际工具处理）       | `{ action: 'approved' }`                                  | 继续执行（AI 接着调 write_file 等）     |
| 点击"拒绝"        | 终止 AgentLoop                   | `{ action: 'rejected', reason: '用户拒绝' }`              | 终止，但 tool result 写入对话供后续参考 |
| 输入框输入 + 提交 | 用户表示需要微调，终止 AgentLoop | `{ action: 'rejected', reason: '用户输入', text: '...' }` | 终止，用户输入内容写入对话              |

**UI 示意：**

```
┌─ AgentMessages ─────────────────────┐
│  ╔══ tool: approval ═══════════╗   │
│  ║ title: "是否保存该章节？"    ║   │
│  ╚═════════════════════════════╝   │
├─────────────────────────────────────┤
│ ┌─── 审批对话框 (ApprovalDialog) ─┐ │
│ │  标题: 是否保存该章节？          │ │
│ │  [ 拒绝 ]     [ 同意 ]          │ │
│ │  ┌───────────────── [ 提交 ] ──┐ │ │
│ │  │ 补充指令输入框               │ │ │
│ │  └─────────────────────────────┘ │ │
│ └───────────────────────────────────┘ │
│  ┌─ AgentInput (被对话框遮盖) ────┐ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─ AgentMessages ─────────────────────┐
│  ╔══ tool: ask_question ════════╗   │
│  ║ question: "使用哪种风格？"   ║   │
│  ║ options: ["古典","现代"]     ║   │
│  ╚═════════════════════════════╝   │
├─────────────────────────────────────┤
│ ┌─── 问答对话框 (AskDialog) ──────┐ │
│ │  问题: 使用哪种风格？            │ │
│ │  ☐ 古典     ☐ 现代               │ │
│ │  ┌─────────────────────────┐    │ │
│ │  │ 自由输入框               │    │ │
│ │  └─────────────────────────┘    │ │
│ │  [         提交          ]      │ │
│ └───────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- [ ] **定义 `approval` 工具（ToolDef）**
  - 输入：`title: string`（审批标题）
  - 输出：
    - 同意：`{ action: 'approved' }` → AgentLoop 继续
    - 拒绝（按钮）：`{ action: 'rejected', reason: '用户拒绝' }` → 终止 AgentLoop，写入对话
    - 拒绝（输入框+提交）：`{ action: 'rejected', reason: '用户输入', text: '...' }` → 终止 AgentLoop，写入对话
  - 标记 `needsUserInput: true`
- [ ] **定义 `ask_question` 工具（ToolDef）**
  - 输入：`question: string`、`options?: { label: string, value: string }[]`、`allowInput?: boolean`、`multiple?: boolean`
  - 输出：`{ action: 'answered', selected?: string[], text?: string }`
  - 必须点击"提交"按钮才会发送结果，支持单选/多选/自由输入
  - 标记 `needsUserInput: true`
- [ ] **AgentLoop + ToolExecutor 改造 → 异步挂起/恢复**
  - `ToolExecutor.executeAll` 遇到 `needsUserInput: true` 的工具时暂停执行
  - 产生 `{ type: 'waiting_confirm', toolName, input }` 事件
  - 挂起当前 Promise，等待外部 `resolvePending(result)` 恢复
- [ ] **agentStore 新增状态**
  - `pendingTool: { name: string, input: object, resolve: (result) => void } | null`
  - `resolvePending(result)` → 调用 resolve 回调 → 清空 pendingTool
  - 监听 `waiting_confirm` 事件设置 pendingTool
  - 对于 approval 的 reject：调用 resolve 后同时终止 AgentLoop
- [ ] **ApprovalDialog 组件**
  - `position: fixed` 聊天面板底部，z-index 高于 AgentInput
  - 显示标题、拒绝按钮、同意按钮、输入框+提交按钮
- [ ] **AskDialog 组件**
  - 显示问题文本、候选项列表（checkbox 多选 / radio 单选）、自由输入框
  - 所有操作通过"提交"按钮统一发送
- [ ] **CSS 样式**
  - 共用 fixed 底部定位样式
  - z-index 高于 AgentInput 覆盖输入框
  - 深色主题适配

### 3.9c 文件操作授权 + Diff 视图（依赖 3.9b）

**现状：** 文件写入工具直接执行无审批，需与 3.9b 的 `approval` 工具联动。diff 视图在编辑器区域（EditorPanel 用 Monaco DiffEditor）展示。

**方案：**

- 修改 SystemPrompt 要求 AI 在执行写入工具前先调 `approval`
- EditorPanel 检测 pendingTool 中的文件变更信息，切换到 DiffEditor 模式
- Diff 视图不在 ApprovalDialog 内，而在独立的编辑器区域

**流程：**

```
Agent 准备写入文件
    ↓ 先调 approval({ title: "建议修改 '第一章'" })
    ↓
AgentLoop 暂停 → pendingTool 设置 → UI 展示两个区域：
    ├─ EditorPanel → Monaco DiffEditor（左侧原始，右侧新内容）
    └─ 聊天面板底部 → ApprovalDialog
    ↓
用户点"同意" → resolvePending → AgentLoop 恢复 → AI 接着调 write_file
用户点"拒绝" → AgentLoop 终止，reject 写入对话消息
用户输入+提交 → AgentLoop 终止，输入内容写入对话消息
```

- [ ] **SystemPrompt 改造**
  - 增加规则：调用 `write_file`/`diff_update_file`/`replace_file` 前必须先调 `approval`
  - 说明 approval 的工具描述和正确用法
- [ ] **EditorPanel 集成 DiffEditor**
  - agentStore 新增 `diffForReview: { title, filePath, original, modified } | null`
  - 当 `pendingTool.name === 'approval'` 时，根据对话上下文提取文件变更信息设置 diffForReview
  - EditorPanel 检测到 `diffForReview`，渲染 `<DiffEditor original={original} modified={modified} />`
  - 审批完成后清除 diffForReview，恢复普通编辑器
  - diff 模式下编辑器为只读状态
- [ ] **审批完成后操作**
  - 用户同意 → AI 接着调 `write_file`/`diff_update_file` 执行实际写入
  - 用户拒绝 → AI 未执行写入，对话显示拒绝原因

### 3.9d SubAgent 消息独立展示

**现状：** SubAgent（`agent` 工具）在父 Agent 中执行时，其完整对话过程（thinking、tool calls、text 等）被折叠为一个工具调用块 `🔧 agent`，用户看不到子 agent 的思考过程和工具调用细节，只看到最终结果文本。

**目标：** SubAgent 的消息展示形式与主 Agent 一致，消息上方显示"SubAgent"名称而非"AI 助手"，其内部的 thinking、tool calls、text 等全部展开可见。

**方案变化（SubAgentTool → 事件透传）：**

```
当前:
  SubAgentTool 执行 AgentLoop → 只收集 finalText → 返回 tool result → 父级折叠展示

目标:
  SubAgentTool 执行 AgentLoop → 透传所有 UI 事件到父级
    → 父级 store 为 SubAgent 创建独立 assistant 消息块
    → ChatRow 检测到 source === 'sub_agent'，渲染 "SubAgent" 标签
```

- [ ] **AgentMessage 类型扩展**
  - `AgentMessage` 新增可选字段 `source?: 'main' | 'sub_agent'`
  - SubAgent 产生的消息标记 `source: 'sub_agent'`
- [ ] **SubAgentTool 改造 → 事件透传**
  - handler 不再只收集 `finalText`，而是将 AgentLoop 产生的完整 UI 事件列表暴露给调用方
  - 父 Agent 的 `tool_complete` 事件处理中，识别 sub_agent 返回的事件列表
  - 将这些事件渲染为独立的 assistant 消息（而非工具折叠块）
- [ ] **agentStore 集成 SubAgent 事件**
  - 在 `sendMessage` 的 `tool_complete` 分支中，检测 toolName === 'agent'
  - SubAgent 的 tool result 包含完整的事件列表
  - 为 SubAgent 的每条消息创建独立的 `AgentMessage`，标记 `source: 'sub_agent'`
  - 消息内容和主 agent 一样包含 text、thinking、tool_use 等块
- [ ] **ChatRow 渲染 SubAgent 消息**
  - 检测 `message.source === 'sub_agent'`，显示 `chat-label` 为 "SubAgent"（而非"AI 助手"）
  - 内容渲染与主 agent 一致（ThinkingBlock、ToolCallBlock、text 等）
- [ ] **CSS 样式**
  - 添加 `.chat-row.sub-agent` 样式
  - `.chat-label` 显示 "SubAgent"，颜色与主 agent 区分（或其他视觉差异）

---

## 排队中

- **Phase 4** Skill 系统（SkillLoader / SkillMatcher / 内置 Skill / SkillManager UI）
- **Phase 5** MCP 集成（McpHub / McpClient / MCP 工具自动注册）
- **Phase 6** 高级功能（划词备注、角色管理、写作目标、修订历史、应用设置、性能优化）

---

## 已知问题

暂无

## 待优化

- 标题栏主题色与 VS Code 暗色主题对齐
- 面板拖拽调整大小
- i18n 支持
