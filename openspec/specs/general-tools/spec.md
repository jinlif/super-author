## ADDED Requirements

### Requirement: ReadFileTool 读取文件
ReadFileTool SHALL 读取指定路径的文件内容并返回。

#### Scenario: 读取存在的文件
- **WHEN** 调用 read_file 并传入有效 filePath
- **THEN** 返回文件完整内容

#### Scenario: 读取不存在的文件
- **WHEN** 调用 read_file 并传入不存在的 filePath
- **THEN** 返回 isError: true 的错误信息

### Requirement: ListDirTool 列出目录内容
ListDirTool SHALL 列出指定目录下的文件和子目录。

#### Scenario: 列出目录内容
- **WHEN** 调用 list_dir 并传入有效 dirPath
- **THEN** 返回目录下的文件和子目录列表（名称 + 类型）

### Requirement: CreateEntryTool 创建文件或目录
CreateEntryTool SHALL 创建新文件或目录。

#### Scenario: 创建新文件
- **WHEN** 调用 create_entry 并传入 filePath 和 content
- **THEN** 创建文件并返回成功信息

#### Scenario: 创建新目录
- **WHEN** 调用 create_entry 并传入 dirPath
- **THEN** 创建目录并返回成功信息

### Requirement: GetFileInfoTool 获取文件元信息
GetFileInfoTool SHALL 返回文件的元信息（大小、修改时间、类型）。

#### Scenario: 获取文件信息
- **WHEN** 调用 get_file_info 并传入 filePath
- **THEN** 返回文件大小、最后修改时间、是否为目录等信息

### Requirement: DeleteEntryTool 删除文件或目录
DeleteEntryTool SHALL 删除指定的文件或目录。

#### Scenario: 删除文件
- **WHEN** 调用 delete_entry 并传入 filePath
- **THEN** 删除文件并返回成功信息

### Requirement: RenameEntryTool 重命名文件或目录
RenameEntryTool SHALL 重命名文件或目录。

#### Scenario: 重命名文件
- **WHEN** 调用 rename_entry 并传入 oldPath 和 newPath
- **THEN** 重命名文件并返回成功信息

### Requirement: GrepTool 搜索文件内容
GrepTool SHALL 使用正则表达式搜索文件内容，返回匹配结果。

#### Scenario: 搜索匹配内容
- **WHEN** 调用 grep 并传入 pattern 和 searchPath
- **THEN** 返回匹配的文件路径、行号和内容

### Requirement: WriteFileTool 全量覆盖写入
WriteFileTool SHALL 全量覆盖写入文件内容。

#### Scenario: 写入文件
- **WHEN** 调用 write_file 并传入 filePath 和 content
- **THEN** 文件内容被完全覆盖为新内容

### Requirement: DiffUpdateFileTool diff 更新文件
DiffUpdateFileTool SHALL 使用 diff 算法更新文件，只修改差异部分。

#### Scenario: diff 更新文件
- **WHEN** 调用 diff_update_file 并传入 filePath 和 diff
- **THEN** 文件按照 diff 描述进行部分更新

### Requirement: ReplaceFileTool 正则替换文件内容
ReplaceFileTool SHALL 使用正则表达式替换文件内容。当正则匹配多个结果且不是 global 模式时 SHALL 报错。

#### Scenario: 正则替换单个匹配
- **WHEN** 调用 replace_file 并传入 filePath、pattern（匹配单个）、replacement
- **THEN** 替换匹配的内容

#### Scenario: 正则匹配多个且非 global 时报错
- **WHEN** 调用 replace_file 并传入 pattern 匹配多个结果且无 global flag
- **THEN** 返回 isError: true，提示匹配多个结果

#### Scenario: 正则匹配多个且 global 时全部替换
- **WHEN** 调用 replace_file 并传入 pattern 匹配多个结果且有 global flag
- **THEN** 替换所有匹配的内容

## REMOVED Requirements

### Requirement: 旧专用工具
**Reason**: 被通用工具替代
**Migration**: 使用 read_file 替代 read_chapter，write_file 替代 write_chapter，grep 替代 search_chapters，list_dir 替代 get_characters，create_entry 替代 create_chapter，read_file 替代 read_outline
