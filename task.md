# 超级作者 — 开发任务看板

> 需求文档：
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [Phase 2 设计](docs/superpowers/specs/2026-05-09-super-author-phase2-design.md)
> - [Model Service 设计](docs/superpowers/specs/2026-05-10-editor-model-service-design.md)
>
> 实施计划：
> - [Phase 3-6 实施计划](docs/superpowers/plans/2026-05-10-super-author-phase3-plan.md)
> - **路线：B（Tauri + cline 核心模块）**

---

## Phase 1 遗留 ✅

- [x] **Tauri v2 壳集成** — 创建 `src-tauri/` 目录，Rust 依赖，tauri.conf.json 配置

## Phase 2：数据模型 & 本地存储 ✅

> 目标：能创建书、写章节，数据存本地 markdown（已完成 ✅）

- [x] **2.1** TypeScript 类型定义完善 (Book, Chapter)
- [x] **2.2** Tauri Rust 文件系统 command (read_file, write_file, read_dir, create_dir, path_exists)
- [x] **2.3** 前端文件服务层 (FileService 接口 + Mock + Tauri + 工厂)
- [x] **2.4** BookService — BookRepository + ChapterRepository
- [x] **2.5** 书籍选择页面/对话框
- [x] **2.6** Monaco Editor 集成 — markdown 编辑、高亮
- [x] **2.7** 章节内容读写 + 5s 自动保存
- [x] **2.8** 侧边栏章节树
- [x] **2.9** 状态栏 — 字数统计、文件名
- [x] **2.10** ModelService — VS Code 风格 Model 生命周期管理
- [x] **2.11** Phase 2 集成测试（12 文件 57 测试）

---

## Phase 2.5：文件资源管理器 & 统一数据目录 ✅

> **目标：** 固化数据存储到 `~/.superauthor/`，侧边栏从章节树升级为 VS Code 风格文件资源管理器，支持目录/文件 CRUD 和卷系统。
>
> **Change：** `file-explorer-and-data-restructure` → 已归档 (2026-05-11)

### 5a：基础设施

- [x] **5a.1** ConfigService — 统一管理 `~/.superauthor/` 路径推导（config.json、books/、skills/、history/）
- [x] **5a.1.1** ConfigService 改用文件系统存储 — 移除 localStorage，通过 IFileService 读写 `~/.superauthor/config.json`（新增 Rust `get_home_dir` 命令、IFileService.getHomeDir 接口）
- [x] **5a.2** BookRepository 适配 — `createBook` 路径基于 `ConfigService.booksDir`
- [x] **5a.3** bookStore 精简 — 移除 `baseDir`、`setBaseDir`，只留书级状态
- [x] **5a.4** BookSelector 简化 — 移除目录选择，直接展示 `~/.superauthor/books/` 下的书籍

### 5b：FileExplorer 组件

- [x] **5b.1** FileExplorer 主组件（递归目录树，展开/折叠状态管理）
- [x] **5b.2** FileTreeNode 递归节点（目录展开/折叠，md 文件打开）
- [x] **5b.3** ContextMenu 右键菜单（按节点类型动态生成操作列表）
- [x] **5b.4** 系统目录视觉标识（颜色 + 图标映射），`.super-author/` 默认折叠
- [x] **5b.5** 新建目录/文件（同级同名冲突校验）
- [x] **5b.6** 删除功能（文件/目录确认对话框）

### 5c：卷系统

- [x] **5c.1** ChapterRepository 递归扫描子目录，解析卷内章节
- [x] **5c.2** 新增卷（`chapters/` 右键 → `{序号}_{卷名}/`）
- [x] **5c.3** 新增章节（卷内或根级 → `{序号}-{标题}.md`）
- [x] **5c.4** 删除卷（确认对话框 + 递归删除）
- [x] **5c.5** Chapter 类型扩展：新增可选 `volume?: string`

### 5d：Sidebar + ActivityBar 调整

- [x] **5d.1** Sidebar 精简 — 移除 search/characters 面板，files 视图渲染 FileExplorer
- [x] **5d.2** ActivityBar 精简 — 仅保留 files 和 settings 图标
- [x] **5d.3** 删除 ChapterTree 组件及关联 CSS
- [x] **5d.4** layout.ts 类型调整 — 注释掉 search/characters 相关类型

### 5e：测试

- [x] **5e.1** FileExplorer 组件测试
- [x] **5e.2** 卷创建/章节创建/自动编号测试
- [x] **5e.3** ConfigService 路径推导测试
- [x] **5e.4** 目录同名校验测试

