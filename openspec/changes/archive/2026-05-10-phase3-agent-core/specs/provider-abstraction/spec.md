## ADDED Requirements

### Requirement: IProvider 接口
系统 SHALL 定义 IProvider 接口，包含 `id`、`model` 只读属性和 `createMessage(systemPrompt, messages, tools, signal)` 方法，返回 `AsyncGenerator<AgentStreamEvent>`。

#### Scenario: Claude Provider 实现接口
- **WHEN** 实例化 ClaudeProvider
- **THEN** 实例满足 IProvider 接口契约

#### Scenario: OpenAI Provider 实现接口
- **WHEN** 实例化 OpenAIProvider
- **THEN** 实例满足 IProvider 接口契约

### Requirement: ClaudeProvider 流式事件映射
ClaudeProvider SHALL 使用 `@anthropic-ai/sdk` 的 `messages.create({ stream: true })` 发起请求，将 Anthropic ContentBlockStart/Delta/Stop 事件映射为 AgentStreamEvent。

#### Scenario: 文本增量映射
- **WHEN** Anthropic 返回 `content_block_delta` 事件（type: text_delta）
- **THEN** ClaudeProvider yield `{ type: 'text_delta', text: delta.text }`

#### Scenario: 工具调用开始
- **WHEN** Anthropic 返回 `content_block_start` 事件（type: tool_use）
- **THEN** ClaudeProvider yield `{ type: 'tool_call_start', id: block.id, name: block.name }`

#### Scenario: 工具调用参数增量
- **WHEN** Anthropic 返回 `content_block_delta` 事件（type: input_json_delta）
- **THEN** ClaudeProvider yield `{ type: 'tool_call_delta', id: index对应的block.id, arguments: delta.partial_json }`

#### Scenario: 工具调用完成
- **WHEN** Anthropic 返回 `content_block_stop` 事件（对应 tool_use block）
- **THEN** ClaudeProvider yield `{ type: 'tool_call_end', id, name, input: 完整JSON对象 }`

#### Scenario: thinking 增量
- **WHEN** Anthropic 返回 thinking delta 事件
- **THEN** ClaudeProvider yield `{ type: 'thinking_delta', text: delta.thinking }`

### Requirement: OpenAIProvider 流式事件映射
OpenAIProvider SHALL 使用 `openai` SDK 的 `chat.completions.create({ stream: true })` 发起请求，将 OpenAI ChatCompletionChunk 映射为 AgentStreamEvent。

#### Scenario: 文本增量映射
- **WHEN** OpenAI 返回 `choices[0].delta.content`
- **THEN** OpenAIProvider yield `{ type: 'text_delta', text: delta.content }`

#### Scenario: 工具调用开始（OpenAI）
- **WHEN** OpenAI 返回首个 `delta.tool_calls[0]` 包含 id 和 function.name
- **THEN** OpenAIProvider yield `{ type: 'tool_call_start', id, name }`

#### Scenario: 工具调用参数增量（OpenAI）
- **WHEN** OpenAI 返回 `delta.tool_calls[0].function.arguments`（JSON 字符串片段）
- **THEN** OpenAIProvider yield `{ type: 'tool_call_delta', id, arguments: 片段 }`

#### Scenario: 工具调用完成（OpenAI）
- **WHEN** OpenAI 返回 `finish_reason: 'tool_calls'` 的 chunk
- **THEN** OpenAIProvider 将累积的 arguments JSON 字符串解析为对象，yield `{ type: 'tool_call_end', id, name, input }`

#### Scenario: 消息格式转换
- **WHEN** OpenAIProvider 构建 API 请求
- **THEN** 将 AgentMessage[] 转换为 `[{ role, content: string }]` 格式（提取 text 类型 content block）

### Requirement: Provider 工厂
`createProvider(config)` SHALL 根据 `config.id` 返回对应的 IProvider 实例。支持 'claude' 和 'openai'，其他 id 抛出错误。

#### Scenario: 创建 Claude Provider
- **WHEN** 调用 `createProvider({ id: 'claude', ... })`
- **THEN** 返回 ClaudeProvider 实例

#### Scenario: 创建 OpenAI Provider
- **WHEN** 调用 `createProvider({ id: 'openai', ... })`
- **THEN** 返回 OpenAIProvider 实例

#### Scenario: 未知 Provider
- **WHEN** 调用 `createProvider({ id: 'unknown', ... })`
- **THEN** 抛出 `Error('Unknown provider: unknown')`
