# 超级作者 — Phase 2 详细设计：数据模型 & 本地存储

> 基于 [整体设计文档](2026-05-08-super-author-design.md) 的 Phase 2 实现设计

---

## 一、Phase 1 遗留：Tauri v2 壳集成

### 1.1 Rust commands

只暴露 5 个纯文件系统操作，不做业务逻辑：

```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String>

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String>

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<FileEntry>, String>

#[tauri::command]
fn create_dir(path: String) -> Result<(), String>

#[tauri::command]
fn path_exists(path: String) -> Result<bool, String>
```

`FileEntry` 结构：

```rust
struct FileEntry {
  name: String,
  path: String,
  is_dir: bool,
}
```

### 1.2 前端依赖

```
@tauri-apps/api@^2          — invoke 核心
@tauri-apps/plugin-fs@^2    — 文件系统插件
@tauri-apps/plugin-dialog@^2 — 目录选择对话框
```

### 1.3 配置

- `tauri.conf.json`: identifier=`com.super-author.app`, title=`超级作者`, size=1400x900
- `capabilities/default.json`: 启用 fs、dialog 相关权限
- `Cargo.toml`: tauri v2, serde, serde_json, tauri-plugin-fs, tauri-plugin-dialog

---

## 二、Phase 2 数据模型

### 2.1 核心类型

所有类型定义位于 `src/domain/types/`：

**`book.ts`**

```typescript
interface Book {
  id: string
  title: string
  author: string
  description: string
  cover?: string
  tags: string[]
  style: string
  directory: string    // 书籍本地根目录（绝对路径）
  createdAt: string    // ISO date string
  updatedAt: string
}

interface CreateBookInput {
  title: string
  author: string
  description?: string
  tags?: string[]
  style?: string
}

interface BookMeta {
  title: string
  author: string
  description: string
  tags: string[]
  style: string
  createdAt: string
  updatedAt: string
}
```

**`chapter.ts`**

```typescript
interface Chapter {
  id: string
  bookId: string
  title: string
  order: number
  status: 'draft' | 'completed'
  wordCount: number
  filePath: string       // 相对 book.directory 的路径
  createdAt: string
  updatedAt: string
}

interface ChapterRevision {
  id: string
  chapterId: string
  content: string
  timestamp: string
  summary: string
}
```

**`file.ts`**

```typescript
interface FileEntry {
  name: string
  path: string
  isDir: boolean
}
```

### 2.2 文件结构约定

每本书一个目录：

```
{book-directory}/
├── book.json                  # BookMeta JSON
├── chapters/
│   ├── 01-标题.md
│   └── 02-标题.md
├── outline/                   # Phase 2 只创建目录
├── characters/                # Phase 2 只创建目录
└── .super-author/
    └── history/               # 后续 Phase 使用
```

---

## 三、Phase 2 服务层

### 3.1 分层架构

```
src/
├── domain/types/           ← 纯类型，无依赖
├── infrastructure/
│   ├── FileService.ts      ← 封装 Tauri invoke / 可切换 mock
│   └── BookRepository.ts   ← 基于 FileService 的书籍持久化
├── application/
│   └── stores/
│       ├── bookStore.ts    ← 当前书籍/章节状态
│       ├── editorStore.ts  ← 已有，扩展
│       └── layoutStore.ts  ← 已有，不变
```

### 3.2 FileService

接口定义：

```typescript
interface IFileService {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDir(path: string): Promise<FileEntry[]>
  createDir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}
```

两种实现：

| 实现 | 说明 | 条件 |
|------|------|------|
| `TauriFileService` | 调用 `invoke('read_file')` 等 | Tauri 环境 |
| `MockFileService` | 内存 map + localStorage 持久化 | 开发/测试环境 |

通过环境变量或运行时检测切换：

```typescript
export function createFileService(): IFileService {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return new TauriFileService()
  }
  return new MockFileService()
}
```

### 3.3 BookRepository

书籍元数据读写（操作 `book.json`），不涉及章节内容：

```typescript
class BookRepository {
  constructor(private fs: IFileService)

  // 扫描目录下的 book.json
  async listBooks(baseDir: string): Promise<Book[]>

  // 创建书籍目录 + book.json
  async createBook(parentDir: string, input: CreateBookInput): Promise<Book>

  // 读取 book.json 并解析为 Book
  async openBook(bookDir: string): Promise<Book>

  // 更新 book.json
  async updateBookMeta(book: Book): Promise<void>

  // 删除书籍目录（慎用）
  async deleteBook(bookDir: string): Promise<void>
}
```