---

## Phase 3：Agent 核心 + 多 Provider ✅

> **目标：** 在对话面板发指令，Agent 调用写作工具返回内容写入编辑器
>
> **源码参考：** `C:\Users\77537\Desktop\cline-main\src/`
>
> **核心模块搬运：**
> | 源（cline-main） | 目标（super-author） | 用途 |
> |---|---|---|
> | `core/api/index.ts` + `providers/` | `infrastructure/providers/` | Provider 抽象 |
> | `core/task/index.ts` + `ToolExecutor.ts` | `application/agent/` | Agent 循环 |
> | `webview-ui/src/components/chat/` | `presentation/agentPanel/` | Chat UI |
>
> **前置依赖：** Phase 2.5 须先完成（ConfigService 路径体系、Sidebar 结构已就绪）

### 3a：基础设施（类型 + Provider）

- [x] **3a.1** 定义 Agent 领域类型
  - Create: `src/domain/types/agent.ts` — AgentMessage, AgentStreamEvent, AgentUIEvent, ProviderConfig
  - Create: `src/domain/types/tool.ts` — ToolDef, ToolResult, ToolContext
  - 为 Provider/Tool/AgentLoop 提供统一类型基础

- [x] **3a.2** Provider 接口 + 流式事件定义
  - Create: `src/infrastructure/providers/IProvider.ts`
  - 定义 `IProvider` 接口：`createMessage(systemPrompt, messages, tools, signal) → AsyncGenerator<AgentStreamEvent>`
  - 参考 cline `core/api/index.ts:53-58` ApiHandler 接口

- [x] **3a.3** Claude Provider 实现
  - Create: `src/infrastructure/providers/ClaudeProvider.ts`
  - 使用 `@anthropic-ai/sdk`，将 Anthropic streaming event 映射为 AgentStreamEvent
  - 参考 cline `core/api/providers/anthropic.ts`

- [x] **3a.4** OpenAI Provider 实现
  - Create: `src/infrastructure/providers/OpenAIProvider.ts`
  - 使用 `openai` SDK，将 OpenAI chat completions delta 映射为 AgentStreamEvent
  - 处理 tool_calls JSON 字符串 → 对象转换
  - 参考 cline `core/api/providers/openai.ts`

- [x] **3a.5** Provider 工厂
  - Create: `src/infrastructure/providers/createProvider.ts`
  - 根据 ProviderConfig.id 创建对应 Provider 实例

- [x] **3a.6** Provider 单元测试
  - Create: `tests/infrastructure/ClaudeProvider.test.ts`
  - Create: `tests/infrastructure/OpenAIProvider.test.ts`
  - Mock SDK 响应，验证流式事件映射正确性

### 3b：写作工具

- [x] **3b.1** 实现写作工具集
  - Create: `src/infrastructure/tools/ReadChapterTool.ts`
  - Create: `src/infrastructure/tools/WriteChapterTool.ts`（支持临时章节）
  - Create: `src/infrastructure/tools/SearchChaptersTool.ts`
  - Create: `src/infrastructure/tools/GetCharactersTool.ts`
  - Create: `src/infrastructure/tools/CreateChapterTool.ts`
  - 每个工具封装已有 BookStore/ChapterRepository 功能
  - ⚠️ 路径相关操作使用 ConfigService（Phase 2.5 已完成）

- [x] **3b.2** ToolRegistry 工具注册中心
  - Create: `src/application/agent/ToolRegistry.ts`
  - register/unregister/get/list/listForAPI
  - getReadOnlyTools（并发执行支持）
  - 参考 cline `shared/tools.ts`

- [x] **3b.3** 工具单元测试
  - Create: `tests/infrastructure/tools.test.ts`
  - Create: `tests/application/ToolRegistry.test.ts`
  - 基于 MockFileService 测试全部工具

### 3c：Agent 核心循环

- [x] **3c.1** 系统提示词构建
  - Create: `src/application/agent/SystemPrompt.ts`
  - 写作专用提示词：角色定义 + 工具指南 + 写作规范 + 输出格式
  - 参考 cline `core/prompts/system-prompt/` 的体系结构

- [x] **3c.2** 写作上下文构建
  - Create: `src/application/agent/ContextBuilder.ts`
  - 收集：当前章节内容 + 编辑器选区 + 角色卡 + 大纲节点 + 对话历史
  - 内置 token 预算管理（滑动窗口截断）

