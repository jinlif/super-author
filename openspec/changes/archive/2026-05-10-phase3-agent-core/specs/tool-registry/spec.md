## ADDED Requirements

### Requirement: 工具注册与注销
ToolRegistry SHALL 提供 `register(tool: ToolDef)` 和 `unregister(name: string)` 方法管理已注册工具。

#### Scenario: 注册工具
- **WHEN** 调用 `registry.register(readChapterTool)`
- **THEN** `registry.get('read_chapter')` 返回该 ToolDef

#### Scenario: 注销工具
- **WHEN** 调用 `registry.unregister('read_chapter')`
- **THEN** `registry.get('read_chapter')` 返回 undefined

#### Scenario: 重名注册覆盖
- **WHEN** 用同名注册新工具
- **THEN** 后注册的工具覆盖先前的

### Requirement: 工具查询
ToolRegistry SHALL 提供 `get(name)`、`list()`、`listForAPI()` 和 `getReadOnlyTools()` 方法。

#### Scenario: 获取全部工具
- **WHEN** 已注册 3 个工具
- **THEN** `registry.list()` 返回长度为 3 的 ToolDef 数组

#### Scenario: 获取 API 兼容格式
- **WHEN** 调用 `registry.listForAPI()`
- **THEN** 返回数组元素包含 `{ name, description, input_schema }`（snake_case 字段名），不包含 handler 和 isReadOnly

#### Scenario: 获取只读工具
- **WHEN** 已注册 3 个只读工具 + 2 个写入工具
- **THEN** `registry.getReadOnlyTools()` 返回长度为 3 的只读工具数组
