# 待办

> **维护规则：**
>
> - 完成的任务直接删除，不归档（git history 是真相）
> - Bug 修复后：摘要写入 `docs/bugfix/bug-N.md`，从本文件删除
> - 新增任务：追加到对应 section，注明依赖关系
> - 阶段完成后：删除该阶段所有条目，更新"排队中"为"当前"

> **设计文档：**
>
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [Phase 2 设计](docs/superpowers/specs/2026-05-09-super-author-phase2-design.md)
> - [Model Service 设计](docs/superpowers/specs/2026-05-10-editor-model-service-design.md)
> - [Phase 3-6 实施计划](docs/superpowers/plans/2026-05-10-super-author-phase3-plan.md)
>
> 路线：B（Tauri + cline 核心模块）

---

## 当前：Phase 3.9

### 3.9e Provider 规范化 & Thinking Mode 全面支持

**背景**：Anthropic / OpenAI 是 API 接口规范名称，不是模型供应商。主流供应商（DeepSeek、MiMo 等）都支持这两种规范。

#### 1. Provider 重命名与类型扩展

- `ProviderConfig.id`：`'claude' | 'openai'` → `'anthropic' | 'openai'`（显示名："Anthropic Compatible" / "OpenAI Compatible"）
- 新增 `reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'` 字段
- 更新 `PROVIDER_DEFAULTS`、`agentStore` 初始化、`ConfigService` 持久化

#### 2. Thinking Mode 两种 API 规范都支持

- UI：`ThinkingSection` 移除 `providerConfig.id === 'claude'` 限制，两种 API 都显示
- 添加 `reasoningEffort` 选择器（low / medium / high / xhigh / max）
- Anthropic 格式：`{ thinking: { type: "enabled" }, output_config: { effort: "high" } }`
- OpenAI 格式：`{ reasoning_effort: "high", extra_body: { thinking: { type: "enabled" } } }`

#### 3. Provider 实现适配

- `ClaudeProvider.ts`：使用 `output_config.effort` 传入 effort 参数
- `OpenAIProvider.ts`：发送 `reasoning_effort` + `extra_body.thinking`
- 两者都处理 `reasoning_content` 响应

### 3.9f setting模型配置保存和加载功能

src\presentation\settings\SettingsPanel.tsx 目前模型配置只能被覆盖，用户可能有不同的模型设置需求。
要求，新增保存为配置按钮，需要校验baseurl/apikey 以及模型都有正确配置，校验通过弹框输入保存的name，然后在~/.super-author/config文件夹下创建configTemp.json，其中key是用户保存的名称，value需要存储baseurl/apikey/模型/thinking模式/reasoningEffort/provider/max token

### 3.9g token统计功能实现

agent面板在输入框下面新增进度条，显示当前已用token和总token

### 3.9h 删除清空会话按钮和相关功能

清空会话和新建会话实际是相同功能，去掉清空会话

### 3.9i 聊天面板内容渲染

聊天面板内容使用markdown格式渲染，由于有tool use部分，这一部分改为独立的一次会话，即思考和工具以及正文都分割开显示（相当于发了多次消息的效果）

---

## 排队中

- **Phase 4** Skill 系统（SkillLoader / SkillMatcher / 内置 Skill / SkillManager UI）
- **Phase 5** MCP 集成（McpHub / McpClient / MCP 工具自动注册）
- **Phase 6** 高级功能（划词备注、角色管理、写作目标、修订历史、应用设置、性能优化）

---

## 待优化

- 标题栏主题色与 VS Code 暗色主题对齐
- 面板拖拽调整大小
- i18n 支持

## bug

暂无
