# 超级作者 - 设计文档

## 概述

超级作者是一个面向网文写作的桌面端 AI Agent 应用。核心目标是帮助作者高效创作——提供智能续写、润色改写、大纲规划、角色/世界观管理等写作辅助能力。

- **定位**：桌面级本地应用，无后端依赖
- **用户**：网文作者
- **核心理念**：agent + 工具调用的写作助手，支持手动编辑与 AI 辅助无缝切换

---

## 一、整体架构

### 1.1 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell                     │
│  ┌───────────────────────────────────────────┐  │
│  │            WebView (前端 SPA)               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Editor  │  │  Agent   │  │ Sidebar  │  │  │
│  │  │ Panel   │  │  Panel   │  │  Panel   │  │  │
│  │  └─────────┘  └──────────┘  └──────────┘  │  │
│  │        React + TypeScript                  │  │
│  └───────────────────────────────────────────┘  │
│        │ Tauri API (invoke)                      │
│  ┌─────┴──────────────────────────────────────┐  │
│  │  Rust 层：文件系统 / 窗口管理 / 自动更新      │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- **Tauri v2**：纯壳层，Rust 侧仅提供文件读写、窗口管理、自动更新等本地能力，不含业务逻辑
- **前端**：React 19 + TypeScript SPA，所有业务逻辑在 WebView 中运行
- **纯前端无后端**：AI API 直接从客户端发出，无需后端代理
- **本地存储**：所有数据以 Markdown 文件 + JSON 元数据存储在用户本地目录

### 1.2 前端分层

依赖方向：Presentation → Application → Domain，Domain 不依赖任何外层

| 层 | 职责 | 示例 |
|---|---|---|
| **Presentation** | React 组件，纯 UI 渲染 | `EditorPanel`, `AgentChat`, `Sidebar` |
| **Application** | 业务逻辑，use case 编排 | `agent.ts`（核心循环）, `bookService.ts` |
| **Domain** | 纯数据模型 & 接口定义 | `Book`, `Chapter`, `Skill` 类型定义 |
| **Infrastructure** | 外部依赖实现 | `TauriFileSystem`, `ClaudeApiClient`, `OpenAiApiClient` |

---

## 二、Agent 核心循环

参考 claude-code-main 的 query → API → tools → loop 范式，适配写作场景：

```
用户输入（对话 / skill 调用 / 划词备注）
        │
        ▼
┌──────────────────────────────────────┐
│           上下文构建                   │
│  · 当前章节内容 + 相关角色卡            │
│  · 当前段落大纲 + 写作风格设定          │
│  · 对话历史                           │
└────────────┬─────────────────────────┘
             ▼
┌──────────────────────────────────────┐
│         API 调用（多 Provider）        │
│  · 系统提示词 + 激活的 skill prompt    │
│  · 可用工具列表：                      │
│    ├─ 内置工具（读/写章节、查角色等）    │
│    ├─ 内置 skill（续写、润色等）        │
│    └─ MCP 工具（mcp__websearch__...）  │
└────────────┬─────────────────────────┘
             ▼
         ┌───────┐
         │ 流式响应│──→ 实时写入编辑器
         └───┬───┘
             ▼
        ┌─────────┐
        │ 工具调用？│
        └────┬────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐
│ 内置  │ │ Skill│ │ MCP  │
│ 工具  │ │ 调用  │ │ 工具  │
└──┬───┘ └──┬───┘ └──┬───┘
   │        │        │
   └────────┼────────┘
            ▼
   ┌──────────────────┐
   │ 结果注入上下文     │
   │ 继续循环（如需）   │
   └──────────────────┘
```

### 2.1 与 claude-code-main 关键区别

| | claude-code-main | 超级作者 |
|---|---|---|
| 工具 | Bash/Read/Edit/Grep... | 读写章节/查询角色/搜索大纲/比对设定 |
| 上下文 | 代码文件、git diff | 章节内容、角色卡、大纲片段 |
| 输出 | 终端文本/代码 diff | 编辑器中的文字内容 |
| 中断 | 权限确认 | 内容直接写入编辑器，用户自由修改 |

### 2.2 编辑区交互

- Agent 生成的正文/计划**直接写入编辑器**（非弹窗预览），用户可立即手动编辑
- 用户**划选任意文本**（AI 生成或手写）→ 弹出备注/批注气泡 → 输入备注内容
- 备注以侧边标记或悬浮提示形式存在，不影响正文

