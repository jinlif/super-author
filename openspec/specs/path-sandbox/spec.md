## ADDED Requirements

### Requirement: 统一路径解析函数
系统 SHALL 提供 `resolvePath(inputPath, bookDir)` 函数，将工具输入路径解析为 bookDir 内的绝对路径。

#### Scenario: 空路径回退到 bookDir
- **WHEN** `inputPath` 为 `undefined` 或空字符串
- **THEN** 返回 `bookDir` 本身

#### Scenario: 相对路径锚定到 bookDir
- **WHEN** `inputPath` 为相对路径（如 `chapters/第一章.md`）
- **THEN** 返回 `bookDir/chapters/第一章.md` 的标准化绝对路径

#### Scenario: 绝对路径在 bookDir 内
- **WHEN** `inputPath` 为绝对路径且位于 `bookDir` 目录下
- **THEN** 原样返回该绝对路径

#### Scenario: 绝对路径越权拒绝
- **WHEN** `inputPath` 为绝对路径但不在 `bookDir` 目录下
- **THEN** 抛出错误，消息包含 "路径越权" 和实际路径

### Requirement: 所有工具使用 resolvePath
每个文件操作工具 handler SHALL 在入口处对所有路径参数调用 `resolvePath()`。

#### Scenario: list_dir 无参数时访问书籍根目录
- **WHEN** LLM 调用 `list_dir({})` 不传 `dirPath`
- **THEN** 列出当前书籍根目录的内容

#### Scenario: read_file 使用相对路径
- **WHEN** LLM 调用 `read_file({ filePath: "outline/大纲.md" })`
- **THEN** 读取 `bookDir/outline/大纲.md` 的内容

#### Scenario: write_file 拒绝越权路径
- **WHEN** LLM 调用 `write_file({ filePath: "/etc/passwd", content: "..." })`
- **THEN** 返回错误 "路径越权: /etc/passwd 不在书籍目录内"

#### Scenario: grep 默认搜索书籍根目录
- **WHEN** LLM 调用 `grep({ pattern: "主角" })` 不传 `searchPath`
- **THEN** 在当前书籍根目录下递归搜索

### Requirement: SystemPrompt 注入书籍根目录
SystemPrompt SHALL 包含当前书籍的绝对路径，引导 LLM 使用相对路径。

#### Scenario: LLM 知道书籍根目录
- **WHEN** Agent 启动构建 SystemPrompt
- **THEN** SystemPrompt 中包含 "当前书籍根目录: {bookDir}" 和 "请使用相对于此目录的路径" 的指引

### Requirement: 子 Agent 继承路径沙箱
SubAgentTool SHALL 将父级 ToolContext（含 bookDir）传递给子 Agent，子 Agent 受相同的路径沙箱约束。

#### Scenario: 子 Agent 路径约束
- **WHEN** 父 Agent 派生子 Agent 执行任务
- **THEN** 子 Agent 的工具调用受相同的 bookDir 沙箱限制
