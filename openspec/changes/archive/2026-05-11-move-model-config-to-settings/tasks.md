> **前置依赖：** `file-explorer-and-data-restructure`（Phase 2.5）需先完成。
> - ConfigService 已从 localStorage 迁移为 `~/.superauthor/config.json` 文件读写
> - Sidebar 已精简为 FileExplorer（settings 分支需添加）
> - ActivityBar 仅保留 files + settings 图标

## 1. 类型系统扩展

- [x] 1.1 在 `src/domain/types/agent.ts` 中扩展 ProviderConfig：添加 `models: string[]`、`baseUrl?: string`、`maxTokens?: number`、`temperature?: number`、`thinkingMode?: boolean`
- [x] 1.2 新建 `src/domain/types/command.ts` — 定义 CommandCategory（builtin/custom/skill）、Command（name/category/description/prompt/action）、CustomCommand（name/description/prompt）类型
- [x] 1.3 修改 `src/infrastructure/ConfigService.ts` — 扩展 AppConfig 添加 `customCommands: CustomCommand[]`；更新默认值和序列化（⚠️ 基于 Phase 2.5 的新 ConfigService，非旧 localStorage 版本）

## 2. Provider API 调用适配

- [x] 2.1 修改 `ClaudeProvider.ts`：使用 `config.maxTokens` 替代硬编码 `max_tokens: 8192`；传入 `temperature`；`thinkingMode` 时添加 `thinking: { type: "enabled", budget_tokens: 16000 }`（自动调整 max_tokens 至 17000+）
- [x] 2.2 修改 `OpenAIProvider.ts`：使用 `config.maxTokens` 替代硬编码；传入 `temperature`
- [x] 2.3 运行 `npm run build` 确保无 TypeScript 错误

## 3. CommandRegistry 命令注册中心

- [x] 3.1 新建 `src/application/agent/CommandRegistry.ts` — 命令注册中心：registerBuiltin() 注册 `/model`；registerCustom(commands[]) 从 ConfigService 加载自定义命令；search(query) 模糊匹配；getAll() 返回全量命令
- [x] 3.2 在 agentStore 或应用初始化时创建 CommandRegistry 实例，从 ConfigService 读取自定义命令

## 4. 侧边栏 Settings 集成

- [x] 4.1 在 `Sidebar.tsx` 中添加 `activeActivity === 'settings'` 分支，渲染 `<SettingsPanel />`（⚠️ Sidebar 已由 Phase 2.5 简化，仅需添加 settings 分支）
- [x] 4.2 新建 `src/presentation/settings/SettingsPanel.css` — 设置面板基础样式（section 容器、分隔线、标题、输入控件暗色主题）
- [x] 4.3 新建 `src/presentation/settings/SettingsPanel.tsx` — 容器组件，按顺序渲染各 Section

## 5. 设置面板各 Section 组件

- [x] 5.1 **ProviderSection** — Provider 选择下拉框（Claude/OpenAI），切换时重置模型列表和参数为默认值
- [x] 5.2 **ApiSection** — API Key 输入（脱敏/编辑/显示切换）+ Base URL 输入
- [x] 5.3 **ModelSection** — 当前模型展示 + 模型列表（每条可删除/点击激活）+ 添加模型输入框
- [x] 5.4 **ParameterSection** — Max Tokens 数字输入 + Temperature 范围输入（0-2，step 0.1）
- [x] 5.5 **ThinkingSection** — Thinking Mode 开关（仅 Claude 可用；OpenAI 下 disabled 带提示）
- [x] 5.6 **CustomCommandsSection** — 自定义命令列表 + 添加/编辑/删除表单

## 6. AgentInput 清理 + 命令系统集成

- [x] 6.1 从 `AgentInput.tsx` 中移除整个 `.agent-provider-bar` 区域（Provider 选择器、模型输入、API Key、清空按钮）及所有关联状态/import
- [x] 6.2 在 `AgentInput.tsx` 中添加 `/` 命令检测逻辑：行首或空格后检测 `/`，激活命令模式，显示 CommandSuggestions
- [x] 6.3 从 `AgentPanel.css` 中移除 `.agent-provider-bar`、`.provider-select`、`.model-input` 等样式

## 7. CommandSuggestions 弹窗组件

- [x] 7.1 新建 `src/presentation/agentPanel/CommandSuggestions.tsx` — 命令建议弹窗（受控显示/隐藏、模糊过滤、键盘导航、category 分组、选中执行）
- [x] 7.2 新建 `src/presentation/agentPanel/CommandSuggestions.css` — 建议弹窗暗色主题样式

## 8. ModelPickerModal 弹窗组件

- [x] 8.1 新建 `src/presentation/agentPanel/ModelPickerModal.tsx` — 模型选择弹窗（模型列表渲染、点击激活、关闭逻辑）
- [x] 8.2 新建 `src/presentation/agentPanel/ModelPickerModal.css` — 弹窗暗色主题样式

## 9. AgentPanel 头部更新

- [x] 9.1 在 `AgentPanel.tsx` 头部操作栏添加清空对话按钮
- [x] 9.2 扩展 provider badge 显示 provider name + model（如 "Claude · claude-sonnet-4-20250514"）

## 10. 验证

- [x] 10.1 运行 `npm run build` 确保无编译错误
- [x] 10.2 运行 `npm test` 确保已有测试通过
- [x] 10.3 修复测试中因类型扩展导致的失败
- [x] 10.4 手动验证完整流程：点击 ⚙️ → 配置 Provider/API/模型/参数/自定义命令 → 回到 Agent → 输入 `/` 弹出建议 → `/model` 弹窗切换模型 → 自定义命令填入模板 → 发送消息使用新配置
