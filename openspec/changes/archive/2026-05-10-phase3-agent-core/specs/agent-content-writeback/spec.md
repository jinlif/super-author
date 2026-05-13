## ADDED Requirements

### Requirement: 已有章节直接写入
系统 SHALL 在 `write_chapter` 工具提供 filePath 时，将内容通过 ModelService 更新到编辑器中已有的 Model。

#### Scenario: Agent 写入已打开章节
- **WHEN** AI 调用 `write_chapter({ filePath: 'ch01.md', content: '续写正文...' })` 且该章节已在编辑器中打开
- **THEN** ModelService 更新该 filePath 对应 Model 的 value，Monaco 立即显示新内容，标记为 dirty

#### Scenario: Agent 写入未打开章节
- **WHEN** AI 调用 `write_chapter({ filePath: 'ch05.md', content: '...' })` 且该章节未在编辑器中打开
- **THEN** 直接通过 ChapterRepository 写入磁盘，不影响编辑器

### Requirement: 临时章节只读审阅
系统 SHALL 在 `write_chapter` 不提供 filePath（仅提供 title 和 content）时创建临时章节，在编辑器中以只读模式打开。

#### Scenario: 创建临时只读标签
- **WHEN** AI 调用 `write_chapter({ title: '续写建议', content: '正文...' })`
- **THEN** EditorPanel 新建只读标签，标题为 "AI 生成 - 待审阅: 续写建议"，内容为 AI 生成的正文

#### Scenario: 显示审阅操作按钮
- **WHEN** 临时章节标签为活跃状态
- **THEN** AgentInput 区域显示审阅按钮组：[保存到章节] [放弃] [修改（复制到输入框）]

#### Scenario: 保存临时章节
- **WHEN** 用户点击 [保存到章节]
- **THEN** 系统弹出章节选择器 → 用户选择目标章节 → 内容写入 → 临时标签关闭 → 目标章节更新

#### Scenario: 放弃临时内容
- **WHEN** 用户点击 [放弃]
- **THEN** 临时标签关闭，内容不保存

#### Scenario: 修改后重新对话
- **WHEN** 用户点击 [修改]
- **THEN** 临时章节内容复制到 AgentInput 输入框，附带 "请修改以下内容: ..." 前缀，临时标签关闭

### Requirement: 脏文件保存前合入 Agent 内容
系统 SHALL 在保存操作时，将 Agent 写入的 Model 内容通过 BookStore.saveChapter 持久化到磁盘。

#### Scenario: 保存 Agent 写入的脏文件
- **WHEN** 用户保存被 Agent 修改过的章节
- **THEN** ModelService 取当前内容 → BookStore.saveChapter 写磁盘 → ModelService.markClean
