## ADDED Requirements

### Requirement: SystemPrompt 构建
SystemPrompt SHALL 构建网文写作场景专用的系统提示词，包含角色定义、写作能力说明、工具使用指南、写作规范和输出格式指南。

#### Scenario: 构建基础提示词
- **WHEN** 调用 `SystemPrompt.build(tools, context)`
- **THEN** 返回包含角色定义（"网文写作助手"）、工具列表、写作规范的完整提示词字符串

#### Scenario: 注入写作上下文
- **WHEN** 调用 `SystemPrompt.build(tools, { currentChapter: '章节内容...', characters: [...] })`
- **THEN** 提示词末尾包含当前章节内容和角色卡信息

### Requirement: ContextBuilder 上下文收集
ContextBuilder SHALL 收集当前章节内容、编辑器选区、角色卡、大纲节点和相邻章节摘要，构建写作上下文对象。

#### Scenario: 收集完整上下文
- **WHEN** 编辑器打开章节、书册有角色和大纲数据
- **THEN** `ContextBuilder.build()` 返回包含 currentChapter、relevantCharacters、activeOutline 的 WritingContext

#### Scenario: Token 预算限制
- **WHEN** 上下文总 token 超过 maxTokens 参数
- **THEN** `ContextBuilder.fitToBudget()` 按优先级裁剪：当前章节 > 角色卡 > 大纲 > 相邻章节

### Requirement: AgentLoop 核心循环
AgentLoop SHALL 实现 AsyncGenerator 模式的核心循环——调用 Provider 获取流式响应，解析工具调用，执行工具，将结果反馈给下一轮 API 调用，直到无工具调用或达到最大轮次。

#### Scenario: 单轮文本回复
- **WHEN** AI 返回纯文本（无 tool_use）
- **THEN** AgentLoop yield stream_chunk 事件 + done 事件后退出

#### Scenario: 多轮工具调用
- **WHEN** AI 第一轮调用 read_chapter，第二轮调用 write_chapter
- **THEN** AgentLoop 依次执行 read_chapter → 结果反馈 → 继续 API 调用 → 执行 write_chapter → 完成

#### Scenario: 达到最大轮次
- **WHEN** AI 连续 maxTurns 轮都返回工具调用
- **THEN** AgentLoop yield done 并退出，避免无限循环

#### Scenario: 用户中止
- **WHEN** AbortSignal 被触发
- **THEN** AgentLoop 立即 yield `{ type: 'aborted' }` 并停止所有操作

#### Scenario: 工具执行失败
- **WHEN** 工具 handler 返回 `{ isError: true }`
- **THEN** 错误结果作为 tool_result 反馈给 AI，AI 可以尝试修正

### Requirement: ToolExecutor 执行策略
ToolExecutor SHALL 根据工具的 `isReadOnly` 属性区分并发策略——读操作并发执行（Promise.all），写操作串行执行。

#### Scenario: 全部只读工具并发
- **WHEN** AI 同时调用 read_chapter 和 search_chapters
- **THEN** 两个工具通过 Promise.all 并发执行

#### Scenario: 混合读写串行
- **WHEN** AI 同时调用 read_chapter（只读）和 write_chapter（写入）
- **THEN** 所有工具串行执行，保证写入顺序正确

#### Scenario: 未知工具
- **WHEN** AI 调用 ToolRegistry 中不存在的工具名
- **THEN** ToolExecutor 返回 `{ content: '未知工具: xxx', isError: true }`
