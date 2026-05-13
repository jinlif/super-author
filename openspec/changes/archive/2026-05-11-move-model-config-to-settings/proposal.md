## Why

当前 AI 模型配置（仅 Provider 选择 + 模型名称 + API Key）嵌入在 Agent 对话面板底部的输入栏中，与聊天功能混杂。活动栏（ActivityBar）已有设置图标（⚙️）但未实现对应的设置视图。

需求扩展：
1. 缺少 Base URL、Context Window、Thinking Mode、Temperature 等关键配置项
2. Model 目前是单个文本输入，无法管理多个模型并快速切换
3. 需要一个通用的斜杠命令系统（参考 Cline 的输入机制）：输入 `/` 触发建议弹窗，支持内置命令、自定义命令和后续 Skill 集成
4. 自定义命令功能：用户可以在设置中创建自己的斜杠命令，绑定一段提示词模板，快速复用

将这些配置和命令系统移至独立设置面板，使 Agent 输入区保持纯粹，同时提供强大的扩展能力。

## What Changes

- 新建 `SettingsPanel` 组件，渲染在侧边栏（Sidebar）中，作为 settings activity 的视图
- **完整的 Provider 配置**：Provider 切换、API Key 管理、Base URL、Model 选择与管理（列表+激活）、Max Tokens、Temperature、Thinking Mode 开关
- **Model 列表管理**：ProviderConfig 中 models 为字符串数组，可增删改；当前激活的 model 为 `model` 字段
- **通用斜杠命令系统**：输入 `/`（行首或空格后）触发 CommandSuggestions 弹窗，显示匹配的命令列表
- **内置命令**：`/model` — 弹出模型选择弹窗（ModelPickerModal）
- **自定义命令**：用户可在设置面板中定义自己的斜杠命令（名称 + 描述 + 提示词模板），选择后自动填入 Agent 输入
- **Skill 集成预留**：Phase 4 的 skill 自动注册为斜杠命令
- 从 `AgentInput` 中移除所有 provider 配置相关 UI
- 在 `AgentPanel` 头部保留轻量 provider+model badge
- 扩展 `ProviderConfig` 类型：新增 `models`, `baseUrl`, `maxTokens`, `temperature`, `thinkingMode`
- 扩展 `AppConfig`：新增 `customCommands` 字段存储自定义命令列表
- 调整 Provider 实现（ClaudeProvider / OpenAIProvider）：在 API 调用中传入 max_tokens、temperature、thinking 等参数
- 清空对话按钮迁移到 AgentPanel 头部

## Capabilities

### New Capabilities
- `settings-panel`: 设置面板视图 — 侧边栏中渲染全局设置界面，采用 section 布局，包含完整的 Provider 配置区域和自定义命令管理区域
- `provider-config-ui`: Provider 完整配置 — Provider 选择、API Key、Base URL、Model 列表管理、Max Tokens、Temperature、Thinking Mode
- `slash-commands`: 通用斜杠命令系统 — 输入 `/` 时弹出 CommandSuggestions 建议列表，匹配内置命令、自定义命令和 skills；选择后执行对应动作（弹窗 / 填充模板 / 触发 skill）
- `custom-commands`: 自定义命令管理 — 用户在设置面板中创建/编辑/删除自定义命令，每条命令包含名称、描述、提示词模板；作为斜杠命令注册到命令系统

### Modified Capabilities
- `agent-chat-ui`: 从 Agent 输入栏移除 Provider 配置 UI，移除所有配置相关控件；添加 `/` 命令检测和 CommandSuggestions 弹窗集成
- `provider-abstraction`: IProvider 接口和 Provider 实现需支持 max_tokens、temperature、thinking 等运行时参数

## Impact

- **修改类型**: `src/domain/types/agent.ts` — ProviderConfig 添加 models、baseUrl、maxTokens、temperature、thinkingMode 字段
- **新增类型**: `src/domain/types/command.ts` — CustomCommand 类型定义（name、description、prompt）
- **修改文件**: `src/presentation/agentPanel/AgentInput.tsx` — 移除所有配置 UI，添加 `/` 命令检测 + CommandSuggestions 集成
- **修改文件**: `src/presentation/agentPanel/AgentPanel.tsx` — 头部 badge 扩展显示 model，添加清空按钮
- **修改文件**: `src/presentation/sidebar/Sidebar.tsx` — 添加 settings activity 分支
- **修改文件**: `src/infrastructure/providers/ClaudeProvider.ts` — max_tokens、temperature、thinking 参数传入 API
- **修改文件**: `src/infrastructure/providers/OpenAIProvider.ts` — max_tokens、temperature 参数传入 API
- **修改文件**: `src/infrastructure/ConfigService.ts` — 扩展 AppConfig 适应新字段 + customCommands
- **新建文件**: `src/presentation/settings/SettingsPanel.tsx` — 设置面板容器（含所有 section）
- **新建文件**: `src/presentation/settings/SettingsPanel.css` — 设置面板样式
- **新建文件**: `src/application/agent/CommandRegistry.ts` — 命令注册中心（内置命令 + 自定义命令 + skills 预留）
- **新建文件**: `src/presentation/agentPanel/CommandSuggestions.tsx` — `/` 命令建议弹窗（模糊匹配、选择执行）
- **新建文件**: `src/presentation/agentPanel/CommandSuggestions.css` — 建议弹窗样式
- **新建文件**: `src/presentation/agentPanel/ModelPickerModal.tsx` — 模型选择弹窗
- **新建文件**: `src/presentation/agentPanel/ModelPickerModal.css` — 弹窗样式
- **无破坏性变更**: agentStore.setProviderConfig 接口保持不变
