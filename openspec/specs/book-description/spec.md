## ADDED Requirements

### Requirement: 创建书籍时生成 DESCRIPTION.md
创建新书籍时 SHALL 自动生成 `DESCRIPTION.md` 文件，包含书籍简介。

#### Scenario: 新建书籍自动生成 DESCRIPTION.md
- **WHEN** 用户创建新书籍
- **THEN** 书籍根目录下生成 `DESCRIPTION.md`，内容为默认模板（书名 + 空简介）

### Requirement: DESCRIPTION.md 显示在资源管理器
DESCRIPTION.md SHALL 显示在文件资源管理器中，用户可以直接点击查看和编辑。

#### Scenario: 资源管理器中可见
- **WHEN** 用户打开书籍
- **THEN** 文件资源管理器中显示 DESCRIPTION.md 文件

#### Scenario: 用户可编辑
- **WHEN** 用户在资源管理器中点击 DESCRIPTION.md
- **THEN** 在编辑器中打开，用户可直接修改内容

### Requirement: Agent 可通过工具读写 DESCRIPTION.md
Agent SHALL 能够通过 ReadFileTool 和 WriteFileTool 读写 DESCRIPTION.md。

#### Scenario: Agent 读取 DESCRIPTION.md
- **WHEN** Agent 调用 read_file 读取 DESCRIPTION.md
- **THEN** 返回文件内容

#### Scenario: Agent 写入 DESCRIPTION.md
- **WHEN** Agent 调用 write_file 写入 DESCRIPTION.md
- **THEN** 文件内容被更新

### Requirement: 加载书籍时读取 DESCRIPTION.md
加载书籍时 SHALL 读取 `DESCRIPTION.md` 作为 description。

#### Scenario: DESCRIPTION.md 存在时读取内容
- **WHEN** 加载书籍且 DESCRIPTION.md 存在
- **THEN** 文件内容作为 description 使用

#### Scenario: DESCRIPTION.md 不存在时返回空
- **WHEN** 加载书籍且 DESCRIPTION.md 不存在
- **THEN** description 为空字符串

### Requirement: 删除 book.json 中的 description 字段
book.json SHALL 不再包含 `description` 字段，description 完全由 DESCRIPTION.md 提供。

#### Scenario: book.json 不包含 description
- **WHEN** 读取 book.json
- **THEN** 返回的 BookMeta 中没有 description 字段
