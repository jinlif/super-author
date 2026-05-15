## ADDED Requirements

### Requirement: ConversationStore 使用 historyDir 持久化
ConversationStore SHALL 使用 `ConfigService.historyDir` 作为存储目录，将会话保存为 JSON 文件，替代当前的纯内存缓存。

#### Scenario: 保存会话到磁盘
- **WHEN** 调用 `ConversationStore.save(bookDir, conversation)`
- **THEN** 会话以 JSON 格式写入 `{historyDir}/{conversationId}.json`

#### Scenario: 从磁盘加载会话
- **WHEN** 调用 `ConversationStore.load(bookDir, id)`
- **THEN** 从 `{historyDir}/{id}.json` 读取并解析，返回 Conversation 对象

#### Scenario: 列出所有会话
- **WHEN** 调用 `ConversationStore.list(bookDir)`
- **THEN** 读取 historyDir 下所有 JSON 文件，返回 ConversationSummary 列表，按 updatedAt 降序排列

#### Scenario: 删除会话
- **WHEN** 调用 `ConversationStore.delete(bookDir, id)`
- **THEN** 删除 `{historyDir}/{id}.json` 文件

### Requirement: 应用重启后会话可恢复
会话持久化后，应用重启 SHALL 能够恢复之前的会话列表和内容。

#### Scenario: 重启后会话列表保留
- **WHEN** 用户关闭并重新打开应用
- **THEN** 会话历史列表中仍能看到之前的会话
