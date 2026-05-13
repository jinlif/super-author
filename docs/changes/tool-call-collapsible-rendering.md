# 工具调用折叠渲染

**日期：** 2026-05-13
**类型：** UI 优化
**影响文件：** ChatRow.tsx, AgentPanel.css

---

## 背景

Agent 面板中，工具调用（如 `create_chapter`、`read_chapter`）的结果以纯文本形式混在消息流中，如 `[工具 get_characters 执行完成: 暂无角色信息]`，视觉上与 AI 回复文本混杂，不易区分。

## 变更内容

### 1. ChatRow 重构

**`groupContentBlocks` 函数** — 将 content 数组重新分组：
- `text` / `thinking` 块保持原样
- `tool_use` 块与对应的 `tool_result` 配对（通过 `id` / `tool_use_id`）
- 识别 agentStore 写入的文本格式工具结果（`[工具 xxx 执行完成/执行失败: ...]`），通过正则提取并归入对应工具块，跳过独立渲染

**`ToolCallBlock` 组件** — 改为折叠式：
- 默认状态：仅显示 `🔧 工具名` 一行按钮
- 展开状态：格式化 JSON 参数（灰色区域）+ 执行结果（深色区域）
- 无参数且无结果时箭头不显示

**`AssistantBubble` 提取** — 将助手消息渲染逻辑提取为独立组件，`useMemo` 缓存分组结果。

### 2. 样式适配

- `.tool-call-toggle` — 与 ThinkingBlock 折叠按钮风格统一（边框 + hover 高亮）
- `.tool-call-detail` — 左侧绿色边线（`#4ec9b0`，与工具名颜色呼应）
- `.tool-call-result.error` — 错误结果红色高亮（`#f48771`）
- `.tool-call-preview` — 折叠态结果预览，溢出省略

### 3. 数据流

```
agentStore tool_complete 事件
  → 推入 tool_use 块 + 文本结果块 "[工具 xxx 执行完成: ...]"
  → ChatRow groupContentBlocks 识别并配对
  → ToolCallBlock 折叠渲染
```

## 测试

全部 122 个测试通过，无新增测试（纯 UI 渲染逻辑变更）。
