## Context

当前 Agent 工具系统中，`ToolContext` 已包含 `bookDir` 字段（当前书籍的绝对路径），但所有 11 个工具均未使用它。工具直接将 LLM 传入的路径参数透传给 `fileService`，导致：

1. LLM 不传路径时，行为不可预测（可能回退到 CWD）
2. LLM 可以传入书籍目录外的绝对路径，无任何限制
3. LLM 不知道 bookDir 的绝对路径（SystemPrompt 中未注入）

现有工具路径参数命名不统一：`dirPath`、`filePath`、`path`、`searchPath`、`oldPath`、`newPath`。

## Goals / Non-Goals

**Goals:**
- 所有文件操作工具的路径必须锚定在 `bookDir` 内
- 提供统一的 `resolvePath()` 函数处理路径解析和沙箱校验
- SystemPrompt 中注入 bookDir 绝对路径，引导 LLM 使用相对路径
- 路径越权时返回明确错误信息

**Non-Goals:**
- 不修改 Rust 侧（src-tauri/）代码
- 不改变工具的 inputSchema（LLM 侧接口不变）
- 不实现跨书籍访问
- 不做路径规范化之外的文件内容级权限控制

## Decisions

### 1. 沙箱实现在 TypeScript 工具层，而非 Rust 层

**选择**: 在 `resolvePath()` 函数中实现路径校验

**替代方案**: 在 Rust 的 `read_dir`/`read_file` 等命令中加入路径白名单

**理由**: Rust 侧是通用文件系统抽象，不应耦合业务逻辑。沙箱约束属于工具层的业务规则，放在 TypeScript 层更合理，也便于测试。

### 2. 路径解析策略：相对路径锚定 + 绝对路径校验

`resolvePath(inputPath, bookDir)` 的行为：
- `undefined`/`""` → 返回 `bookDir`（用于 list_dir 等可空参数）
- 相对路径（不含驱动器前缀且不以 `/` 开头）→ `path.posix.join(bookDir, inputPath)`
- 绝对路径且在 bookDir 内 → 原样返回
- 绝对路径但在 bookDir 外 → 抛出错误

**替代方案**: 强制所有路径为相对路径，拒绝绝对路径

**理由**: LLM 可能从之前的工具返回值中获得绝对路径（如 readDir 返回的 entry.path），直接复用这些绝对路径是合理场景。完全拒绝绝对路径会导致不必要的报错。

### 3. resolvePath 作为独立模块，工具通过 import 引入

**选择**: 新建 `infrastructure/tools/resolvePath.ts`，每个工具文件 import 后在 handler 入口调用

**替代方案**: 在 ToolExecutor 层统一拦截处理

**理由**: 放在 ToolExecutor 层需要知道每个工具的哪个参数是路径，这需要额外的元数据声明。放在工具 handler 内部更显式、更灵活——每个工具自己决定哪些参数需要解析。

### 4. Windows 路径兼容

使用 `path.posix` 处理路径拼接和比较，因为：
- Tauri 应用中路径以 `/` 分隔（即使在 Windows 上）
- 书籍目录存储格式为 `C:/Users/...`（正斜杠）
- `path.win.resolve()` 和 `path.posix.resolve()` 行为不同，需保持一致

## Risks / Trade-offs

- **[风险] 路径比较的边界情况** → 使用 `startsWith(bookDir + "/")` 或 `startsWith(bookDir)` 做前缀匹配，需注意 `bookDir` 末尾是否有 `/`。统一 normalize 后再比较。
- **[风险] 符号链接逃逸** → 当前不处理符号链接。书籍目录内不应有指向外部的符号链接，后续可增强。
- **[权衡] LLM 仍然传绝对路径** → SystemPrompt 引导使用相对路径，但不强制。绝对路径只要在 bookDir 内就允许通过。