- [x] **3c.3** AgentLoop 核心循环
  - Create: `src/application/agent/AgentLoop.ts`
  - AsyncGenerator 模式：yield 流式事件 + 工具执行事件
  - 参考 cline `core/task/index.ts:1453-1480` initiateTaskLoop + `2858` streaming loop
  - 简化：无权限确认 / 无 hook / 无 compact / 无 focus chain

- [x] **3c.4** ToolExecutor 工具执行器
  - Create: `src/application/agent/ToolExecutor.ts`
  - 单个工具执行封装，读操作并发、写操作串行
  - 参考 cline `core/task/ToolExecutor.ts`

- [x] **3c.5** Agent 核心单元测试
  - Create: `tests/application/AgentLoop.test.ts`
  - Create: `tests/application/SystemPrompt.test.ts`
  - 使用 Mock Provider，验证循环逻辑

### 3d：UI + 持久化

- [x] **3d.1** Agent Store
  - Create: `src/application/stores/agentStore.ts`
  - 状态：messages, isStreaming, currentTurn, error, providerConfig
  - 操作：sendMessage, abortStreaming, clearConversation, setProviderConfig
  - sendMessage 调用链：ContextBuilder → SystemPrompt → AgentLoop → yield → 更新 store

- [x] **3d.2** Chat UI 核心组件
  - Rewrite: `src/presentation/agentPanel/AgentPanel.tsx`
  - Create: `src/presentation/agentPanel/AgentMessages.tsx`（消息列表，流式渲染）
  - Create: `src/presentation/agentPanel/AgentInput.tsx`（输入框 + 发送 + 中止）
  - Create: `src/presentation/agentPanel/ChatRow.tsx`（单条消息：text/thinking/tool/error）
  - 参考 cline webview `ChatView.tsx`, `ChatRow.tsx`, `ChatTextArea.tsx`

- [x] **3d.3** Agent 内容写入编辑器
  - Modify: `src/presentation/editor/EditorPanel.tsx`
  - write_chapter 工具执行后 → 已有章节直接更新 → 临时章节只读打开
  - AgentInput 显示审阅按钮：[保存] [放弃] [修改]

- [x] **3d.4** 对话历史持久化
  - Create: `src/application/agent/ConversationStore.ts`
  - 存储：`{ConfigService.booksDir}/{book}/.super-author/conversations/{id}.json`
  - CRUD：save/load/list/delete
  - 路径通过 ConfigService 解析

- [x] **3d.5** Provider 配置持久化
  - ⚠️ 由单独的 change `move-model-config-to-settings` 覆盖（见下方说明）
  - 依赖 Phase 2.5 的 ConfigService（配置存储于 `~/.superauthor/config.json`）

- [x] **3d.6** UI 测试
  - Create: `tests/stores/agentStore.test.ts`
  - Create: `tests/presentation/AgentPanel.test.tsx`

### 3e：Phase 3 集成测试

- [x] **3e.1** 端到端集成测试
  - Create: `tests/phase3/Phase3.test.tsx`
  - 测试场景：创建书籍 → 打开章节 → 发送"A续写下一段" → Agent 调用工具 → 内容写入编辑器
  - 路径通过 ConfigService 解析

---

## 附属 Change：设置面板 & 命令系统 ✅

> **目标：** 独立的设置面板 + 斜杠命令系统（Phase 3 的组成部分，拆分实施）
>
> **Change：** `move-model-config-to-settings` → [查看全部任务](openspec/changes/move-model-config-to-settings/tasks.md)
>
> **前置依赖：** 需 Phase 2.5 完成（ConfigService 已就绪、Sidebar 结构已简化）

- [x] **C.1** 类型系统扩展（ProviderConfig 字段扩展、Command 类型）
- [x] **C.2** Provider API 调用适配（max_tokens、temperature、thinking 参数）
- [x] **C.3** CommandRegistry 命令注册中心
  - ⚠️ 注册自定义命令时使用 Phase 2.5 的 ConfigService 读写 `~/.superauthor/config.json`
- [x] **C.4** SettingsPanel 侧边栏集成
  - ⚠️ Sidebar 已精简，settings 分支直接渲染 SettingsPanel（Phase 2.5 已完成）
- [x] **C.5** 各 Section 组件（Provider / API / Model / Parameter / Thinking / CustomCommands）
- [x] **C.6** AgentInput 清理 + `/` 命令检测
- [x] **C.7** CommandSuggestions / ModelPickerModal 弹窗组件
- [x] **C.8** AgentPanel 头部更新（清空按钮 + provider badge）

