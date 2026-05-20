# 聊天面板 Markdown 渲染 & UI 优化设计

> 日期：2026-05-20
> 状态：已批准
> 关联：Phase 3.9i - 聊天面板内容渲染

## 背景

当前聊天面板所有文本内容（包括 AI 返回的 markdown 格式内容）均以 `white-space: pre-wrap` 纯文本方式渲染。AI 返回的标题、粗体、列表、代码块、表格等 markdown 语法显示为原始源文本，可读性差。Tool use 信息使用 emoji（🔧、▶、✓ 等）而非图标组件，视觉风格不够精致。

## 目标

1. Assistant 消息的 text 块使用 markdown 完整渲染（标题、粗体、斜体、列表、代码块、表格、链接等）
2. 代码块支持语法高亮 + 一键复制
3. Tool use UI 重新设计，参考 Claude Code 风格
4. 所有 emoji 替换为 lucide-react 图标组件
5. Thinking block 样式优化

## 方案

使用 **react-markdown + remark-gfm + rehype-highlight + highlight.js**。

### 依赖

```bash
npm install react-markdown remark-gfm rehype-highlight highlight.js
```

## 组件设计

### MarkdownRenderer（新增）

路径：`src/presentation/agentPanel/MarkdownRenderer.tsx`

封装 react-markdown，提供统一的 markdown 渲染能力。

**Props：**
```ts
interface MarkdownRendererProps {
  content: string
  className?: string
}
```

**配置：**
- `remarkPlugins: [remarkGfm]` — 支持表格、任务列表、删除线、自动链接
- `rehypePlugins: [rehypeHighlight]` — 代码块语法高亮
- 自定义组件覆盖（components prop）

**自定义渲染器：**

| 元素 | 行为 |
|------|------|
| `code` | 区分 inline/block。block：外层容器带语言标签 + 复制按钮；inline：`#2d2d2d` 背景 + 圆角 |
| `a` | 链接点击调用 Tauri opener API 打开外部浏览器 |
| `table` | VS Code 暗色主题表格，带边框和 striped row |
| `blockquote` | 左侧 `3px` 竖线（`#4ec9b0`）+ `#252526` 背景 |
| `h1-h6` | 适配聊天面板：`h1` = 16px, `h2` = 14px, `h3` = 13px，加粗，下方分隔线 |
| `ul/ol` | 左侧适当缩进，列表项间距合理 |
| `hr` | `1px solid #3c3c3c` 分隔线 |
| `img` | 最大宽度 100%，圆角 |

### 代码块设计

```
┌─ python ────────────────────────── 📋 ─┐
│ def hello():                            │
│     print("world")                      │
└─────────────────────────────────────────┘
```

- 外层容器：`background: #1a1a1a`，`border-radius: 6px`，`overflow: hidden`
- 顶部栏：语言标签（`font-size: 11px`，`color: #858585`）+ 复制按钮（`ClipboardCopy` 图标）
- 代码区域：等宽字体（`font-family: 'Cascadia Code', 'Fira Code', monospace`）
- highlight.js 主题：使用 `vs2015` 或自定义暗色主题匹配 VS Code 配色
- 复制成功后按钮短暂变为 `Check` 图标（1.5s 后恢复）

### Tool Use UI 重新设计

参考 Claude Code / Cursor 的 tool use 展示风格。

**折叠态：**
```
┌──────────────────────────────────────┐
│ ▶  Wrench  read_file   src/main.ts  ✓│
└──────────────────────────────────────┘
```

- 左侧：`ChevronRight` 图标（展开时为 `ChevronDown`）+ `Wrench` 图标
- 工具名：`color: #4ec9b0`，`font-weight: 500`
- 参数摘要：截取关键参数显示为灰色小字（如文件路径、命令名等）
- 右侧状态：`Check` 图标（绿色 `#4ec9b0`）或 `X` 图标（红色 `#f48771`）
- 整行可点击展开/折叠
- 左边框 `2px solid #4ec9b0`

**展开态：**
```
┌──────────────────────────────────────┐
│ ▼  Wrench  read_file   src/main.ts  ✓│
│ ┌─ Input ─────────────────────────┐  │
│ │ { "path": "src/main.ts" }       │  │
│ └─────────────────────────────────┘  │
│ ┌─ Result ────────────────────────┐  │
│ │ (文件内容或执行结果)              │  │
│ └─────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- Input 区域：`<pre>` JSON 格式化，`background: #1a1a1a`，`border-radius: 4px`
- Result 区域：如果内容是 markdown 则用 MarkdownRenderer 渲染，否则 plain text
- Input/Result 各自有小标题标签

**参数摘要提取逻辑：**
- `read_file` → 显示 `path` 参数
- `write_file` / `edit_file` → 显示 `path` 参数
- `bash` / `execute_command` → 显示 `command` 参数（截断到 40 字符）
- 其他工具 → 显示第一个字符串参数（截断到 40 字符）
- 无参数时不显示摘要

### Thinking Block 优化

- 添加 `Brain` 图标在 toggle 按钮中
- toggle 按钮样式优化：更精致的圆角、hover 过渡效果
- 思考内容区域：保持当前灰色风格，优化左侧竖线颜色（`#555` → `#4ec9b0` 半透明）

### 图标映射

| 位置 | 当前 | 替换为 |
|------|------|--------|
| ToolCallBlock 触发器 | `🔧` | `<Wrench size={14} />` |
| ToolCallBlock 展开箭头 | `▶`/`▼` | `<ChevronRight size={14} />`/`<ChevronDown size={14} />` |
| ToolCallBlock 成功 | `✓` | `<Check size={14} />` |
| ToolCallBlock 失败 | `✗` | `<X size={14} />` |
| ThinkingBlock 箭头 | `▶`/`▼` | `<ChevronRight size={14} />`/`<ChevronDown size={14} />` |
| ThinkingBlock（新增） | — | `<Brain size={14} />` |
| 代码块复制（新增） | — | `<ClipboardCopy size={14} />` |
| 聊天标签（可选） | 纯文字 | `<User size={12} />` / `<Bot size={12} />` |

### ChatRow 修改

- **用户消息**：保持 plain text（`white-space: pre-wrap`），不渲染 markdown
- **Assistant 消息 text 块**：替换为 `<MarkdownRenderer content={g.text} />`
- **AssistantBubble**：流式输出时，streaming cursor 附加在 MarkdownRenderer 之后
- **groupContentBlocks**：逻辑不变，仅渲染层替换

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增 react-markdown, remark-gfm, rehype-highlight, highlight.js |
| `src/presentation/agentPanel/MarkdownRenderer.tsx` | 新增 | Markdown 渲染组件 |
| `src/presentation/agentPanel/ChatRow.tsx` | 修改 | 集成 MarkdownRenderer，替换 emoji 为 lucide 图标 |
| `src/presentation/agentPanel/AgentPanel.css` | 修改 | 新增 markdown 样式、优化 tool/thinking 样式 |

## 验证

1. `npm run dev` 启动应用
2. 在 Agent 面板发送消息，验证：
   - AI 返回的 markdown 内容正确渲染（标题、粗体、列表、代码块、表格）
   - 代码块有语法高亮 + 复制按钮可用
   - Tool use 折叠/展开正常，图标正确显示
   - Thinking block 图标和样式正确
   - 流式输出时 markdown 实时渲染无异常
3. `npm run lint` 通过
4. `npm test` 通过
