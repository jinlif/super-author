## 1. 基础设施：ConfigService + 数据目录迁移

- [x] 1.1 创建 `src/infrastructure/ConfigService.ts` — 统一管理 `~/.superauthor/` 路径推导
- [x] 1.2 修改 `BookRepository.createBook` — 路径基于 `~/.superauthor/books/`，新增 `.super-author/skills/` 和 `.super-author/commands/` 目录
- [x] 1.3 移除 `bookStore.baseDir` 和 `setBaseDir`，硬编码路径为 `ConfigService.booksDir`
- [x] 1.4 适配 `BookSelector` 组件：移除目录选择功能，改为直接展示 `~/.superauthor/books/` 下的书籍

## 2. 文件资源管理器：FileExplorer 组件

- [x] 2.1 创建 `src/presentation/fileExplorer/FileExplorer.tsx` — 主组件，递归读取目录树，管理展开状态
- [x] 2.2 创建 `src/presentation/fileExplorer/FileTreeNode.tsx` — 树节点组件（目录可展开/折叠，文件可打开）
- [x] 2.3 创建 `src/presentation/fileExplorer/ContextMenu.tsx` — 右键菜单组件，按节点类型动态生成操作
- [x] 2.4 实现系统目录视觉标识（颜色 + 图标映射），`.super-author/` 默认折叠
- [x] 2.5 实现新建目录功能（同级同名校验 + 错误提示）
- [x] 2.6 实现新建 .md 文件功能（仅允许 .md 类型）
- [x] 2.7 实现删除功能（文件/目录确认对话框，递归删除）

## 3. 卷系统：chapters/ 目录特殊行为

- [x] 3.1 修改 `ChapterRepository.listChapters` — 递归扫描 `chapters/` 子目录，解析卷内章节
- [x] 3.2 实现新增卷操作（`chapters/` 右键 → 自动编号 `01_卷名/`）
- [x] 3.3 实现新增章节操作（卷内或根级 → 自动编号 `01-标题.md`）
- [x] 3.4 实现删除卷操作（确认对话框 + 递归删除卷内内容）
- [x] 3.5 更新 `Chapter` 类型定义，新增可选 `volume?: string` 字段

## 4. 侧边栏 & 活动栏调整

- [x] 4.1 修改 `Sidebar.tsx` — 移除 search/characters 面板，files 视图渲染 FileExplorer
- [x] 4.2 修改 `ActivityBar.tsx` — 仅保留 files 和 settings 图标
- [x] 4.3 删除 `src/presentation/sidebar/ChapterTree.tsx` 及相关 CSS
- [x] 4.4 更新 `layout.ts` 类型定义，注释掉 search/characters 相关类型

## 5. 测试

- [x] 5.1 更新现有 `ChapterTree.test.tsx` 为 `FileExplorer.test.tsx` 测试
- [x] 5.2 测试卷创建/章节创建/编号逻辑
- [x] 5.3 测试系统目录可视标识
- [x] 5.4 测试目录同名校验
- [x] 5.5 测试 ConfigService 路径推导（ConfigService 构造函数接受 `homeDir` 参数以支持测试注入）