### 附属优化：per-model maxTokens & customCommands 清理

> **目标：** 每个模型独立配置 maxTokens（K/M 单位），ConfigService 移除 customCommands 存储
>
> **日期：** 2026-05-12

- [x] **C.9** 类型扩展 — `ProviderConfig` 新增 `modelsConfig?: Record<string, ModelConfig>`
- [x] **C.10** agentStore — 切换模型时自动同步 `modelsConfig[model].maxTokens` 到全局 `maxTokens`
- [x] **C.11** SettingsPanel — ModelSection 每个模型项增加独立 maxTokens stepper（±1K，输入框显示数字 + 单位标签，上限 1M）
- [x] **C.12** SettingsPanel — ParameterSection 移除全局 Max Tokens，仅保留 Temperature
- [x] **C.13** ConfigService — 移除 `AppConfig.customCommands`、`loadCustomCommands()`、`saveCustomCommands()`，保留 `loadCommandsFromDir()`

### 附属优化：Agent 消息列表虚拟化 ✅

> **目标：** 会话窗口使用虚拟列表技术，保证大量消息时的渲染性能
>
> **日期：** 2026-05-12

- [x] 安装 `react-virtuoso` 依赖
- [x] AgentMessages 改用 `<Virtuoso>` 虚拟列表（替换 `.map()` 渲染，`followOutput="smooth"` 自动滚底，`overscan=500` 预渲染）
- [x] CSS 适配 — `.agent-messages` 移除 flex/gap（Virtuoso 管理布局），新增 `.agent-virtuoso-item` 间距
- [x] 测试适配 — AgentPanel 测试 mock `react-virtuoso`（jsdom 容器高度为 0）

### 附属优化：Agent 图标化 & 历史记录 ✅

> **目标：** Agent 面板按钮图标化，引入图标库，新增会话历史记录下拉
>
> **日期：** 2026-05-12

- [x] 引入 `lucide-react` 图标库（轻量、tree-shakeable、线性风格）
- [x] AgentPanel 头部按钮图标化 — 清空 `<Trash2>`、关闭 `<X>`、历史 `<History>`
- [x] AgentInput 发送/中止按钮图标化 — 发送 `<SendHorizonal>`、中止 `<Square>`
- [x] agentStore 新增会话历史管理 — `conversationHistory`、`_conversationCache`、自动保存、加载/删除历史
- [x] 历史记录下拉面板 — 点击历史图标展开，显示首个用户输入（溢出隐藏），最大高度 486px，宽度为面板宽度减两侧各 10px
- [x] CSS 适配 — 按钮改为 36×36px flex 居中、历史下拉暗色面板样式
- [x] DESIGN.md 更新 — 新增「图标库」章节记录 `lucide-react` 使用规范

### 附属优化：新建会话入口

> **目标：** 在 Agent 面板头部和输入框命令中添加新建会话能力
>
> **日期：** 2026-05-12

- [x] AgentPanel 头部新增 `<FilePlus>` 按钮（历史记录按钮左侧），点击调用 `clearConversation` 新建会话
- [x] CommandRegistry 注册 `/new` 内置命令（action: execute）
- [x] AgentInput 支持 `/new` 命令 — 选择后调用 `clearConversation()` 清空对话

### 附属优化：错误信息展示为 Agent 回复

> **目标：** 错误信息作为 assistant 消息显示在对话中，而非输入框下方
>
> **日期：** 2026-05-12

- [x] AgentInput 移除输入框下方的错误展示区域（`{error && <div className="chat-error">}`）
- [x] agentStore 所有错误路径改为添加带 ⚠️ 前缀的 assistant 消息（API Key 未配置、ToolRegistry 未初始化、Provider 创建失败、流式错误、异常捕获）

### 附属优化：工具调用折叠渲染

> **目标：** 工具调用以可折叠块展示，默认只显示工具名，展开查看参数和结果
>
> **日期：** 2026-05-13
>
> **变更记录：** [tool-call-collapsible-rendering.md](docs/changes/tool-call-collapsible-rendering.md)

