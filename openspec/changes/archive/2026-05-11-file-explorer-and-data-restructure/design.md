## Context

当前系统使用可配置的 `baseDir`（默认 `/books`）存储书籍数据，侧边栏通过 `ChapterTree` 组件展示扁平的章节列表。Phase 2 预留的 `outline/` 和 `characters/` 目录在 UI 上仅有占位符，与 VS Code 风格的文件管理体验差距较大。

本次设计将数据存储固化到 `~/.superauthor/`，并将侧边栏改造为通用文件资源管理器，为后续 Phase 3（Agent）、Phase 4（Skill）、Phase 5（MCP）提供统一的文件操作入口。

## Goals / Non-Goals

**Goals:**
- 数据根目录固定为 `~/.superauthor/`，不可更改
- 侧边栏 `files` 视图从 ChapterTree 升级为递归文件资源管理器
- `chapters/` 目录支持卷（子目录）作为章节分组
- 系统目录以不同颜色/图标区分，`.super-author/` 默认折叠
- 右键上下文菜单按目录类型提供差异化操作
- 仅支持 `.md` 文件创建，禁止其他文件类型

**Non-Goals:**
- 不实现拖拽排序
- 不实现文件搜索/过滤（Phase 3+）
- 不修改编辑器现有行为
- 不涉及 Agent/Tool 层的文件操作（Phase 3 单独做）
- 不涉及 Skill/Command 的执行逻辑（Phase 4）

## Decisions

### D1：数据目录结构

```
~/.superauthor/
├── config.json                        # 全局配置（API Key、Theme 等）
├── books/
│   ├── {book-name}/
│   │   ├── book.json                  # 书籍元数据
│   │   ├── chapters/                  # 章节系统目录
│   │   │   ├── 01-觉醒.md             # 根级别章节
│   │   │   └── 01_黑暗森林/           # 卷（子目录）
│   │   │       └── 01-危机.md
│   │   ├── outline/                   # 大纲系统目录
│   │   ├── characters/                # 角色系统目录
│   │   └── .super-author/
│   │       ├── skills/                # 书籍级 skill
│   │       └── commands/              # 自定义 prompt
│   └── {another-book}/
└── history/                           # 全局对话历史（Phase 3）
```

### D2：FileExplorer 组件设计

三层组件结构：

```
FileExplorer/
├── FileExplorer.tsx       ← 主组件：接收 book.directory，读取目录树，管理展开状态
├── FileTreeNode.tsx       ← 树节点：递归渲染文件/目录，处理点击/右键事件
└── ContextMenu.tsx        ← 右键菜单：根据节点类型动态生成操作列表
```

- **展开状态**：使用 `Set<string>` 存储展开的路径，local 状态即可（无需 store）
- **目录读取**：`IFileService.readDir` 递归读取，构建树结构
- **文件打开**：左键 `.md` 文件 → `editorStore.openFile()`；左键目录 → 展开/折叠

### D3：右键菜单操作矩阵

| 节点类型 | 可执行操作 |
|---|---|
| `chapters/` 目录 | 新增卷（创建子目录）、新增章节（创建 .md） |
| 卷目录（`chapters/` 内子目录） | 新增章节、删除卷 |
| `outline/` `characters/` 等系统目录 | 新建目录、新建 .md 文件 |
| `.super-author/` | 不可操作（右键无菜单） |
| `book.json` | 不可操作 |
| 非系统目录（用户新建） | 新建目录、新建 .md 文件、删除目录 |
| `.md` 文件 | 删除文件 |

### D4：命名规则

- **卷目录**：`{序号}_{卷名}/` — 序号两位自动递增，如 `01_黑暗森林/`、`02_星际迷航/`
- **章节文件**：`{序号}-{标题}.md` — 序号两位，在 chapters/ 根或卷内各自从 01 开始
- **新建目录**：用户输入目录名，同级唯一校验
- **新建 .md 文件**：用户输入文件名（不含扩展名），同级唯一校验

### D5：系统目录视觉标识

| 目录 | 颜色 | 图标 | 含义 |
|---|---|---|---|
| `chapters/` | 蓝色 | 📁 | 章节系统目录 |
| `outline/` | 绿色 | 📋 | 大纲系统目录 |
| `characters/` | 紫色 | 👤 | 角色系统目录 |
| `.super-author/` | 灰色 | ⚙️ | 系统内部，默认折叠 |
| 用户目录 | 默认 | 📂 | 普通目录 |

### D6：路径管理与 ConfigService

新增 `ConfigService` 负责路径推导：

```typescript
class ConfigService {
  readonly homeDir: string           // ~/.superauthor
  readonly booksDir: string          // ~/.superauthor/books
  readonly globalSkillsDir: string   // ~/.superauthor/skills
  readonly historyDir: string        // ~/.superauthor/history
  readonly configPath: string        // ~/.superauthor/config.json

  async loadConfig(): Promise<AppConfig>
  async saveConfig(config: AppConfig): Promise<void>
}
```

- Tauri 环境：`homeDir = resolve(appDataDir() || dirs::home_dir() + '/.superauthor')`
- 浏览器/Mock 环境：`homeDir = resolve(os.homedir(), '.superauthor')`

### D7：ChapterRepository 适配卷

`listChapters(bookDir)` 改为递归扫描 `chapters/` 目录：

- 深度 1 文件 → 根级别章节（`chapters/01-觉醒.md`）
- 深度 2 文件 → 卷内章节（`chapters/01_黑暗森林/01-危机.md`）
- 同级文件名解析序号，卷内从 01 重新编号
- `Chapter` 类型新增可选字段 `volume?: string`（所属卷名）

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| 文件系统操作频繁可能导致 UI 卡顿 | `readDir` 使用异步+缓存，目录展开时再读取子目录（lazy load） |
| 递归删除卷可能误删用户内容 | 删除前弹出确认对话框，展示待删文件列表 |
| 文件路径深度增加（`~/.superauthor/books/X/chapters/卷名/`） | ConfigService 统一管理路径拼接，不散落在各模块 |
| MockFileService 与真实文件系统行为不一致 | ConfigService 和 FileExplorer 都基于 IFileService 接口，Mock 覆盖各类操作 |
