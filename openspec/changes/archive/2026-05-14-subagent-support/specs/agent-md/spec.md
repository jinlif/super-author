## ADDED Requirements

### Requirement: 创建书籍时生成空 AGENT.md
创建新书籍时 SHALL 在书籍根目录下生成空的 `AGENT.md` 文件。

#### Scenario: 新建书籍自动生成 AGENT.md
- **WHEN** 用户创建新书籍
- **THEN** 书籍根目录下生成空的 AGENT.md 文件

### Requirement: AGENT.md 显示在资源管理器
AGENT.md SHALL 显示在文件资源管理器中，用户可以直接点击查看和编辑。

#### Scenario: 资源管理器中可见
- **WHEN** 用户打开书籍
- **THEN** 文件资源管理器中显示 AGENT.md 文件

#### Scenario: 用户可编辑
- **WHEN** 用户在资源管理器中点击 AGENT.md
- **THEN** 在编辑器中打开，用户可直接修改内容

### Requirement: AGENT.md 内容作为第一条用户消息注入
AGENT.md 内容 SHALL 包装在 `<system-reminder>` 标签中，作为第一条用户消息插入消息列表（紧跟在系统消息之后，真实用户消息之前）。

#### Scenario: AGENT.md 有内容时注入
- **WHEN** 发送消息且 AGENT.md 包含非空内容
- **THEN** 消息列表中插入一条合成用户消息，格式为 `<system-reminder>\n# AGENT.md\n{content}\n</system-reminder>`

#### Scenario: AGENT.md 为空或不存在时跳过
- **WHEN** 发送消息且 AGENT.md 为空或不存在
- **THEN** 不插入合成消息

### Requirement: Agent 可通过工具读写 AGENT.md
Agent SHALL 能够通过 ReadFileTool 和 WriteFileTool 读写 AGENT.md。

#### Scenario: Agent 读取 AGENT.md
- **WHEN** Agent 调用 read_file 读取 AGENT.md
- **THEN** 返回文件内容

#### Scenario: Agent 写入 AGENT.md
- **WHEN** Agent 调用 write_file 写入 AGENT.md
- **THEN** 文件内容被更新