- [x] ChatRow 新增 `groupContentBlocks` — 将 content 按顺序分组，`tool_use` + `tool_result`（含文本格式 `[工具 xxx 执行完成: ...]`）配对为独立折叠块
- [x] ToolCallBlock 改为折叠式 — 默认仅显示 `🔧 工具名`，点击展开显示格式化 JSON 参数 + 执行结果
- [x] 文本工具结果自动识别 — agentStore 写入的 `[工具 xxx 执行完成/执行失败: ...]` 文本块被提取并归入对应工具块，不再作为普通文本展示
- [x] CSS 适配 — 折叠按钮风格与 ThinkingBlock 统一，展开区域左侧绿色边线，错误结果红色高亮

---

## Phase 4：Skill 系统

> **目标：** 用户可通过 skill 触发写作辅助功能（续写/润色/大纲/角色提取）
>
> **依赖：** Phase 3 (ToolRegistry + AgentLoop) + Phase 2.5 (路径体系)

- [ ] **4.1** Skill 类型定义
  - Create: `src/domain/types/skill.ts` — SkillDefinition, SkillSource

- [ ] **4.2** Skill 加载引擎
  - Create: `src/infrastructure/skills/SkillLoader.ts`
  - 三级加载：内置 → 用户级(`~/.superauthor/skills/`) → 书籍级(`{book}/.super-author/skills/`)
  - 路径通过 ConfigService 解析

- [ ] **4.3** Skill 匹配逻辑
  - Create: `src/infrastructure/skills/SkillMatcher.ts`
  - 根据用户输入的语义和 skill 的 whenToUse 描述匹配

- [ ] **4.4** 内置 Skill 定义
  - Create: `src/infrastructure/skills/builtin/continue-writing.md`（续写）
  - Create: `src/infrastructure/skills/builtin/polish.md`（润色）
  - Create: `src/infrastructure/skills/builtin/generate-outline.md`（大纲生成）
  - Create: `src/infrastructure/skills/builtin/extract-characters.md`（角色提取）
  - 格式：YAML frontmatter + Markdown 正文（提示词）

- [ ] **4.5** Skill Manager UI
  - Create: `src/presentation/components/SkillManager.tsx`（查看/启用/禁用）
  - Create: `src/presentation/components/SkillEditor.tsx`（编辑用户级 skill）
  - AgentInput 集成 skill 快捷按钮

- [ ] **4.6** Phase 4 测试
  - Create: `tests/infrastructure/SkillLoader.test.ts`
  - Create: `tests/infrastructure/SkillMatcher.test.ts`

---

## Phase 5：MCP 集成

> **目标：** 可连接 web search 等 MCP server
>
> **依赖：** Phase 3 (ToolRegistry)

- [ ] **5.1** MCP Client（从 cline 搬运 + 适配）
  - Create: `src/infrastructure/mcp/McpHub.ts`
  - Create: `src/infrastructure/mcp/McpClient.ts`
  - Create: `src/infrastructure/mcp/McpTypes.ts`

- [ ] **5.2** MCP 工具自动注册
  - McpHub.connect → discoverTools → ToolRegistry.register

- [ ] **5.3** MCP 配置界面
  - Create: `src/presentation/components/McpConfig.tsx`

- [ ] **5.4** Phase 5 测试
  - Create: `tests/infrastructure/McpHub.test.ts`

---

## Phase 6：高级功能 & 打磨

> **依赖：** Phase 3 完整

- [ ] **6.1** 划词备注系统
- [ ] **6.2** 角色管理 & 关系可视化
  - 角色文件路径基于 `ConfigService` 解析 → `{book}/characters/`
- [ ] **6.3** 写作目标追踪
- [ ] **6.4** 章节修订历史
- [ ] **6.5** 应用设置页面
  - ⚠️ 通用设置（Theme、快捷键）可复用 SettingsPanel 结构
- [ ] **6.6** 性能优化
- [ ] **6.7** 最终集成测试 + E2E

---

## 实施路线图

```
Phase 2        ✅
Phase 2.5      ✅  文件资源管理器 + 统一数据目录（已归档 2026-05-11）
Phase 3a       ✅  基础设施（类型 + Provider）
Phase 3b       ✅  工具系统
Phase 3c       ✅  Agent 核心循环
Phase 3d       ✅  UI + 持久化
Phase 3e       ✅  集成测试
Move Config   ✅  设置面板 + 命令系统（与 Phase 3 并行/衔接）
Virtual List  ✅  Agent 消息列表虚拟化
Icon + History ✅  Agent 图标化 & 历史记录
Phase 4        □  Skill 系统
Phase 5        □  MCP 集成
Phase 6        □  高级功能 & 打磨
```

**当前状态：** Phase 3 完整通过（含附属 Change + 优化），Phase 4 待启动。
