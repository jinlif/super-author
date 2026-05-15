## 1. 数据模型变更

- [x] 1.1 BookMeta 添加 `dirDescriptions: Record<string, string>` 字段
- [x] 1.2 BookMeta 删除 `description` 字段
- [x] 1.3 agent.ts 添加 SubAgentInput 类型定义

## 2. 存储层

- [x] 2.1 ConversationStore 接入 ConfigService.historyDir，save/load/list/delete 操作持久化到磁盘
- [x] 2.2 创建书籍时自动生成空的 DESCRIPTION.md 和 AGENT.md
- [x] 2.3 加载书籍时读取 DESCRIPTION.md 作为 description
- [x] 2.4 bookStore 初始化默认 dirDescriptions（chapters/、characters/、outline/）

## 3. 系统提示词重构

- [x] 3.1 SystemPrompt.build() 重写为新签名 `(tools, bookMeta, dirDescriptions) => string`
- [x] 3.2 SystemPrompt.build() 声明章节摘要存在、存储路径和 JSON 格式约定
- [x] 3.3 SystemPrompt 新增 `buildForSubAgent(tools)` 静态方法
- [x] 3.4 删除 ContextBuilder.ts

## 4. AGENT.md 注入

- [x] 4.1 agentStore.sendMessage() 读取 AGENT.md 内容，包装为 `<system-reminder>` 标签，作为第一条 user message 插入消息列表

## 5. 通用工具实现

- [x] 5.1 实现 ReadFileTool（读取文件内容）
- [x] 5.2 实现 ListDirTool（列出目录内容）
- [x] 5.3 实现 CreateEntryTool（创建文件或目录）
- [x] 5.4 实现 GetFileInfoTool（获取文件元信息）
- [x] 5.5 实现 DeleteEntryTool（删除文件或目录）
- [x] 5.6 实现 RenameEntryTool（重命名文件或目录）
- [x] 5.7 实现 GrepTool（正则搜索文件内容）
- [x] 5.8 实现 WriteFileTool（全量覆盖写入）
- [x] 5.9 实现 DiffUpdateFileTool（diff 更新，依赖 diff.js）
- [x] 5.10 实现 ReplaceFileTool（正则替换，多匹配非 global 报错）

## 6. 工具注册与清理

- [x] 6.1 删除旧工具文件（ReadChapterTool / WriteChapterTool / SearchChaptersTool / GetCharactersTool / CreateChapterTool / ReadOutlineTool）
- [x] 6.2 agentStore.initRegistry() 注册 10 个新工具
- [x] 6.3 agentStore.sendMessage() 适配新工具的事件处理

## 7. SubAgent 实现

- [x] 7.1 创建 SubAgentTool（复用 AgentLoop，排除 agent 自身，支持 model/maxTurns 参数）
- [x] 7.2 agentStore.initRegistry() 注册 SubAgentTool

## 8. UI 适配

- [x] 8.1 文件资源管理器显示 DESCRIPTION.md 和 AGENT.md
- [x] 8.2 系统目录（chapters/、characters/、outline/、.super-author/）禁用重命名和删除
- [x] 8.3 用户可在 UI 中重命名普通目录和章节文件

## 9. 依赖与测试

- [x] 9.1 添加 diff 依赖到 package.json
- [x] 9.2 为新工具编写单元测试
- [x] 9.3 SubAgentTool 单元测试（防递归、干净上下文、模型覆盖）
