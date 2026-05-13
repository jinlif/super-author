## ADDED Requirements

### Requirement: Provider 配置持久化
系统 SHALL 将 Provider 配置（id、apiKey、model、baseUrl）保存到 `~/.super-author/config.json`。

#### Scenario: 保存 Provider 配置
- **WHEN** 用户设置或更新 Provider 配置
- **THEN** 系统写入 `~/.super-author/config.json` 的 `provider` 字段

#### Scenario: 应用启动加载配置
- **WHEN** 应用启动
- **THEN** 系统从 `~/.super-author/config.json` 加载 Provider 配置，恢复上次使用的 Provider 和 API Key

#### Scenario: 无配置文件
- **WHEN** `~/.super-author/config.json` 不存在（首次启动）
- **THEN** 系统使用默认配置（Provider 为 claude，model 为 claude-sonnet-4-6，apiKey 为空）

### Requirement: Provider 切换
系统 SHALL 允许用户切换 AI Provider，切换后 `agentStore.providerConfig` 更新，下次发送消息使用新 Provider。

#### Scenario: 从 Claude 切换到 OpenAI
- **WHEN** 用户在 Provider 选择器中选择 OpenAI
- **THEN** `agentStore.setProviderConfig({ id: 'openai', ... })` 被调用，配置持久化保存

#### Scenario: 流式输出中禁止切换
- **WHEN** `isStreaming` 为 true
- **THEN** Provider 选择器禁用，不允许切换

### Requirement: API Key 安全
API Key SHALL 不在日志中输出，不在 UI 中明文展示（输入框掩码显示）。

#### Scenario: 日志脱敏
- **WHEN** 系统记录 Provider 请求日志
- **THEN** API Key 部分显示为 `sk-...***...abc`（前3后3，中间掩码）

#### Scenario: UI 掩码显示
- **WHEN** 配置面板显示已保存的 API Key
- **THEN** 输入框显示 `•••••••••••abc`，默认不可见，点击切换可见性

### Requirement: 配置验证
系统 SHALL 在发送消息前验证 Provider 配置完整性。

#### Scenario: API Key 为空
- **WHEN** 用户尝试发送消息但 apiKey 为空
- **THEN** 系统弹出提示 "请先配置 API Key"，不发送请求

#### Scenario: Model 名无效
- **WHEN** providerConfig.model 为空字符串
- **THEN** 系统使用该 Provider 的默认 model
