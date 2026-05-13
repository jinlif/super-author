## ADDED Requirements

### Requirement: ReadChapter 工具
系统 SHALL 提供 `read_chapter` 工具，接受 filePath 参数，返回章节完整 Markdown 内容。`isReadOnly` 为 true。

#### Scenario: 读取已有章节
- **WHEN** AI 调用 `read_chapter({ filePath: '/book/chapters/ch01.md' })`
- **THEN** 系统通过 ChapterRepository 读取并返回章节全文

#### Scenario: 章节不存在
- **WHEN** AI 调用 `read_chapter({ filePath: '/nonexistent.md' })`
- **THEN** 返回 `{ content: 'Error: ...', isError: true }`

#### Scenario: 缺少必填参数
- **WHEN** AI 调用 `read_chapter({})` 不提供 filePath
- **THEN** 返回 `{ content: 'Parameter "filePath" is required', isError: true }`

### Requirement: WriteChapter 工具
系统 SHALL 提供 `write_chapter` 工具，支持写入已有章节和创建临时章节两种模式。`isReadOnly` 为 false。

#### Scenario: 写入已有章节
- **WHEN** AI 调用 `write_chapter({ filePath: '/book/chapters/ch01.md', content: '新内容' })`
- **THEN** 系统通过 ChapterRepository 写入文件，ModelService 同步更新编辑器缓冲

#### Scenario: 创建临时章节
- **WHEN** AI 调用 `write_chapter({ title: '续写片段', content: '...' })` 不提供 filePath
- **THEN** 系统创建临时章节对象（不写入磁盘），返回 `{ content: '临时章节已创建', structuredContent: { tempChapterId, title, content, isTemporary: true } }`

#### Scenario: 内容为空
- **WHEN** AI 调用 `write_chapter({ content: '' })`
- **THEN** 返回 `{ content: 'Content cannot be empty', isError: true }`

### Requirement: SearchChapters 工具
系统 SHALL 提供 `search_chapters` 工具，接受 query 参数，在所有章节中进行全文搜索。`isReadOnly` 为 true。

#### Scenario: 全文搜索
- **WHEN** AI 调用 `search_chapters({ query: '张三' })`
- **THEN** 系统遍历所有章节，返回包含 "张三" 的章节片段（含文件名和上下文行）

#### Scenario: 无匹配结果
- **WHEN** AI 调用 `search_chapters({ query: '不存在的内容' })`
- **THEN** 返回 `{ content: '未找到匹配内容' }`，isError 为 false

### Requirement: GetCharacters 工具
系统 SHALL 提供 `get_characters` 工具，返回当前书籍的角色列表。`isReadOnly` 为 true。

#### Scenario: 获取角色列表
- **WHEN** AI 调用 `get_characters()`
- **THEN** 系统读取书籍目录下的角色文件，返回角色名称和描述列表

#### Scenario: 角色文件不存在
- **WHEN** 书籍尚无角色文件
- **THEN** 返回 `{ content: '暂无角色信息' }`

### Requirement: CreateChapter 工具
系统 SHALL 提供 `create_chapter` 工具，接受 title 和可选的 outline 参数，创建新的空章节。`isReadOnly` 为 false。

#### Scenario: 创建新章节
- **WHEN** AI 调用 `create_chapter({ title: '第三章 初遇' })`
- **THEN** 系统创建 `ch03.md` 文件（含标题），返回包含 filePath 的结果

#### Scenario: 章节名包含非法字符
- **WHEN** AI 调用 `create_chapter({ title: '第三章/初遇' })`
- **THEN** 系统自动清理文件名非法字符后创建

### Requirement: ReadOutline 工具
系统 SHALL 提供 `read_outline` 工具，读取当前书籍的大纲文件。`isReadOnly` 为 true。

#### Scenario: 读取大纲
- **WHEN** AI 调用 `read_outline()`
- **THEN** 系统读取书籍目录下的大纲文件（outline.md），返回完整内容

#### Scenario: 大纲文件不存在
- **WHEN** 书籍无大纲文件
- **THEN** 返回 `{ content: '暂无大纲文件' }`
