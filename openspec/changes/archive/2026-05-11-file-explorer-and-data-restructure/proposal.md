## Why

当前侧边栏的章节树（ChapterTree）仅展示扁平的章节列表，大纲和角色管理仅有占位符，与 VS Code 风格的文件资源管理器体验差距较大。同时，数据存储路径分散且可配置，缺乏统一的本地数据目录。本次变更加固数据存储架构，并将侧边栏升级为完整的文件资源管理器，为后续 Phase 3-6 提供统一的文件操作入口。

## What Changes

- **BREAKING**: 数据根目录固定为 `~/.superauthor/`，移除 `baseDir` 可配置性
- **BREAKING**: 侧边栏 `ChapterTree` 替换为通用 `FileExplorer`（递归目录树）
- **新增** `chapters/` 目录支持"卷"（子目录），卷内章节从 01 重新编号
- **新增** 右键上下文菜单：按目录类型提供不同操作（新增卷/新增章节/新建目录/新增 .md/删除）
- **新增** `.super-author/commands/` 目录（存放自定义 prompt，Phase 4 使用）
- **修改** 书籍初始化：`createBook` 创建完整目录骨架（含 skills/、commands/）
- **修改** ActivityBar 精简为 `📁`（文件）和 `⚙️`（设置），保留扩展接口
- **修改** 系统目录使用不同颜色和图标标识，`.super-author/` 默认折叠
- **移除** `search`（大纲）和 `characters`（角色）活动栏图标
- **移除** `ChapterTree` 组件及 Sidebar 中对应的面板分支逻辑

## Capabilities

### New Capabilities
- `data-home-directory`: 统一数据根目录 `~/.superauthor/`，全局配置（config.json）、书籍数据、skills 和 commands 均在此目录下
- `file-explorer`: 通用文件资源管理器，递归展示目录树，支持展开/折叠、右键菜单、文件/目录 CRUD
- `chapter-volume`: chapters/ 目录下的卷（子目录）管理，卷内章节自动编号

### Modified Capabilities
- *(无 — 本次变更不修改已有 spec 级别的行为)*

## Impact

- `src/application/stores/bookStore.ts` — 移除 `setBaseDir`、`baseDir` 状态
- `src/infrastructure/BookRepository.ts` — `createBook` 路径基于 `~/.superauthor/books/`，新增 skills/commands 目录
- `src/infrastructure/ChapterRepository.ts` — `listChapters` 递归扫描子目录，文件名解析适配卷路径
- `src/presentation/sidebar/ChapterTree.tsx` — **移除**，由 FileExplorer 替代
- `src/presentation/sidebar/Sidebar.tsx` — 移除 search/characters 面板，仅保留 files 视图
- `src/presentation/activityBar/ActivityBar.tsx` — 移除 search/characters 图标
- `src/presentation/activityBar/AgentPanel.tsx` — Provider 配置路径改为 `~/.superauthor/config.json`
- `src/domain/types/layout.ts` — `ActivityBarItem` 保留类型定义但注释掉 search/characters
- 新增 `src/presentation/fileExplorer/` 目录（含 FileExplorer、TreeNode、ContextMenu 组件）
- 新增 `src/infrastructure/ConfigService.ts` — 统一管理 `~/.superauthor/` 路径和配置读写
