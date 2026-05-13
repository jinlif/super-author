## Context

Phase 2 已建立书籍/章节的本地读写能力和 Monaco 编辑器集成。应用目前是纯本地编辑器。Phase 3 需要引入 AI Agent 能力，使用户能在 Chat UI 中与 AI 对话，AI 可以调用写作工具（读写章节、搜索内容、获取角色）来辅助创作。

架构约束：前端分层 `Presentation → Application → Domain`，Domain 不依赖外层。Phase 3 所有新增模块必须遵循此依赖方向。Provider 层和工具层位于 `Infrastructure` 层，Agent 循环位于 `Application` 层，Chat UI 位于 `Presentation` 层。

关键参考源码：`C:\Users\77537\Desktop\cline-main\src/` — cline 是一个 VS Code 扩展 AI 编程助手，其 Provider 抽象层、Agent 循环、工具系统已通过实战验证。

## Goals / Non-Goals

**Goals:**
- 统一的 Agent 类型系统，不依赖任何特定 AI SDK 类型
- 多 Provider 支持（Claude + OpenAI），通过统一接口抹平流式事件差异
- 6 个写作工具封装已有 BookRepository / ChapterRepository 功能
- ToolRegistry 运行时工具注册（支持后续 MCP 动态注册）
- AgentLoop AsyncGenerator 核心循环：流式 UI 友好、可取消、可测试
- SystemPrompt + ContextBuilder 构建网文写作专用上下文
- 完整的 Chat UI（消息流式渲染、工具调用展示、思考过程折叠）
- Agent 内容通过 EditorPanel 写回编辑器（已有章节直接更新、临时章节只读审阅）
- 对话历史和 Provider 配置持久化

**Non-Goals:**
- Skill 系统（Phase 4）
- MCP 集成（Phase 5）
- 高级功能（划词备注、角色可视化、写作目标、修订历史 — Phase 6）
- 权限确认机制（写作场景无需审批流）
- focus chain / compact 机制（写作对话轮次短，token 压力小）
- Hook 系统
- multi-agent / sub-agent 协调
- 移动端 / Web 端适配

## Decisions

### D1: AsyncGenerator 模式 vs Callback

**选择**: AgentLoop 使用 `AsyncGenerator<AgentUIEvent>`。

**理由**:
- 流式事件可以逐条 yield 给 UI，支持增量渲染
- `for await...of` 语法自然支持中断（`break` / `signal.abort()`）
- 无需引入 RxJS 或 EventEmitter，与 React 的 `useEffect` 清理机制完美配合
- cline 的 `initiateTaskLoop` 已验证此模式在 AI Agent 场景的可行性

**替代方案**: Callback 模式（`onEvent`, `onError`, `onDone`）——嵌套回深，取消逻辑分散。

### D2: 统一流式事件 vs 每 Provider 独立格式

**选择**: 定义 `AgentStreamEvent` 统一格式，每个 Provider 内部做映射。

**理由**:
- AgentLoop 不感知底层是 Claude 还是 OpenAI
- 切换 Provider 不影响上层逻辑
- 测试时可以用简单的 Mock Provider（直接 yield 预设事件序列）

```
Claude ContentBlockStart/Delta → AgentStreamEvent
OpenAI ChatCompletionChunk   → AgentStreamEvent
```

### D3: ToolDef isReadOnly 分类

**选择**: 每个 ToolDef 声明 `isReadOnly: boolean`，ToolExecutor 据此决定并发策略。

**理由**:
- 读操作（read_chapter, search_chapters, get_characters）无副作用，可并发执行
- 写操作（write_chapter, create_chapter）有顺序依赖，必须串行
- 比 cline 的 `StreamingToolExecutor` 更简单——写作工具均为毫秒级完成，无需流式执行

### D4: 临时章节写入模式

**选择**: `write_chapter` 支持两种模式——已有章节直接覆盖 + 临时章节（不提供 filePath 时创建）。

**理由**:
- AI 生成的续写内容用户需要审视后才能确认写入
- 临时章节在 UI 中以只读模式展示，带 [保存]/[放弃]/[修改] 审阅按钮
- 避免 AI 直接覆盖用户已有章节导致数据丢失

### D5: ModelService 集成方式

**选择**: Agent 写入内容通过 ModelService 更新编辑器，而非绕过 ModelService 直接操作 Editor。

**理由**:
- Phase 2 已建立的 ModelService（VS Code 风格 Model 管理）是内容主源
- `modelService.updateValue(filePath, content)` 更新 Model → Monaco setModel → UI 立即渲染
- 临时章节通过 `modelService.createTempModel(id, content)` 创建只读临时 Model
- 保证内容状态一致性——所有编辑器内容变更都经过 ModelService

### D6: Provider 配置存储位置

**选择**: `~/.super-author/config.json` 存 API Key 和 Provider 配置。

**理由**:
- 与书籍数据分离（书籍在项目目录，配置在用户目录）
- 开发环境 fallback 到 localStorage（WebView 沙箱隔离）
- 后续 Phase 6.5 可升级到 Tauri store plugin / 系统 keychain

### D7: 对话历史存储格式

**选择**: JSON 文件存储在 `{书籍目录}/.super-author/conversations/{id}.json`。

**理由**:
- 与书籍关联，方便按书籍管理对话
- 纯 JSON 格式，易于导出、备份、手动编辑
- 无需引入 SQLite，减少依赖
- 对话量不大（一本书几十个对话），无需数据库查询优化

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| cline 源码解耦难度 — API/Provider 层与 VSCode 扩展 API 绑定较深 | 只搬运核心逻辑（流式事件映射），用我们的接口重新包装 |
| Anthropic/OpenAI SDK 版本差异 | 统一 `AgentStreamEvent` 抹平差异，每个 Provider 独立单元测试 |
| 上下文窗口超限 — 长章节 + 多章内容可能超出模型 token 限制 | ContextBuilder 内置 token 预算管理（滑动窗口截断，优先保留当前章节） |
| API Key 安全 — 明文存储 | 开发期 localStorage + WebView 沙箱；Phase 6.5 升级系统 keychain |
| 流式渲染性能 — 快速 streaming chunk 可能触发过多 React 渲染 | AgentMessages 使用 `requestAnimationFrame` 批量合并更新 |
| 工具执行失败 — AI 生成的参数不合法 | 工具 handler 内做参数校验 + 返回 `isError: true` 触发 Agent 重新尝试 |
