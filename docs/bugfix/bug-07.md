# bug-07: MiMo 兼容 API 多轮对话返回 400 错误

## 状态

已修复

## 症状

使用 MiMo API（Anthropic 格式）进行多轮对话时，第二轮请求返回 400 错误：

```
"The reasoning_content in the thinking mode must be passed back to the API."
```

## 根因

ClaudeProvider 的 `convertMessages` 函数在处理 assistant 消息中的 `thinking` 内容块时，将其转换为 `[thinking]:` 前缀的文本块：

```ts
// 旧代码（错误）
return { type: 'text', text: `[thinking]: ${block.text}` }
```

MiMo Anthropic API 要求多轮对话中保留历史 thinking 内容块原样传回，不接受文本块替代。

## 修复

修改 [ClaudeProvider.ts](../../src/infrastructure/providers/ClaudeProvider.ts) 的 `convertMessages`，将 thinking 块映射为 Anthropic API 原生格式保留在 content 数组中：

```ts
// 新代码（正确）
if (block.type === 'thinking') {
  return { type: 'thinking', thinking: block.text ?? '' }
}
```

## 关键发现

MiMo API 同时支持 OpenAI 和 Anthropic 两种格式，thinking 内容的回传方式不同：

| API 格式 | 回传方式 |
|---|---|
| Anthropic | 在 content 数组中保留 `{ type: 'thinking', thinking: '...' }` 内容块 |
| OpenAI | assistant 消息上添加 `reasoning_content` 字段 |

## 相关文件

- [src/infrastructure/providers/ClaudeProvider.ts](../../src/infrastructure/providers/ClaudeProvider.ts)
- [docs/context/mimo-api.md](../context/mimo-api.md)
