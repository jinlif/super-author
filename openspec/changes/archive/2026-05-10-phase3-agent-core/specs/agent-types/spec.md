## ADDED Requirements

### Requirement: AgentMessage 统一消息类型
系统 SHALL 定义不依赖任何 AI SDK 的统一 AgentMessage 类型，包含 user/assistant/system 三种角色。UserContentBlock 支持 text 和 chapter_ref 类型，AssistantContentBlock 支持 text、tool_use 和 thinking 类型。

#### Scenario: 构造用户消息
- **WHEN** 用户输入文本 "续写下一段"
- **THEN** 系统创建 `{ role: 'user', content: [{ type: 'text', text: '续写下一段' }] }` 格式的 AgentMessage

#### Scenario: 助手回复包含工具调用
- **WHEN** AI 返回 text 和 tool_use 混合内容
- **THEN** AssistantContentBlock 数组同时包含 `{ type: 'text', text: '...' }` 和 `{ type: 'tool_use', id: 'toolu_xxx', name: 'read_chapter', input: {...} }` 块

#### Scenario: 助手回复包含思考过程
- **WHEN** AI 返回 thinking 内容块（Claude extended thinking）
- **THEN** AssistantContentBlock 包含 `{ type: 'thinking', text: '...'}` 块

### Requirement: AgentStreamEvent 统一流式事件
系统 SHALL 定义 AgentStreamEvent 联合类型，作为所有 Provider 流式输出的统一格式，包含 text_delta、tool_call_start/delta/end、thinking_delta、usage 和 error 事件类型。

#### Scenario: 流式文本增量
- **WHEN** Provider 输出文本 fragment
- **THEN** 系统生成 `{ type: 'text_delta', text: '天空' }` 事件

#### Scenario: 工具调用生命周期
- **WHEN** Provider 发起 tool_use 操作
- **THEN** 系统依次生成 tool_call_start → tool_call_delta（含 arguments JSON 片段）→ tool_call_end（含完整 input 对象）事件

#### Scenario: 流式错误
- **WHEN** Provider API 返回错误
- **THEN** 系统生成 `{ type: 'error', message: '...' }` 事件

### Requirement: AgentUIEvent 循环事件
系统 SHALL 定义 AgentUIEvent 类型作为 AgentLoop 对外暴露的事件，包含 stream_chunk、tool_executing、tool_complete、turn_start、done、error、aborted 事件。

#### Scenario: 工具执行通知
- **WHEN** AgentLoop 开始执行某个工具
- **THEN** 系统 yield `{ type: 'tool_executing', toolId: 'toolu_xxx', toolName: 'read_chapter' }` 事件

#### Scenario: Agent 循环完成
- **WHEN** AI 回复不包含工具调用，循环自然结束
- **THEN** 系统 yield `{ type: 'done' }` 事件

#### Scenario: 用户中止
- **WHEN** 用户点击中止按钮触发 AbortSignal
- **THEN** 系统 yield `{ type: 'aborted' }` 事件并退出循环

### Requirement: ToolDef 工具定义类型
系统 SHALL 定义 ToolDef 接口，包含 name、description、inputSchema（JSON Schema）、isReadOnly 和 handler 函数。ToolResult 包含 content 和可选的 structuredContent。

#### Scenario: 只读工具声明
- **WHEN** 定义 read_chapter 工具
- **THEN** `isReadOnly` 为 true，ToolExecutor 可并发执行

#### Scenario: 写入工具声明
- **WHEN** 定义 write_chapter 工具
- **THEN** `isReadOnly` 为 false，ToolExecutor 串行执行

### Requirement: ProviderConfig 配置类型
系统 SHALL 定义 ProviderConfig 类型，包含 id、name、apiKey、model 和可选的 baseUrl、maxTokens 字段。

#### Scenario: Claude Provider 配置
- **WHEN** 用户配置 Claude Provider
- **THEN** ProviderConfig 的 id 为 'claude'，model 为 'claude-sonnet-4-6'

#### Scenario: 自定义 API 端点
- **WHEN** 用户使用第三方 API 代理
- **THEN** ProviderConfig.baseUrl 指定代理地址
