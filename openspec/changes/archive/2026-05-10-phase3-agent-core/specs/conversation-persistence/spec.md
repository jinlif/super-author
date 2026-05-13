## ADDED Requirements

### Requirement: 对话保存
ConversationStore SHALL 将对话数据（id、title、messages、providerId、modelId、时间戳）保存为 JSON 文件到 `{书籍目录}/.super-author/conversations/{id}.json`。

#### Scenario: 保存新对话
- **WHEN** 调用 `conversationStore.save({ id: 'uuid-1', title: '续写第一章', messages: [...], providerId: 'claude' })`
- **THEN** 系统创建 `.super-author/conversations/uuid-1.json`，内容为 JSON 序列化的对话对象

#### Scenario: 更新已有对话
- **WHEN** 对同一 id 再次调用 `save()`（追加新消息）
- **THEN** 覆盖原文件，version 递增

### Requirement: 对话加载
ConversationStore SHALL 通过 id 加载指定对话。

#### Scenario: 加载已有对话
- **WHEN** 调用 `conversationStore.load('uuid-1')`
- **THEN** 返回包含 id、messages、providerId 等字段的完整 Conversation 对象

#### Scenario: 对话不存在
- **WHEN** 调用 `conversationStore.load('nonexistent')`
- **THEN** 抛出 Error 或返回 null

### Requirement: 对话列表
ConversationStore SHALL 列出指定书籍的所有对话摘要（不含完整消息内容）。

#### Scenario: 列出对话
- **WHEN** 调用 `conversationStore.list(bookDir)`
- **THEN** 返回 ConversationSummary[]，每个包含 id、title、createdAt、updatedAt，不含 messages

### Requirement: 对话删除
ConversationStore SHALL 通过 id 删除指定对话文件。

#### Scenario: 删除对话
- **WHEN** 调用 `conversationStore.delete('uuid-1')`
- **THEN** `.super-author/conversations/uuid-1.json` 文件被删除
