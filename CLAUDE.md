# 超级作者 (Super Author)

网文写作桌面 AI Agent 应用。核心目标：提供智能续写、润色改写、大纲规划、角色/世界观管理等写作辅助能力。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 桌面壳 | Tauri v2（Rust 仅文件系统/窗口管理，不含业务逻辑） |
| 前端框架 | React 19 + TypeScript 5 SPA（WebView 中运行） |
| 编辑器 | Monaco Editor（Phase 2 集成） |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 + VS Code 暗色主题色板 |
| 状态管理 | Zustand 5 |
| AI SDK | `@anthropic-ai/sdk` + `openai`（Phase 3） |
| MCP | `@modelcontextprotocol/sdk`（Phase 5） |
| 测试 | Vitest 4 + React Testing Library |
| Lint/Format | Biome 2 |

## 架构

前端分层（依赖方向：Presentation → Application → Domain，Domain 不依赖外层）：

```
src/
├── presentation/     # React 组件，纯 UI 渲染
│   ├── layout/       # 四面板布局
│   ├── activityBar/  # 活动栏
│   ├── sidebar/      # 侧边栏
│   ├── editor/       # 编辑区（内含 tabs/）
│   └── agentPanel/   # Agent 对话面板
├── application/      # 业务逻辑，use case 编排
│   └── stores/       # Zustand stores
├── domain/           # 纯数据模型 & 接口定义
│   └── types/
└── infrastructure/   # 外部依赖实现（Phase 2+）
```

## 命令

```bash
npm run dev          # 启动 Vite 开发服务器
npm run build        # TypeScript 编译 + Vite 打包
npm run tauri dev    # Tauri 桌面应用开发模式
npm test             # 运行所有测试 (vitest run)
npm run test:watch   # 监听模式
npm run lint         # Biome 检查
npm run lint:fix     # Biome 自动修复
npm run format       # Biome 格式化
```

## 代码规范

- 语言：简体中文（注释、文档、沟通）
- 缩进：2 空格
- 引号：单引号（JSX 属性用双引号）
- 分号：不使用
- 尾逗号：全部使用
- 行宽：100
- Linter：Biome（已配置 `biome.json`）

## 开发阶段

| Phase | 目标 |
|---|---|
| Phase 1 ✅ | 项目骨架 + 四面板布局（已完成） |
| Phase 2 | 数据模型 & 本地存储（Book/Chapter CRUD + Monaco Editor） |
| Phase 3 | Agent 核心 + 多 Provider（Claude/OpenAI） |
| Phase 4 | Skill 系统（续写/润色/大纲等内置 skill） |
| Phase 5 | MCP 集成（Web Search 等第三方工具） |
| Phase 6 | 高级功能（划词备注、角色可视化、写作目标、修订历史） |

## 设计参考

UI 设计规范见 [DESIGN.md](DESIGN.md)，详细设计文档见 [docs/superpowers/specs/](docs/superpowers/specs/)，实施计划见 [docs/superpowers/plans/](docs/superpowers/plans/)。

## 外部 API 参考

- [MiMo API 文档](docs/context/mimo-api.md) — 小米 MiMo 大模型 API（Anthropic/OpenAI 双格式），含 thinking 内容块回传要求
