# MiMo API 文档摘要

小米 MiMo 大模型开放平台 API 参考。平台同时支持 OpenAI 和 Anthropic 两种 API 格式。

> 来源：https://platform.xiaomimimo.com/docs/zh-CN/api/chat/anthropic-api
> 获取时间：2026-05-12

---

## 请求地址

| API 格式 | 地址 |
|---|---|
| Anthropic | `https://api.xiaomimimo.com/anthropic/v1/messages` |
| OpenAI | `https://api.xiaomimimo.com/v1` |

## 认证方式

支持两种认证方式（二选一）：

```
# 方式一：api-key 字段
api-key: $MIMO_API_KEY

# 方式二：Bearer Token
Authorization: Bearer $MIMO_API_KEY
```

## 可用模型

| 模型 | max_tokens 默认值 |
|---|---|
| `mimo-v2.5-pro` | 131072 |
| `mimo-v2.5` | 32768 |
| `mimo-v2-pro` | 131072 |
| `mimo-v2-omni` | 32768 |
| `mimo-v2-flash` | 65536 |

## 思考模式（Thinking）

通过 `thinking` 参数控制：

```json
{
  "thinking": {
    "type": "enabled"  // 或 "disabled"
  }
}
```

- `mimo-v2.5-pro`、`mimo-v2.5`、`mimo-v2-pro`、`mimo-v2-omni` 默认 **enabled**
- `mimo-v2-flash` 默认 **disabled**
- 思考模式下不支持自定义 `temperature`，强制使用默认值 1.0

## Anthropic API 格式要点

### 请求体结构

```json
{
  "model": "mimo-v2.5-pro",
  "max_tokens": 1024,
  "system": "系统提示词",
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "thinking": { "type": "enabled" },
  "tools": [...],
  "stream": true
}
```

### 响应内容块类型

| type | 说明 |
|---|---|
| `text` | 文本内容 |
| `thinking` | 思考过程 |
| `tool_use` | 工具调用 |

### 流式事件类型

| event | 说明 |
|---|---|
| `message_start` | 消息开始 |
| `content_block_start` | 内容块开始（含 type: text/thinking/tool_use） |
| `content_block_delta` | 内容增量（text_delta / thinking_delta / input_json_delta） |
| `content_block_stop` | 内容块结束 |
| `message_delta` | 消息级增量（stop_reason、usage） |
| `message_stop` | 消息结束 |

### 工具定义格式

```json
{
  "tools": [
    {
      "name": "tool_name",
      "description": "工具描述",
      "input_schema": {
        "type": "object",
        "properties": { ... },
        "required": [...]
      }
    }
  ]
}
```

---

## 多轮对话中 thinking 内容块的回传要求（重要）

> 来源：https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/passing-back-reasoning_content

### 要求

在思考模式下的多轮工具调用过程中，模型会在返回 `tool_use` 内容块的同时返回 `thinking` 内容块。**必须在后续每次请求的 messages 数组中保留所有历史 thinking 内容块**，否则 API 将返回 400 错误。

### Anthropic API 格式

assistant 消息的 content 数组中需保留 `thinking` 块：

```json
{
  "role": "assistant",
  "content": [
    { "type": "thinking", "thinking": "思考内容..." },
    { "type": "text", "text": "回复内容" },
    { "type": "tool_use", "id": "...", "name": "tool_name", "input": {} }
  ]
}
```

### OpenAI API 格式

assistant 消息需包含 `reasoning_content` 字段：

```json
{
  "role": "assistant",
  "reasoning_content": "思考内容...",
  "content": "回复内容",
  "tool_calls": [...]
}
```

### 错误信息

缺少 thinking/reasoning_content 时返回：

```
"The reasoning_content in the thinking mode must be passed back to the API."
```

### 受影响的模型

MiMo-V2.5-Pro、MiMo-V2.5、MiMo-V2-Pro、MiMo-V2-Omni、MiMo-V2-Flash

---

## 与 Claude 原生 API 的差异

| 特性 | Claude 原生 API | MiMo Anthropic API |
|---|---|---|
| thinking 块签名 | 需要 `signature` 字段 | 不需要 signature |
| thinking 块格式 | `{ type: "thinking", thinking: "...", signature: "..." }` | `{ type: "thinking", thinking: "..." }` |
| thinking 默认开启 | 需显式开启 | 默认 enabled（部分模型） |
| reasoning_content | 不支持 | OpenAI 格式下支持 |
