## ADDED Requirements

### Requirement: AgentPanel 聊天面板布局
AgentPanel SHALL 渲染聊天面板布局，包含 AgentHeader（标题 + 关闭按钮 + Provider 标签）、AgentMessages（消息列表）和 AgentInput（输入框 + 发送按钮）。

#### Scenario: 初始状态
- **WHEN** AgentPanel 首次渲染
- **THEN** 显示空消息列表和可用的输入框

#### Scenario: 有对话历史
- **WHEN** 加载已有对话
- **THEN** AgentMessages 显示所有历史消息，顶部显示对话标题

### Requirement: AgentMessages 流式渲染
AgentMessages SHALL 支持流式渲染——发送消息后，AI 回复逐字出现，工具调用状态实时展示。

#### Scenario: 文本流式显示
- **WHEN** AgentLoop 持续 yield text_delta 事件
- **THEN** 助手消息气泡内文字持续追加，显示闪烁光标

#### Scenario: 工具调用状态展示
- **WHEN** AgentLoop yield tool_executing 事件
- **THEN** 消息列表显示 "正在调用 read_chapter..." 状态指示器

#### Scenario: 工具完成展示
- **WHEN** AgentLoop yield tool_complete 事件
- **THEN** 工具调用行显示完成状态和结果摘要

### Requirement: ChatRow 消息行渲染
ChatRow SHALL 根据消息内容类型渲染不同组件：text 内容用 MarkdownRow（markdown 渲染）、thinking 内容用 ThinkingRow（可折叠灰色文字）、tool_use 用 ToolCallRow（工具名 + 参数摘要）、tool_result 附属在 tool_use 下方。

#### Scenario: 用户消息气泡
- **WHEN** 渲染 role 为 'user' 的消息
- **THEN** 显示右对齐的气泡，背景色为强调色

#### Scenario: 助手文本消息
- **WHEN** 渲染包含 text 块的助手消息
- **THEN** 使用 markdown 渲染（含代码块高亮）

#### Scenario: thinking 折叠
- **WHEN** 渲染包含 thinking 块的助手消息
- **THEN** 默认折叠，标题显示 "思考过程"，点击展开查看灰色文字

#### Scenario: 工具调用行
- **WHEN** 渲染包含 tool_use 块的助手消息
- **THEN** 显示工具图标 + 工具名 + 参数摘要（截断50字），下方附 tool_result

### Requirement: AgentInput 输入组件
AgentInput SHALL 提供多行文本输入框（自动增高）、发送按钮、中止按钮和 Provider 选择器。

#### Scenario: 发送消息
- **WHEN** 用户在非空输入框中按 Enter（非 Shift+Enter）
- **THEN** 调用 agentStore.sendMessage(text)

#### Scenario: 中止流式输出
- **WHEN** AI 正在流式输出中，用户点击中止按钮
- **THEN** 调用 agentStore.abortStreaming()，流式中断

#### Scenario: Shift+Enter 换行
- **WHEN** 用户按 Shift+Enter
- **THEN** 输入框插入换行符，不发送消息

#### Scenario: 流式输出时禁用发送
- **WHEN** `isStreaming` 为 true
- **THEN** 发送按钮禁用，中止按钮可见

### Requirement: AgentStore 状态管理
AgentStore SHALL 管理会话状态（messages、isStreaming、currentTurn、error、conversationId）和 Provider 配置（providerConfig），提供 sendMessage、abortStreaming、clearConversation、setProviderConfig、loadConversation 操作。

#### Scenario: sendMessage 调用链
- **WHEN** 调用 `agentStore.sendMessage('续写下一段')`
- **THEN** 依次执行 ContextBuilder.build() → SystemPrompt.build() → AgentLoop 启动 → for await 更新 messages → 流式 UI 更新

#### Scenario: 流式中止
- **WHEN** 调用 `agentStore.abortStreaming()`
- **THEN** AbortController.signal 触发，AgentLoop 中断，isStreaming 置为 false

#### Scenario: 清空对话
- **WHEN** 调用 `agentStore.clearConversation()`
- **THEN** messages 清空，conversationId 设为 null