---

## 三、Skill 系统

### 3.1 Skill 定义格式

Skill 以 Markdown 文件定义，前端 YAML frontmatter 描述元数据，正文为 skill 提示词：

```markdown
---
name: 智能续写
description: 根据当前选中位置或章节末尾，智能续写下一段内容
when_to_use: 用户要求续写、继续写、接着写下去时
allowed-tools: ReadChapter, WriteChapter, SearchCharacters, SearchOutline
argument-hint: <风格：轻松/严肃/热血等>
---

## 续写规则
1. 读取当前章节最后 500 字分析风格、节奏
2. 查询相关角色卡确保人设一致
3. 生成 200-500 字续写内容
4. 将生成内容直接写入编辑器光标位置
```

### 3.2 Skill 加载优先级

| 来源 | 路径 | 优先级 |
|---|---|---|
| 内置（bundled） | 编译在应用内 | 最低 |
| 用户级 | `~/.super-author/skills/` | 中 |
| 项目级（书籍级） | `{书籍目录}/.super-author/skills/` | 最高 |

同名 skill 按优先级覆盖，书籍级可覆盖用户级和内置。

### 3.3 Skill 生命周期

1. **注册**：启动时扫描各级目录 + 内置注册 → 去重 → 生成 Command 列表
2. **匹配**：Agent 根据 `whenToUse` + 用户输入判断是否触发
3. **调用**：加载 skill markdown 作为提示词上下文 → 注入当前写作上下文 → API 调用
4. **结果**：Agent 输出直接写入编辑器，或返回结构化结果

### 3.4 内置 Skill 规划（首批）

- `续写` — 智能续写下一段
- `润色` — 文笔润色/改写
- `大纲生成` — 根据已有内容生成章节大纲
- `角色提取` — 从章节中提取/更新角色信息
- `伏笔检查` — 检查前后设定一致性
- `灵感扩展` — 根据灵感片段扩展成正式段落

---

## 四、MCP 支持

完整实现 Model Context Protocol，支持用户连接第三方 MCP 服务器（如 web search）。

### 4.1 MCP 架构（参考 claude-code-main mcp-client）

```
┌─────────────────────────────┐
│       MCP Manager            │
│  · connect / disconnect      │
│  · discoverTools (→CoreTool) │
│  · callTool                  │
│  · 事件通知（connected,       │
│    toolsChanged, error）     │
└──────────┬──────────────────┘
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
┌──────┐┌──────┐┌──────┐
│stdio ││ SSE  ││WebSocket│
│传输   ││ 传输  ││ 传输   │
└──────┘└──────┘└──────┘
```

### 4.2 功能范围

- 支持 stdio / SSE / WebSocket 三种传输方式
- MCP 工具自动注册到 Agent 可用工具列表，命名格式 `mcp__<server>__<tool>`
- Skill 可通过 `allowed-tools` 声明依赖的 MCP 工具
- 用户在设置中配置 MCP server 连接信息
- OAuth 认证支持

---

## 五、数据模型 & 存储

### 5.1 文件结构（每本书一个目录）

```
我的小说/
├── book.json                    # 书籍元信息
├── chapters/
│   ├── 01-开篇.md
│   ├── 02-相遇.md
│   └── 03-冲突.md
├── outline/
│   ├── 主线大纲.md
│   └── 支线规划.md
├── characters/
│   ├── 张三.md                  # 角色卡
│   └── 李四.md
├── worldbuilding/
│   ├── 世界观总览.md
│   ├── 势力设定.md
│   └── 地点设定.md
├── inspirations/
│   ├── 灵感片段.md
│   └── 素材参考.md
├── .super-author/
│   ├── skills/                  # 本书级 skill（覆盖用户级）
│   └── history/                 # 对话历史
└── goals.md                     # 写作目标
```

### 5.2 核心数据模型

