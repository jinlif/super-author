## ADDED Requirements

### Requirement: 章节摘要存储格式约定
章节摘要 SHALL 存储在 `.super-author/books/<bookname>/chapter-summaries.json`，格式为 `Record<string, string>`（chapterId → summary text）。

#### Scenario: JSON 文件格式
- **WHEN** 读取 chapter-summaries.json
- **THEN** 文件为有效的 JSON，键为 chapterId，值为摘要文本

### Requirement: 摘要通过通用工具访问
章节摘要 SHALL 通过现有的 ReadFileTool、WriteFileTool 等通用工具直接访问，不需要专用 Service。

#### Scenario: Agent 通过工具读取摘要
- **WHEN** Agent 调用 read_file 读取 `.super-author/books/<bookname>/chapter-summaries.json`
- **THEN** 返回完整的摘要 JSON 内容

#### Scenario: Agent 通过工具写入摘要
- **WHEN** Agent 调用 write_file 写入 chapter-summaries.json
- **THEN** 摘要内容被更新

### Requirement: 系统提示词约定摘要格式
系统提示词 SHALL 声明章节摘要的存在、存储路径和 JSON 格式约定。

#### Scenario: 系统提示词包含摘要声明
- **WHEN** 构建系统提示词
- **THEN** 提示词中包含"章节摘要存储在 chapter-summaries.json，格式为 {chapterId: summary}"的声明
