# 当前文件是待解决bug备忘录

> bug完成后，请把完成摘要信息保存到docs\bugfix目录下，文件名为bug索引编号（以bug-[number]格式，number递增），并且在相关bug上添加索引

- [x] bug-01 openspec file-explorer-and-data-restructure 引入，删除卷或者md文件，目录树没同步更改，同时如果删除了正在打开的md，对应窗口需要关闭

- [x] bug-02 src\presentation\fileExplorer\FileExplorer.tsx组件右键打开了交互菜单时，左键目录或md文件不会关闭菜单，只有左键空白地方才会关闭。

- [x] bug-03 agentStore.init() 未在应用启动时调用，导致本地保存的 ProviderConfig 不会加载

- [x] bug-04 使用 agent 发送消息时显示 "ToolRegistry 未初始化"（根因：ToolRegistry 从未在生产代码中创建和注册工具，已在 agentStore 添加 initRegistry 方法并在 BookSelector 打开书籍时调用）

- [x] bug-05 Agent 响应渲染与 AgentLoop 请求修复（根因：Provider→AgentLoop→Store 三层管道数据逐层丢失/格式错误）
  - thinking_delta 事件在 AgentLoop 中被静默丢弃，UI 永远收不到思考内容
  - ClaudeProvider tool_call_end yield 空 name，导致 tool_use 块 name 为空
  - tool result 以纯 text 块发送，Anthropic API 要求 tool_result 格式且需 tool_use_id 关联
  - agentStore 仅在 stream_chunk 时创建 assistant 消息，tool-only 轮次无消息载体
  - agentStore stream_chunk 浅拷贝导致对象 mutation

- [x] bug-06 OpenAI reasoning 模型（o1/o3）返回 400 错误（根因：reasoning_content 未传回 API）
  - OpenAI reasoning 模型流式响应通过 `delta.reasoning_content` 返回推理内容，代码未捕获
  - assistant 消息中的 thinking 块未转换为 `reasoning_content` 字段传回 API
  - 修复：OpenAIProvider 捕获 `reasoning_content` 为 `thinking_delta` 事件，`convertMessages` 将 thinking 块转为 `reasoning_content` 字段

- [x] bug-07 MiMo 等兼容 API 多轮对话返回 400 错误（根因：ClaudeProvider 未保留 thinking 内容块）
  - MiMo Anthropic API 要求多轮对话中保留历史 thinking 内容块原样传回
  - ClaudeProvider 的 `convertMessages` 把 thinking 块转成了 `[thinking]:` 前缀文本块，API 无法识别
  - 修复：ClaudeProvider 将 thinking 块映射为 `{ type: 'thinking', thinking: '...' }` 格式保留在 content 数组中
  - 参考文档：[MiMo API 文档](docs/context/mimo-api.md)