```typescript
// 书籍元信息
interface Book {
  id: string
  title: string
  description: string
  cover?: string              // 封面图片路径
  tags: string[]              // 题材标签
  style: string               // 写作风格描述
  directory: string           // 书籍本地根目录
  createdAt: Date
  updatedAt: Date
}

// 章节
interface Chapter {
  id: string
  bookId: string
  title: string
  content: string             // markdown 正文
  order: number               // 排序
  status: 'draft' | 'completed'
  wordCount: number
  annotations: Annotation[]   // 划词备注
  history: ChapterRevision[]  // 修订历史
  createdAt: Date
  updatedAt: Date
}

// 划词备注
interface Annotation {
  id: string
  startOffset: number         // 选中范围起点
  endOffset: number
  text: string                // 备注内容
  author: 'user' | 'agent'
  createdAt: Date
}

// 角色卡
interface Character {
  id: string
  bookId: string
  name: string
  aliases: string[]
  description: string         // 外观/性格描述
  relations: Relation[]       // 与其他角色关系
  notes: string               // 补充设定
}

// 写作目标
interface WritingGoal {
  bookId: string
  type: 'daily' | 'weekly'
  targetWords: number
  currentWords: number
  startDate: Date
  endDate: Date
}
```

### 5.3 存储原则

- 内容文件（章节、大纲、角色卡、世界观、灵感）使用 Markdown，用户可直接用外部编辑器打开
- 结构化元数据（book.json）使用 JSON
- `.super-author/` 目录存应用内部数据，用户通常无需手动操作
- Tauri Rust 层提供文件系统 API（读写文件、目录遍历、文件监听）

---

## 六、UI 布局

```
┌──────┬───────────────────────────────┬──────────┐
│ 活动栏 │       主编辑区                  │  Agent   │
│      │  ┌─ tabs ───────────────────┐  │  对话    │
│  📁  │  │ 01-开篇.md │ 张三.md │.. │  │  面板    │
│      │  ├─────────────────────────┤  │          │
│  🔍  │  │                        │  │ /续写    │
│      │  │   编辑内容              │  │ /润色    │
│  👤  │  │   (Markdown 编辑)      │  │          │
│      │  │                        │  │ > 帮我   │
│  ⚙️  │  │                        │  │   续写   │
│      │  │                        │  │   一段   │
│      │  ├─────────────────────────┤  │          │
│      │  │ 状态栏：字数 │ 大纲提示  │  │          │
│      │  └─────────────────────────┘  │          │
└──────┴───────────────────────────────┴──────────┘
```

### 6.1 区域说明

| 区域 | 内容 |
|---|---|
| **活动栏** | 垂直图标栏：文件浏览、搜索、角色管理、设置 |
| **侧边栏** | 展开后显示书籍/章节树、大纲导航、角色列表等 |
| **主编辑区** | Markdown 编辑器（Monaco），标签页管理，划词备注 |
| **Agent 面板** | 对话式交互 + 常用 skill 快捷按钮，可调整大小/折叠 |

### 6.2 交互特性

- Agent 面板可拖拽到右侧、底部、或独立窗口
- 侧边栏和 Agent 面板均可折叠，专注写作时只留编辑器
- 划词后弹出浮窗：可加备注/调用 skill（续写/润色/查角色）

---

## 七、技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| **桌面壳** | Tauri v2 | Rust 层做文件系统、窗口、自动更新 |
| **前端框架** | React 19 + TypeScript | SPA，运行在 WebView 中 |
| **编辑器** | Monaco Editor | VS Code 同款，支持 Markdown 高亮、划词、diff、多标签 |
| **构建** | Vite | 前端打包 |
| **AI SDK** | `@anthropic-ai/sdk` + `openai` | 多 provider 对接 |
| **MCP** | `@modelcontextprotocol/sdk` | MCP client 实现 |
| **样式** | Tailwind CSS | VS Code 风格 UI |
| **状态管理** | Zustand | 轻量，各面板独立 store |
| **文件存储** | Tauri FS API + Markdown 文件 | 本地文件系统读写 |
| **测试** | Vitest (前端) + Rust test (Tauri 侧) | — |
| **Lint** | Biome (TS) | — |

---

## 八、多模型 Provider

支持用户自备 API Key，支持多家 AI 提供商：

- **Anthropic**（Claude）- 默认，通过 `@anthropic-ai/sdk`
- **OpenAI**（GPT 系列）- 通过 `openai` SDK
- 架构预留扩展接口，后续可添加更多 provider（Gemini、DeepSeek 等）
- Provider 选择优先使用当前对话设置，其次全局设置

---

## 九、不包含的内容（明确边界）

以下功能不在当前设计范围内：
- 云端同步/备份
- 多人协作
- 付费订阅管理
- 内容发布/导出到第三方平台
- 图片/AI 绘画生成
- 语音输入
