## Context

当前应用的模型配置非常简陋：AgentInput 底部有一个 provider bar，包含 Provider 下拉选择、model 文本输入、API Key 输入。缺少 Base URL、Context Window、Temperature、Thinking Mode 等关键配置项。Model 只能输入一个值，无法管理模型列表。

用户希望模型配置达到 Cline 级别的完整度，并增加类似 Cline 的斜杠命令系统——输入 `/` 触发建议弹窗，支持内置命令、自定义命令和后续 Skill 集成。

已有基础设施：
- `ConfigService` 读写 localStorage（`AppConfig`）
- `agentStore.setProviderConfig()` 封装配置更新 + 持久化
- `IProvider` 接口 + `ClaudeProvider` / `OpenAIProvider` 实现
- `Sidebar` 支持基于 `activeActivity` 的条件渲染
- `ActivityBar` 已有 settings 图标

## Goals / Non-Goals

**Goals:**
- 完整的 Provider 配置面板（Sidebar 中），包含：
  - Provider 选择（Claude/OpenAI）
  - API Key 管理（脱敏/编辑/显示切换）
  - Base URL 输入
  - Model 列表管理（添加/删除/编辑模型名称，当前激活高亮）
  - Max Tokens 数字输入
  - Temperature 数字输入（范围 0-2，步长 0.1）
  - Thinking Mode 开关（仅 Claude 可用）
- 通用斜杠命令系统：输入 `/`（行首或空格后）弹出 CommandSuggestions，显示匹配的命令列表
- 内置命令 `/model`：弹出 ModelPickerModal 选择模型
- 自定义命令：用户在设置中创建（名称 + 描述 + 提示词模板），选择后填入输入框
- Skill 集成预留：CommandRegistry 预留 skill 类别，Phase 4 可直接注册
- Provider API 调用传入 max_tokens、temperature、thinking 参数
- 从 AgentInput 中移除所有配置相关 UI
- 清空对话按钮迁移到 AgentPanel 头部

**Non-Goals:**
- 其他设置项（写作偏好、快捷键等）— 后续 Phase 添加
- Tauri store plugin / 系统 keychain 升级 — Phase 6.5
- 多 Provider 同时使用（每次只能激活一个 Provider）
- Model 的 token 用量/价格显示
- Skill 系统本身的实现 — Phase 4

## Decisions

### D1: 斜杠命令检测机制

**选择**: 在 AgentInput 的 onChange 和 onKeyDown 中检测输入文本：
- 如果输入以 `/` 开头（行首），或匹配正则 `(^|\s)/(\w*)$`（空格后的 `/`），显示 CommandSuggestions
- 输入过程中持续更新匹配，根据已输入字符过滤命令列表
- 用户选择命令后执行对应的 action（显式弹窗 or 填充模板文本）
- 如果输入不是 `/` 开头，正常发送消息

**理由**:
- 行首 `/` 是聊天类应用的通用模式（Slack、Discord、Cline）
- 空格后 `/` 让用户在句子中间也能触发命令
- 实时过滤减少用户查找成本

### D2: CommandRegistry 架构

**选择**: 新建 `CommandRegistry` 类管理所有命令，按类别（category）组织：

```typescript
type CommandCategory = 'builtin' | 'custom' | 'skill'

interface Command {
  name: string           // 命令名，如 "model", "clear"
  category: CommandCategory
  description: string
  prompt?: string        // 自定义命令的提示词模板
  action?: 'modal' | 'fill' | 'execute'
  modalName?: string     // 对应弹窗组件名 (action=modal)
}
```

**理由**:
- 类别区分便于 UI 中分组显示（不同类型用不同颜色/图标）
- builtin / custom / skill 三类覆盖当前和未来需求
- action 机制区分"弹窗选择"（如 `/model` → ModelPickerModal）和"填入文本"（自定义命令→填充 prompt 到输入框）

**注册流程**:
```
CommandRegistry
├── registerBuiltin()    ← 内置命令（代码硬编码）
├── registerCustom()     ← 从 AppConfig.customCommands 加载
├── registerSkill()      ← Phase 4 Skill 注册（预留）
└── search(query)        ← 模糊匹配 name + description
```

### D3: CommandSuggestions 弹窗

**选择**: 输入 `/` 时在输入框上方弹出 CommandSuggestions 浮层，类似 Cline 的提及弹窗。

**交互流程**:
1. 用户输入 `/` → 检测到命令模式 → 显示浮层
2. 浮层显示所有命令，按 category 分组（builtin / custom / skill）
3. 用户继续输入 → 实时过滤
4. 用户用键盘 ↑↓ 导航，Enter 选中，Escape 关闭
5. 选中后根据 action：
   - `modal`（如 `/model`）→ 弹出对应的 Modal 组件
   - `fill`（自定义命令）→ 将 prompt 模板填入输入框，用户可编辑后发送
   - `execute`（skill，Phase 4）→ 直接触发 skill

**UI 设计**:
```
┌─────────────────────────┐
│ 命令                      │
│ ──────── builtin ────── │
│  model    切换 AI 模型   │
│ ──────── custom ─────── │
│ 续写      续写当前段落    │
│ 润色      润色选中内容    │
│ ──────── skill ──────── │
│ 大纲      生成章节大纲    │
│ 角色      管理角色设定    │
└─────────────────────────┘
```

### D4: 自定义命令存储

**选择**: 自定义命令存储在 `AppConfig.customCommands` 数组中，与 Provider 配置同级。

```typescript
interface CustomCommand {
  name: string        // 命令名（不含 /）
  description: string // 显示在建议列表中的描述
  prompt: string      // 选择后填入输入框的提示词模板
}

// AppConfig 扩展
interface AppConfig {
  provider: ProviderConfig
  customCommands: CustomCommand[]
}
```

**理由**:
- 与 Provider 配置共用 localStorage 持久化，无需新增存储服务
- customCommands 在设置面板中管理（新增/编辑/删除）
- 通过 CommandRegistry.registerCustom() 在初始化时加载到命令系统

### D5: 设置面板 Section 布局（扩展）

```
SettingsPanel
├── ProviderSection          [Provider 选择]
├── ApiSection               [API Key + Base URL]
├── ModelSection             [模型列表管理 + 当前模型展示]
├── ParameterSection         [Max Tokens + Temperature]
├── ThinkingSection          [Thinking Mode 开关] (Claude only)
└── CustomCommandsSection    [自定义命令列表 + 新增/编辑/删除]
```

CustomCommandsSection：
- 列表显示所有自定义命令（名称 + 描述 + 提示词预览）
- 每条可编辑/删除
- 底部"添加命令"表单（name / description / prompt 三个输入）
- 添加后自动注册到 CommandRegistry

### D6: ProviderConfig 扩展 & API 调用参数传递

与之前版本一致，不变。

### D7: Thinking Mode 实现

与之前版本一致，不变。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| `/` 命令检测与正常写作内容冲突 — 用户可能写 "/" 开头的句子 | 命令模式仅当 `/` 后紧跟字母时才激活；选中命令或按 Escape 后恢复正常模式 |
| 自定义命令提示词模板过长 — 大量文本填入输入框影响编辑 | 模板填入后用户可自由编辑再发送；未来可支持"直接执行"模式 |
| 命令列表过多 — Phase 4 添加 skills 后建议列表过长 | 实时过滤 + category 分组 + 最近使用排序 |
| Thinking Mode + max_tokens 约束 | 开启 thinking 时自动调整 max_tokens 到 17000+ |
