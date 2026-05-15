## 1. 路径解析模块

- [x] 1.1 新建 `src/infrastructure/tools/resolvePath.ts`，实现 `resolvePath(inputPath, bookDir)` 函数
- [x] 1.2 新建 `tests/infrastructure/tools/resolvePath.test.ts`，覆盖空路径、相对路径、绝对路径（含内/外）、边界情况

## 2. 工具注入 resolvePath

- [x] 2.1 ListDirTool — `dirPath` 参数调用 resolvePath，空时回退 bookDir
- [x] 2.2 ReadFileTool — `filePath` 参数调用 resolvePath
- [x] 2.3 WriteFileTool — `filePath` 参数调用 resolvePath
- [x] 2.4 CreateEntryTool — `path` 参数调用 resolvePath
- [x] 2.5 DeleteEntryTool — `path` 参数调用 resolvePath
- [x] 2.6 RenameEntryTool — `oldPath` 和 `newPath` 两个参数均调用 resolvePath
- [x] 2.7 GrepTool — `searchPath` 参数调用 resolvePath，空时回退 bookDir
- [x] 2.8 DiffUpdateFileTool — `filePath` 参数调用 resolvePath
- [x] 2.9 GetFileInfoTool — `filePath` 参数调用 resolvePath
- [x] 2.10 ReplaceFileTool — `filePath` 参数调用 resolvePath
- [x] 2.11 SubAgentTool — 无需改动（已通过 context 传递 bookDir）

## 3. SystemPrompt 注入 bookDir

- [x] 3.1 `SystemPrompt.build()` 接收 bookDir 参数，在"当前书籍"段落中注入绝对路径和相对路径使用指引
- [x] 3.2 `agentStore.sendMessage` 将 `toolContext.bookDir` 传入 SystemPrompt.build()

## 4. 测试

- [x] 4.1 更新现有工具测试（`tests/infrastructure/tools.test.ts`），验证 resolvePath 行为
- [x] 4.2 新增越权路径拒绝测试：绝对路径在 bookDir 外应返回错误
- [x] 4.3 运行全部测试确认无回归
