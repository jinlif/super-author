## ADDED Requirements

### Requirement: BookMeta 包含 dirDescriptions 字段
BookMeta SHALL 扩展 `dirDescriptions: Record<string, string>` 字段，存储目录用途描述。

#### Scenario: 新建书籍时初始化默认描述
- **WHEN** 用户创建新书籍
- **THEN** book.json 中自动生成默认 dirDescriptions（chapters/ → "存放章节正文"，characters/ → "角色设定卡"，outline/ → "大纲"）

#### Scenario: 读取书籍时加载 dirDescriptions
- **WHEN** 加载书籍的 book.json
- **THEN** dirDescriptions 字段被正确解析

### Requirement: 系统目录有默认描述
系统预定义的目录（chapters/、characters/、outline/）SHALL 有不可删除的默认描述。

#### Scenario: 用户未自定义时使用默认描述
- **WHEN** dirDescriptions 中没有某个系统目录的条目
- **THEN** SystemPrompt 使用内置默认描述

### Requirement: 用户可添加自定义目录描述
用户 SHALL 能够为自定义目录添加描述。

#### Scenario: 添加自定义目录描述
- **WHEN** 用户在 UI 中为 notes/ 目录添加描述 "写作笔记"
- **THEN** book.json 的 dirDescriptions 中新增 `notes/ → "写作笔记"` 条目