### 3.4 ChapterRepository

章节内容读写：

```typescript
class ChapterRepository {
  constructor(private fs: IFileService)

  // 扫描 chapters/ 目录，返回章节列表
  async listChapters(bookDir: string): Promise<Chapter[]>

  // 读取章节 markdown 内容
  async readChapter(filePath: string): Promise<string>

  // 写入章节 markdown
  async writeChapter(filePath: string, content: string): Promise<void>

  // 创建新章
  async createChapter(bookDir: string, title: string): Promise<Chapter>

  // 删除章节文件
  async deleteChapter(filePath: string): Promise<void>

  // 重命名章节文件
  async renameChapter(oldPath: string, newTitle: string): Promise<Chapter>
}
```

### 3.5 bookStore (Zustand)

```typescript
interface BookStore {
  // 状态
  books: Book[]
  currentBook: Book | null
  chapters: Chapter[]
  currentChapter: Chapter | null
  chapterContent: string
  isLoading: boolean

  // 操作
  loadBooks: (baseDir: string) => Promise<void>
  createBook: (parentDir: string, input: CreateBookInput) => Promise<Book>
  openBook: (book: Book) => Promise<void>
  closeBook: () => void
  loadChapter: (chapter: Chapter) => Promise<void>
  saveChapter: (chapter: Chapter, content: string) => Promise<void>
  createChapter: (title: string) => Promise<void>
}
```

---

## 四、Phase 2 UI 组件

### 4.1 书籍选择页面 (BookSelector)

- 位置：编辑器区域（无打开书籍时全屏显示）
- 功能：显示已发现的书籍卡片列表 + 新建书籍按钮
- 新建弹窗：书名 + 作者（必填），描述/标签/风格（选填）
- 选择目录：使用 Tauri Dialog 或手动输入路径

### 4.2 章节树 (ChapterTree)

- 位置：侧边栏 → 资源管理器面板
- 功能：按 `chapters/` 目录展示章节列表，点击打开章节
- 交互：展开/折叠，右键新建/重命名/删除
- 选中高亮当前打开的章节

### 4.3 大纲树 (OutlineTree)

- 位置：侧边栏 → 搜索面板
- 功能：读取 `outline/` 目录展示大纲文件列表
- Phase 2 只做查看，编辑留到后续

### 4.4 Monaco Editor 集成

- 依赖：`@monaco-editor/react`
- 配置：markdown 语言、vs-dark 主题、minimap 开启
- 集成到 EditorPanel，替代当前 textarea 占位
- 支持多标签切换（已有 EditorTabs）
- 内容变更通过 `onChange` 同步到 store，触发自动保存

### 4.5 状态栏 (EditorStatusBar)

- 位置：编辑器底部
- 显示：当前章节字数、写作状态（草稿/已完成）
- 固定高度 24px，VS Code 风格

---

## 五、阶段边界

### Phase 2 包含

- 创建/打开/列出书籍
- 创建/编辑/保存章节（markdown）
- 章节树展示和导航
- 编辑器基本编辑（Monaco）
- 自动保存（debounce 5s）
- 字数统计

### Phase 2 不包含（后续 Phase）

- 角色管理（Phase 3+）
- 世界观/大纲编辑（Phase 3+）
- 写作目标追踪（Phase 6）
- 修订历史/diff（Phase 6）
- 划词备注（Phase 6）

---

## 六、测试策略

| 层 | 测试类型 | 内容 |
|-----|---------|------|
| Domain types | 纯类型 | 编译检查即可 |
| FileService | 单元测试 | MockFileService 的读写正确性 |
| BookRepository | 集成测试 | 基于 MockFileService 的 CRUD |
| bookStore | 集成测试 | 基于 MockFileService 的状态流转 |
| UI 组件 | 组件测试 | 渲染 + 用户交互 |
| Monaco Editor | 不测 | 第三方库，冒烟确认即可 |

---

## 七、实施顺序

```
Step 1: Tauri v2 壳搭建 (Phase 1 遗留)
Step 2: 类型定义 (2.1) + 测试
Step 3: Rust FS commands (2.2)
Step 4: FileService (2.3) + Mock + 测试
Step 5: BookRepository + ChapterRepository + 测试
Step 6: bookStore + 测试
Step 7: 书籍选择页面 (2.5)
Step 8: Monaco Editor 集成 (2.6)
Step 9: 章节读写 + 自动保存 (2.7)
Step 10: 侧边栏章节树 + 大纲树 (2.8)
Step 11: 状态栏 (2.9)
Step 12: Phase 2 集成测试 (2.10)
```
