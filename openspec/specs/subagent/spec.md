## ADDED Requirements

### Requirement: SubAgentTool 实现 ToolDef 接口
SubAgentTool SHALL 实现标准 ToolDef 接口，可注册到 ToolRegistry。

#### Scenario: 注册到 Registry
- **WHEN** 调用 `registry.register(subAgentTool)`
- **THEN** tool 名称为 "agent"，可通过 `registry.get("agent")` 获取

### Requirement: SubAgent 获得干净上下文
SubAgent SHALL 拥有独立的消息历史，不继承主 Agent 的对话历史。

#### Scenario: SubAgent 只有 prompt 作为初始消息
- **WHEN** 主 Agent 调用 `agent({ prompt: "总结前5章" })`
- **THEN** SubAgent 的初始消息只有 `[{ role: 'user', content: [{ type: 'text', text: "总结前5章" }] }]`

### Requirement: SubAgent 工具集排除自身
SubAgent 的可用工具 SHALL 从父 Registry 复制，但排除 "agent" 工具。

#### Scenario: SubAgent 无法调用 agent 工具
- **WHEN** SubAgent 执行过程中尝试调用 agent 工具
- **THEN** 返回 "Unknown tool: agent" 错误

### Requirement: SubAgent 支持模型覆盖
SubAgentTool 输入 SHALL 支持可选的 model 参数，覆盖默认 provider 配置。

#### Scenario: 指定模型
- **WHEN** 调用 `agent({ prompt: "...", model: "haiku" })`
- **THEN** SubAgent 使用 haiku 模型执行

#### Scenario: 未指定模型
- **WHEN** 调用 `agent({ prompt: "..." })` 未传 model
- **THEN** SubAgent 使用主 Agent 的默认 provider 配置

### Requirement: SubAgent 支持最大轮次配置
SubAgentTool 输入 SHALL 支持可选的 maxTurns 参数，默认值为 5。

#### Scenario: 自定义最大轮次
- **WHEN** 调用 `agent({ prompt: "...", maxTurns: 3 })`
- **THEN** SubAgent 最多执行 3 轮

#### Scenario: 默认最大轮次
- **WHEN** 调用 `agent({ prompt: "..." })` 未传 maxTurns
- **THEN** SubAgent 最多执行 5 轮

### Requirement: SubAgent 结果返回给主 Agent
SubAgent 的最终文本结果 SHALL 作为 ToolResult 返回给主 Agent。

#### Scenario: 正常返回结果
- **WHEN** SubAgent 执行完成并输出文本
- **THEN** 返回 `{ content: "SubAgent输出文本" }`

#### Scenario: SubAgent 执行出错
- **WHEN** SubAgent 执行过程中发生错误
- **THEN** 返回 `{ content: "错误信息", isError: true }`

### Requirement: SubAgent 使用简化系统提示
SubAgent SHALL 使用 `SystemPrompt.buildForSubAgent()` 生成的简化提示，不含写作上下文。

#### Scenario: SubAgent 系统提示简洁
- **WHEN** SubAgent 启动
- **THEN** 系统提示为通用助手提示 + 工具列表，不含当前章节/角色/大纲等上下文
