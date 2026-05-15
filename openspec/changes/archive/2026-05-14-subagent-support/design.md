## Context

Phase 3 Agent 核心已完成，当前有 6 个专用工具（read_chapter 等）、单层 AgentLoop、内存会话缓存。Phase 3.8 需要重构为通用工具 + SubAgent 架构。

现有代码结构：
- `src/application/agent/AgentLoop.ts` — AsyncGenerator 循环，接收 messages + options
- `src/application/agent/ToolRegistry.ts` — Map<string, ToolDef> 注册表
- `src/application/agent/ToolExecutor.ts` — 并行/串行执行
- `src/application/agent/SystemPrompt.ts` — 系统提示词构建
- `src/application/agent/ContextBuilder.ts` — 写作上下文构建（将被删除）
- `src/application/agent/ConversationStore.ts` — 会话持久化（当前纯内存）
- `src/application/stores/agentStore.ts` — Zustand store，管理 Agent 生命周期

## Goals / Non-Goals

**Goals:**
- 通用文件系统工具替代专用写作工具
- SubAgent 作为普通 Tool 实现，复用 AgentLoop
- 会话持久化到磁盘
- 目录描述系统让 AI 理解书籍结构
- DESCRIPTION.md 替代 book.json description 字段
- 章节摘要可通过 CRUD 工具访问

**Non-Goals:**
- SubAgent 的 UI 渲染（主 Agent 的消息列表已足够）
- SubAgent 后台执行（同步阻塞即可）
- 章节摘要的自动生成（由主 Agent 或 Skill 触发）
- 多 Agent 类型（只有一种通用 SubAgent）

## Decisions

### D1: SubAgent 是 ToolDef，不是独立系统

**选择**：SubAgentTool 实现 ToolDef 接口，和 ReadFileTool 等平级。

**理由**：
- 复用现有 ToolRegistry / ToolExecutor 基础设施
- 主 Agent 调用方式统一（都是工具调用）
- 不需要新的调度层

**替代方案**：独立的 SubAgentScheduler — 过度设计，增加复杂度。

### D2: SubAgent 工具集 = 父 Registry - agent 自身

**选择**：SubAgentTool 从父 ToolRegistry 复制所有工具，排除 `agent` 工具。

**理由**：
- 防止递归派生
- SubAgent 能访问所有文件操作工具
- 实现简单（clone + filter）

### D3: Provider config 通过 getter 延迟获取

**选择**：SubAgentTool 接收 `getProviderConfig: () => ProviderConfig` 而非直接传入 config。

**理由**：
- `initRegistry()` 时 providerConfig 可能未就绪
- 用户可能在运行时切换 provider
- getter 模式确保每次调用获取最新 config

### D4: 三种更新工具分离

**选择**：WriteFile（全量覆盖）/ DiffUpdateFile（diff 更新）/ ReplaceFile（正则替换）三个独立工具。

**理由**：
- 三种策略语义清晰，AI 可根据场景选择
- ReplaceFile 的正则匹配多时报错逻辑需要独立实现
- DiffUpdateFile 依赖 diff.js 库

### D5: 系统提示词声明摘要可访问，不注入内容

**选择**：SystemPrompt 声明"章节摘要存储在 `.super-author/books/<bookname>/chapter-summaries.json`，可通过工具访问"。

**理由**：
- 摘要内容可能很大，注入会浪费 token
- AI 按需读取更灵活
- 保持系统提示词简洁

### D6: AGENT.md 作为 user message 注入，非 system prompt

**选择**：AGENT.md 内容包装在 `<system-reminder>` 标签中，作为第一条 user message 插入消息列表。与 Claude Code 的 CLAUDE.md 注入方式一致。

**理由**：
- 与 Claude Code 架构一致，降低认知负担
- 不污染 system prompt（system prompt 保持稳定，利于 prompt cache）
- user message 可以在对话中被覆盖或修改

## Risks / Trade-offs

**[Risk] SubAgent 执行时间长导致主 Agent 阻塞** → 当前设计为同步阻塞，SubAgent maxTurns 默认 5，限制执行时间。未来可扩展为后台执行。

**[Risk] diff.js 库体积** → diff.js 是成熟库，体积小，可接受。

**[Risk] 旧工具删除后现有代码引用报错** → 在 3.8c.1 中同步更新所有引用点（agentStore.initRegistry）。
