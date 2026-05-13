## 1. Agent 类型定义

- [x] 1.1 创建 `src/domain/types/agent.ts` — AgentMessage、UserContentBlock、AssistantContentBlock、AgentStreamEvent、AgentUIEvent、ProviderConfig 类型
- [x] 1.2 创建 `src/domain/types/tool.ts` — ToolDef、ToolResult、ToolContext 类型

## 2. Provider 接口 + Claude 适配

- [x] 2.1 创建 `src/infrastructure/providers/IProvider.ts` — IProvider 接口（createMessage 返回 AsyncGenerator<AgentStreamEvent>）
- [x] 2.2 创建 `src/infrastructure/providers/ClaudeProvider.ts` — 使用 @anthropic-ai/sdk，映射 Anthropic streaming 事件为 AgentStreamEvent
- [x] 2.3 创建 `src/infrastructure/providers/OpenAIProvider.ts` — 使用 openai SDK，映射 OpenAI chat completions delta 为 AgentStreamEvent，处理 tool_calls JSON 字符串→对象转换
- [x] 2.4 创建 `src/infrastructure/providers/createProvider.ts` — 根据 ProviderConfig.id 创建对应 Provider 实例
- [x] 2.5 创建 `tests/infrastructure/ClaudeProvider.test.ts` — Mock Anthropic SDK，验证流式事件映射
- [x] 2.6 创建 `tests/infrastructure/OpenAIProvider.test.ts` — Mock OpenAI SDK，验证流式事件映射

## 3. 写作工具

- [x] 3.1 创建 `src/infrastructure/tools/ReadChapterTool.ts` — 封装 ChapterRepository.readChapter，isReadOnly: true
- [x] 3.2 创建 `src/infrastructure/tools/WriteChapterTool.ts` — 支持已有章节覆盖 + 临时章节创建，isReadOnly: false
- [x] 3.3 创建 `src/infrastructure/tools/SearchChaptersTool.ts` — 全文搜索所有章节，isReadOnly: true
- [x] 3.4 创建 `src/infrastructure/tools/GetCharactersTool.ts` — 读取角色文件，isReadOnly: true
- [x] 3.5 创建 `src/infrastructure/tools/CreateChapterTool.ts` — 创建新章节文件，isReadOnly: false
- [x] 3.6 创建 `src/infrastructure/tools/ReadOutlineTool.ts` — 读取大纲文件，isReadOnly: true
- [x] 3.7 创建 `src/application/agent/ToolRegistry.ts` — register/unregister/get/list/listForAPI/getReadOnlyTools
- [x] 3.8 创建 `tests/infrastructure/tools.test.ts` — 基于 MockFileService 测试全部 6 个工具
- [x] 3.9 创建 `tests/application/ToolRegistry.test.ts` — 测试注册/查询/注销/只读分类

## 4. Agent 核心循环

- [x] 4.1 创建 `src/application/agent/SystemPrompt.ts` — 写作专用系统提示词构建（角色定义 + 工具指南 + 写作规范 + 输出格式）
- [x] 4.2 创建 `src/application/agent/ContextBuilder.ts` — 写作上下文收集（当前章节 + 角色卡 + 大纲 + token 预算管理）
- [x] 4.3 创建 `src/application/agent/ToolExecutor.ts` — 单个工具执行封装（读并发、写串行）
- [x] 4.4 创建 `src/application/agent/AgentLoop.ts` — AsyncGenerator 核心循环（Provider 调用 → 流式输出 → 工具执行 → 反馈 → 循环）
- [x] 4.5 创建 `tests/application/SystemPrompt.test.ts` — 验证提示词包含角色定义、工具列表、上下文注入
- [x] 4.6 创建 `tests/application/ContextBuilder.test.ts` — 验证上下文收集和 token 预算裁剪
- [x] 4.7 创建 `tests/application/AgentLoop.test.ts` — 使用 Mock Provider 验证单轮/多轮/中止/最大轮次

## 5. Agent Store

- [x] 5.1 创建 `src/application/stores/agentStore.ts` — Zustand store（messages, isStreaming, currentTurn, error, providerConfig + sendMessage/abortStreaming/clearConversation/setProviderConfig/loadConversation）
- [x] 5.2 创建 `tests/stores/agentStore.test.ts` — 测试 sendMessage 调用链、abort、clearConversation

## 6. Agent Chat UI

- [x] 6.1 重写 `src/presentation/agentPanel/AgentPanel.tsx` — 完整聊天面板布局（AgentHeader + AgentMessages + AgentInput）
- [x] 6.2 创建 `src/presentation/agentPanel/AgentMessages.tsx` — 消息列表组件（流式渲染 + 自动滚动）
- [x] 6.3 创建 `src/presentation/agentPanel/AgentInput.tsx` — 输入框组件（多行自动增高 + 发送/中止按钮 + Provider 选择器）
- [x] 6.4 创建 `src/presentation/agentPanel/ChatRow.tsx` — 单条消息渲染（text → MarkdownRow / thinking → ThinkingRow / tool_use → ToolCallRow / error → ErrorRow）
- [x] 6.5 创建 `tests/presentation/AgentPanel.test.tsx` — 使用 React Testing Library 测试消息渲染和输入交互

## 7. Agent 内容写入编辑器

- [x] 7.1 修改 `src/presentation/editor/EditorPanel.tsx` — 集成 Agent 内容写回：已有章节 → ModelService.updateValue + 标记 dirty；临时章节 → 创建只读标签
- [x] 7.2 在 AgentInput 添加审阅按钮组 — [保存到章节] [放弃] [修改]（临时章节活跃时显示）

## 8. 对话历史持久化

- [x] 8.1 创建 `src/application/agent/ConversationStore.ts` — 对话 CRUD（save/load/list/delete），存储到 `{书籍目录}/.super-author/conversations/{id}.json`
- [x] 8.2 创建 `tests/application/ConversationStore.test.ts` — 测试保存/加载/列表/删除

## 9. Provider 配置持久化

- [x] 9.1 实现 Provider 配置读写 — 从 `~/.super-author/config.json` 加载/保存 provider 配置
- [x] 9.2 Provider 配置面板 — 在 AgentInput 底部添加 Provider 选择器（Claude/OpenAI 切换 + Model 选择）

## 10. Phase 3 集成测试

- [x] 10.1 创建 `tests/phase3/Phase3.test.tsx` — 端到端测试：创建书籍 → 打开章节 → 发送 "续写下一段" → Agent 调用工具 → 内容写入编辑器
