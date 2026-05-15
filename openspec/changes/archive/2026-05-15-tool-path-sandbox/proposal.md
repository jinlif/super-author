## Why

Agent 工具系统中，所有 11 个文件操作工具直接使用 LLM 传入的路径参数，不与当前书籍目录（bookDir）关联。当 LLM 不传路径或传错路径时，工具会回退到进程 CWD（项目根目录），导致访问到书籍目录外的文件（如 src-tauri/）。这是一个功能缺陷，也是安全隐患——工具应该被限制在当前书籍目录内。

## What Changes

- 新增 `resolvePath()` 路径解析函数，统一处理空路径、相对路径、绝对路径的解析与沙箱校验
- 所有 11 个工具 handler 在入口处调用 `resolvePath()`，确保路径始终锚定在 bookDir 内
- SystemPrompt 中注入 bookDir 绝对路径，让 LLM 知道当前书籍根目录位置
- 无效路径（越权、不存在等）返回明确错误信息，而非静默回退

## Capabilities

### New Capabilities
- `path-sandbox`: 工具路径沙箱——限制所有文件操作工具只能访问当前书籍目录内的路径，提供统一的路径解析（resolvePath）机制

### Modified Capabilities

## Impact

- `src/infrastructure/tools/` 下全部 11 个工具文件需要修改（注入 resolvePath 调用）
- `src/application/agent/SystemPrompt.ts` 需要注入 bookDir 信息
- `src/domain/types/tool.ts` 无变化（ToolContext 已有 bookDir 字段）
- Rust 侧（src-tauri/）不需要修改，沙箱在 TypeScript 业务层实现
