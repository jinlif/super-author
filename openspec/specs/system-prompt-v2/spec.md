## ADDED Requirements

### Requirement: SystemPrompt 新签名
SystemPrompt.build() SHALL 使用新签名 `(tools, bookMeta, dirDescriptions) => string`，替代当前的 `(tools, context?) => string`。

#### Scenario: 使用新签名构建系统提示词
- **WHEN** 调用 `SystemPrompt.build(tools, bookMeta, dirDescriptions)`
- **THEN** 返回包含工具列表、书籍信息、目录描述的系统提示词

### Requirement: 系统提示词声明章节摘要可访问
系统提示词 SHALL 声明章节摘要存在且可通过 CRUD 工具访问，但不注入摘要内容。

#### Scenario: 提示词包含摘要声明
- **WHEN** 构建系统提示词
- **THEN** 提示词中包含"章节摘要存储在 .super-author/books/<bookname>/chapter-summaries.json，可通过工具读取"的声明

### Requirement: 删除 ContextBuilder
ContextBuilder.ts SHALL 被删除，其职责拆分到 SystemPrompt 和工具层。

#### Scenario: ContextBuilder 文件不存在
- **WHEN** 检查 src/application/agent/ 目录
- **THEN** ContextBuilder.ts 不存在

### Requirement: buildForSubAgent 方法
SystemPrompt SHALL 提供 `buildForSubAgent(tools)` 静态方法，返回简化系统提示。

#### Scenario: SubAgent 使用简化提示
- **WHEN** 调用 `SystemPrompt.buildForSubAgent(tools)`
- **THEN** 返回通用助手提示（不含写作上下文），包含工具列表
