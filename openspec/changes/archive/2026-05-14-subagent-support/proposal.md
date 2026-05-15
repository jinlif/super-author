## Why

Phase 3 Agent 核心已完成，但当前架构存在几个问题：

1. **工具过于专用**：`read_chapter`/`write_chapter` 等工具把"章节"语义写死，AI 只能操作章节文件，无法处理角色卡、大纲、笔记等其他文件类型
2. **系统提示词耦合**：`SystemPrompt.build()` 直接注入写作上下文，缺少灵活性；`ContextBuilder` 和 `SystemPrompt` 职责重叠
3. **会话未持久化**：`ConversationStore` 使用纯内存缓存，重启丢失历史
4. **缺少子任务能力**：主 Agent 无法派生干净上下文的子任务，复杂任务容易被对话历史污染

Phase 3.8 架构重构解决以上所有问题，为 Phase 4 Skill 系统打下基础。

## What Changes

### 3.8a 数据模型 & 存储层

- `ConversationStore` 接入 `ConfigService.historyDir`，会话持久化到磁盘
- `BookMeta` 扩展 `dirDescriptions` 字段，存储目录用途描述
- 创建书籍时自动生成 `DESCRIPTION.md`，加载时读取作为 description；删除 book.json 中的 `description` 字段

### 3.8b 系统提示词重构

- `SystemPrompt` 重写，新签名 `(tools, bookMeta, dirDescriptions) => string`
- 系统提示词声明章节摘要存在（可通过 CRUD 工具访问），但不直接注入摘要内容
- 创建书籍时自动生成 `AGENT.md`，用户可自定义内容注入系统提示词；加载时读取并拼接
- 删除 `ContextBuilder`，其职责拆分到 `SystemPrompt` 和工具层

### 3.8c 工具全面重构

- 删除旧的 6 个专用工具（read_chapter / write_chapter / search_chapters / get_characters / create_chapter / read_outline）
- 实现 10 个新通用工具：
  - **目录/文件操作**：ListDir / CreateEntry / GetFileInfo / DeleteEntry / RenameEntry
  - **搜索**：Grep
  - **内容更新**：WriteFile（全量覆盖）/ DiffUpdateFile（diff 更新）/ ReplaceFile（正则替换）
  - **读取**：ReadFile
- UI 层适配：用户可在 UI 中重命名目录/章节，系统目录/文件禁用重命名和删除

### 3.8d SubAgent 支持

- 新增 `SubAgentTool`：主 Agent 调用 `agent({ prompt })` 派生子任务
- SubAgent 复用 `AgentLoop`，拥有独立上下文，工具集排除自身（防递归）
- 章节摘要系统：`ChapterSummaryService`，存储于 `.super-author/books/<bookname>/chapter-summaries.json`

## Capabilities

### New Capabilities

- `conversation-persistence`: ConversationStore 接入 ConfigService.historyDir，会话持久化到磁盘
- `dir-descriptions`: BookMeta 扩展 dirDescriptions，book.json 存储/读取，系统目录给默认描述
- `book-description`: DESCRIPTION.md 创建与读取，替代 book.json description 字段
- `system-prompt-v2`: SystemPrompt 重写，新签名，删除 ContextBuilder，声明摘要可访问
- `agent-md`: AGENT.md 用户自定义系统提示词补充文件，创建时自动生成，加载时注入
- `general-tools`: 10 个新通用文件系统工具替代旧专用工具（含三种更新策略）
- `subagent`: SubAgent 工具实现（类型定义、工具创建、系统提示、Registry 集成）
- `chapter-summary`: 章节摘要存储约定，通过通用工具访问，格式为 Record<string, string>

### Modified Capabilities

（无）

## Impact

**新建文件：**
- `src/infrastructure/tools/ReadFileTool.ts`
- `src/infrastructure/tools/ListDirTool.ts`
- `src/infrastructure/tools/CreateEntryTool.ts`
- `src/infrastructure/tools/GetFileInfoTool.ts`
- `src/infrastructure/tools/DeleteEntryTool.ts`
- `src/infrastructure/tools/RenameEntryTool.ts`
- `src/infrastructure/tools/GrepTool.ts`
- `src/infrastructure/tools/WriteFileTool.ts`
- `src/infrastructure/tools/DiffUpdateFileTool.ts`
- `src/infrastructure/tools/ReplaceFileTool.ts`
- `src/infrastructure/tools/SubAgentTool.ts`

**修改文件：**
- `src/domain/types/book.ts` — BookMeta 添加 dirDescriptions，删除 description
- `src/domain/types/agent.ts` — SubAgentInput 类型
- `src/application/agent/ConversationStore.ts` — 接入 historyDir
- `src/application/agent/SystemPrompt.ts` — 重写 + buildForSubAgent
- `src/application/stores/agentStore.ts` — 注册新工具，删除旧工具注册
- `src/application/stores/bookStore.ts` — dirDescriptions 读写，DESCRIPTION.md 处理
- `src/presentation/fileExplorer/` — 系统目录/文件禁用重命名和删除

**删除文件：**
- `src/application/agent/ContextBuilder.ts`
- `src/infrastructure/tools/ReadChapterTool.ts`
- `src/infrastructure/tools/WriteChapterTool.ts`
- `src/infrastructure/tools/SearchChaptersTool.ts`
- `src/infrastructure/tools/GetCharactersTool.ts`
- `src/infrastructure/tools/CreateChapterTool.ts`
- `src/infrastructure/tools/ReadOutlineTool.ts`

**新增依赖：** `diff`（diff.js 库，用于 DiffUpdateFileTool）
