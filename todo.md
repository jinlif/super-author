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

> 3.8 已全部完成

### 3.9c 文件操作授权 + Diff 视图 ✅

### 3.9c2 首句话调用大模型生成摘要

当前历史文件的title是以第一句话作为title来的，现在把第一句话传给大模型，让其总结摘要作为会话标题。不走agentLoop生成，独立调用。

### 3.9d SubAgent 消息独立展示

**现状：** SubAgent（`agent` 工具）在父 Agent 中执行时，其完整对话过程（thinking、tool calls、text 等）被折叠为一个工具调用块 `🔧 agent`，用户看不到子 agent 的思考过程和工具调用细节，只看到最终结果文本。

**目标：** SubAgent 的消息展示形式与主 Agent 一致，消息上方显示"SubAgent"名称而非"AI 助手"，其内部的 thinking、tool calls、text 等全部展开可见。

**方案变化（SubAgentTool → 事件透传）：**

```
当前:
  SubAgentTool 执行 AgentLoop → 只收集 finalText → 返回 tool result → 父级折叠展示

目标:
  SubAgentTool 执行 AgentLoop → 透传所有 UI 事件到父级
    → 父级 store 为 SubAgent 创建独立 assistant 消息块
    → ChatRow 检测到 source === 'sub_agent'，渲染 "SubAgent" 标签
```

- [ ] **AgentMessage 类型扩展**
  - `AgentMessage` 新增可选字段 `source?: 'main' | 'sub_agent'`
  - SubAgent 产生的消息标记 `source: 'sub_agent'`
- [ ] **SubAgentTool 改造 → 事件透传**
  - handler 不再只收集 `finalText`，而是将 AgentLoop 产生的完整 UI 事件列表暴露给调用方
  - 父 Agent 的 `tool_complete` 事件处理中，识别 sub_agent 返回的事件列表
  - 将这些事件渲染为独立的 assistant 消息（而非工具折叠块）
- [ ] **agentStore 集成 SubAgent 事件**
  - 在 `sendMessage` 的 `tool_complete` 分支中，检测 toolName === 'agent'
  - SubAgent 的 tool result 包含完整的事件列表
  - 为 SubAgent 的每条消息创建独立的 `AgentMessage`，标记 `source: 'sub_agent'`
  - 消息内容和主 agent 一样包含 text、thinking、tool_use 等块
- [ ] **ChatRow 渲染 SubAgent 消息**
  - 检测 `message.source === 'sub_agent'`，显示 `chat-label` 为 "SubAgent"（而非"AI 助手"）
  - 内容渲染与主 agent 一致（ThinkingBlock、ToolCallBlock、text 等）
- [ ] **CSS 样式**
  - 添加 `.chat-row.sub-agent` 样式
  - `.chat-label` 显示 "SubAgent"，颜色与主 agent 区分（或其他视觉差异）

### 3.9e setting模型配置保存和加载功能

src\presentation\settings\SettingsPanel.tsx 目前模型配置只能被覆盖，用户可能有不同的模型设置需求。
要求，新增保存为配置按钮，需要校验baseurl/apikey 以及模型都有正确配置，校验通过弹框输入保存的name，然后在~/.super-author/config文件夹下创建configTemp.json，其中key是用户保存的名称，value需要存储baseurl/apikey/模型/thinking模式/provider/max token

### 3.9f token统计功能实现

agent面板在输入框下面新增进度条，显示当前已用token和总token

### 3.9g 删除清空会话按钮和相关功能

清空会话和新建会话实际是相同功能，去掉清空会话

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

1. 输入框 @ 引用文件，高亮错误，并且跨行不能正确高亮，其次输入框换行位置应该支持任意地方换行。
2. 引入的文件没有添加到上下文中。参考历史会话C:\Users\77537\.superauthor\history\成为首富从当舔狗开始\conv-1779111097815.json
3. 当前识别到@符号，后面跟着的内容就会高亮，我希望维护一个当前输入框选择的文件列表(走mention选中设置值)，只有对应内容会被高亮
