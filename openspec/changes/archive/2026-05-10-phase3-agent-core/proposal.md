## Why

当前超级作者应用已具备书籍/章节的本地读写和 Monaco 编辑能力（Phase 2），但缺乏 AI 智能写作辅助功能——用户无法在编辑器内直接与 AI 对话、让 AI 读取章节后生成续写或润色内容。本变更将建立 Agent 核心系统，使应用从"本地编辑器"升级为"AI 写作 Agent"。

## What Changes

- 新增 Agent 领域类型系统（AgentMessage、AgentStreamEvent、ToolDef 等）
- 新增多 Provider 支持（Claude + OpenAI），通过统一接口抹平 SDK 差异
- 新增 6 个写作工具（read/write/search chapters、get characters、create chapter、read outline），封装已有 BookRepository/ChapterRepository
- 新增 ToolRegistry 工具注册中心，支持运行时注册/查询工具
- 新增 AgentLoop 核心循环（AsyncGenerator 模式），协调 Provider 调用与工具执行
- 新增 SystemPrompt 构建器（网文写作场景专用提示词）
- 新增 ContextBuilder（智能上下文收集与 token 预算管理）
- 新增 ToolExecutor（读写操作分类执行，读并发、写串行）
- 新增 AgentStore（Zustand store，管理会话状态与 Provider 配置）
- 重写 AgentPanel 为完整 Chat UI（消息列表/流式渲染/输入框/快捷操作）
- 修改 EditorPanel 集成 Agent 内容写入（已有章节直接更新、临时章节只读审阅）
- 新增 ConversationStore（对话历史持久化到 `.super-author/conversations/`）
- 新增 Provider 配置持久化（API Key 存储到 `~/.super-author/config.json`）

## Capabilities

### New Capabilities
- `agent-types`: Agent 领域类型定义 — AgentMessage、AgentStreamEvent、AgentUIEvent、ProviderConfig、ToolDef/ToolResult/ToolContext
- `provider-abstraction`: Provider 抽象层 — IProvider 接口 + ClaudeProvider + OpenAIProvider + 工厂函数
- `writing-tools`: 写作工具集 — ReadChapterTool、WriteChapterTool、SearchChaptersTool、GetCharactersTool、CreateChapterTool、ReadOutlineTool
- `tool-registry`: ToolRegistry 工具注册中心，支持 register/unregister/get/list/listForAPI/getReadOnlyTools
- `agent-loop`: AgentLoop 核心循环（AsyncGenerator），包含 SystemPrompt + ContextBuilder + ToolExecutor
- `agent-chat-ui`: Agent 对话面板 — AgentPanel、AgentMessages、AgentInput、ChatRow 组件
- `agent-content-writeback`: Agent 内容写入编辑器集成 — 已有章节更新 / 临时章节审阅确认流程
- `conversation-persistence`: 对话历史持久化 — ConversationStore CRUD
- `provider-config-persistence`: Provider 配置持久化 — API Key 存储与 Provider 切换

### Modified Capabilities
<!-- 无已有 spec 被修改，当前 openspec/specs/ 为空 -->

## Impact

- **新增依赖**: `@anthropic-ai/sdk`（已有声明，Phase 3 正式使用）、`openai`（OpenAI SDK）
- **新增文件**: ~25 个源文件 + ~10 个测试文件（详见 tasks.md）
- **修改文件**: `src/presentation/agentPanel/AgentPanel.tsx`（重写）、`src/presentation/editor/EditorPanel.tsx`（集成写回）
- **已有模块无破坏性变更**: 所有新增模块依赖方向为 Presentation → Application → Domain，不修改 Phase 2 已有接口
- **源码参考**: `C:\Users\77537\Desktop\cline-main\src/` — Provider 层、Agent 循环、Chat UI 参考实现
