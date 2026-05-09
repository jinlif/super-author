# Phase 2: 数据模型 & 本地存储 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Tauri v2 壳集成 + 数据模型定义 + 文件服务层 + 书籍/章节 CRUD + Monaco Editor + 章节树 UI + 状态栏

**Architecture:** Tauri v2 提供文件系统 commands（Rust std::fs），前端三层：domain types → infrastructure (FileService/Repository) → application (Zustand store) → presentation (React 组件)。开发模式可用 MockFileService 脱离 Tauri 运行。

**Tech Stack:** Tauri v2, Rust (serde), @tauri-apps/api v2, @monaco-editor/react, Zustand 5, Vitest 4

---

## 文件结构总览

### 新增文件

```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── src/
│   ├── lib.rs
│   └── main.rs
└── capabilities/
    └── default.json

src/domain/types/
├── book.ts
├── chapter.ts
└── file.ts

src/infrastructure/
├── IFileService.ts
├── MockFileService.ts
├── TauriFileService.ts
├── BookRepository.ts
└── ChapterRepository.ts

src/application/stores/
└── bookStore.ts

src/presentation/bookSelector/
├── BookSelector.tsx
└── BookSelector.css

src/presentation/sidebar/
├── ChapterTree.tsx
└── ChapterTree.css

src/presentation/editor/
└── EditorStatusBar.tsx

tests/infrastructure/
├── MockFileService.test.ts
├── BookRepository.test.ts
└── ChapterRepository.test.ts
tests/stores/
└── bookStore.test.ts
tests/presentation/
├── BookSelector.test.tsx
├── ChapterTree.test.tsx
└── EditorStatusBar.test.tsx
tests/phase2/
└── Phase2.test.tsx
```

### 修改文件

```
package.json                    ← 添加 Tauri + Monaco 依赖
vite.config.ts                  ← 添加 Tauri 环境变量
tsconfig.json                   ← 添加 types 引用
src/presentation/editor/EditorPanel.tsx  ← 集成 Monaco
src/presentation/sidebar/Sidebar.tsx     ← 使用 ChapterTree
src/presentation/layout/Layout.tsx       ← 集成 BookSelector + StatusBar
src/App.tsx                     ← 初始化 BookStore
```

---

## Task 1: Tauri v2 壳搭建

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/capabilities/default.json`
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: 添加 npm 依赖**

```bash
npm install @tauri-apps/api@^2 @tauri-apps/plugin-dialog@^2 @monaco-editor/react
npm install -D @tauri-apps/cli@^2
```

- [ ] **Step 2: 创建 `src-tauri/Cargo.toml`**

```toml
[package]
name = "super-author"
version = "0.1.0"
edition = "2021"

[lib]
name = "super_author_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

- [ ] **Step 3: 创建 `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: 创建 `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "超级作者",
  "version": "0.1.0",
  "identifier": "com.super-author.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "超级作者",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 5: 创建 `src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "默认权限集",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default"
  ]
}
```

- [ ] **Step 6: 创建 `src-tauri/src/lib.rs`**

```rust
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| {
            let path = entry.path();
            FileEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                is_dir: path.is_dir(),
            }
        })
        .collect();
    Ok(entries)
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_dir,
            create_dir,
            path_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: 创建 `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    super_author_lib::run()
}
```

- [ ] **Step 8: 修改 `vite.config.ts` 添加 Tauri 端口配置**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
```

- [ ] **Step 9: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 10: 验证测试仍然通过**

Run: `npm test`
Expected: 14 passed

- [ ] **Step 11: 提交**

```bash
git add src-tauri/ package.json package-lock.json vite.config.ts
git commit -m "feat: Tauri v2 壳集成 + 文件系统 commands"
```

---

## Task 2: 领域类型定义

**Files:**
- Create: `src/domain/types/book.ts`
- Create: `src/domain/types/chapter.ts`
- Create: `src/domain/types/file.ts`

- [ ] **Step 1: 创建 `src/domain/types/book.ts`**

```typescript
export interface BookMeta {
  title: string
  author: string
  description: string
  tags: string[]
  style: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  cover?: string
  tags: string[]
  style: string
  directory: string
  createdAt: string
  updatedAt: string
}

export interface CreateBookInput {
  title: string
  author: string
  description?: string
  tags?: string[]
  style?: string
}
```

- [ ] **Step 2: 创建 `src/domain/types/chapter.ts`**

```typescript
export interface Chapter {
  id: string
  bookId: string
  title: string
  order: number
  status: 'draft' | 'completed'
  wordCount: number
  filePath: string
  createdAt: string
  updatedAt: string
}

export interface ChapterRevision {
  id: string
  chapterId: string
  content: string
  timestamp: string
  summary: string
}

export interface CreateChapterInput {
  bookId: string
  title: string
  order: number
}
```

- [ ] **Step 3: 创建 `src/domain/types/file.ts`**

```typescript
export interface FileEntry {
  name: string
  path: string
  isDir: boolean
}
```

- [ ] **Step 4: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 5: 提交**

```bash
git add src/domain/types/book.ts src/domain/types/chapter.ts src/domain/types/file.ts
git commit -m "feat: 定义 Book/Chapter/FileEntry 类型"
```

---

## Task 3: FileService (接口 + Mock + Tauri)

**Files:**
- Create: `src/infrastructure/IFileService.ts`
- Create: `src/infrastructure/MockFileService.ts`
- Create: `src/infrastructure/TauriFileService.ts`
- Create: `tests/infrastructure/MockFileService.test.ts`

- [ ] **Step 1: 创建 `src/infrastructure/IFileService.ts`**

```typescript
import type { FileEntry } from '../domain/types/file'

export interface IFileService {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDir(path: string): Promise<FileEntry[]>
  createDir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}
```

- [ ] **Step 2: 创建 `src/infrastructure/MockFileService.ts`**

```typescript
import type { IFileService } from './IFileService'
import type { FileEntry } from '../domain/types/file'

export class MockFileService implements IFileService {
  private files: Map<string, string> = new Map()
  private dirs: Set<string> = new Set()

  constructor() {
    this.dirs.add('/')
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) {
      throw new Error(`ENOENT: ${path}`)
    }
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
    const dir = path.substring(0, path.lastIndexOf('/')) || '/'
    this.dirs.add(dir)
  }

  async readDir(path: string): Promise<FileEntry[]> {
    // 规范化 path，确保以 / 结尾
    const prefix = path.endsWith('/') ? path : `${path}/`
    const entries = new Map<string, FileEntry>()

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.substring(prefix.length)
        const name = rest.includes('/') ? rest.substring(0, rest.indexOf('/')) : rest
        if (name && !entries.has(name)) {
          entries.set(name, { name, path: `${prefix}${name}`, isDir: false })
        }
      }
    }

    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix) && dirPath !== prefix) {
        const rest = dirPath.substring(prefix.length)
        const name = rest.includes('/') ? rest.substring(0, rest.indexOf('/')) : rest
        if (name && !entries.has(name)) {
          entries.set(name, { name, path: dirPath, isDir: true })
        }
      }
    }

    return Array.from(entries.values())
  }

  async createDir(path: string): Promise<void> {
    // 递归创建父目录
    const parts = path.split('/').filter(Boolean)
    let current = ''
    for (const part of parts) {
      current += `/${part}`
      this.dirs.add(current)
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.dirs.has(path)
  }
}
```

- [ ] **Step 3: 创建 `tests/infrastructure/MockFileService.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('MockFileService', () => {
  it('writeFile 后 readFile 返回正确内容', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/test.txt', 'hello')
    expect(await fs.readFile('/test.txt')).toBe('hello')
  })

  it('readFile 不存在的文件抛出错误', async () => {
    const fs = new MockFileService()
    await expect(fs.readFile('/nonexistent.txt')).rejects.toThrow('ENOENT')
  })

  it('readDir 返回文件和目录', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/dir/a.txt', 'a')
    await fs.writeFile('/dir/b.txt', 'b')
    await fs.createDir('/dir/sub')
    const entries = await fs.readDir('/dir')
    expect(entries).toHaveLength(3)
    expect(entries.find((e) => e.name === 'a.txt')?.isDir).toBe(false)
    expect(entries.find((e) => e.name === 'sub')?.isDir).toBe(true)
  })

  it('exists 检测文件和目录', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/a.txt', '')
    await fs.createDir('/b')
    expect(await fs.exists('/a.txt')).toBe(true)
    expect(await fs.exists('/b')).toBe(true)
    expect(await fs.exists('/c')).toBe(false)
  })

  it('createDir 创建多层目录', async () => {
    const fs = new MockFileService()
    await fs.createDir('/a/b/c')
    expect(await fs.exists('/a/b/c')).toBe(true)
    expect(await fs.exists('/a/b')).toBe(true)
    expect(await fs.exists('/a')).toBe(true)
  })
})
```

- [ ] **Step 4: 运行 MockFileService 测试**

Run: `npx vitest run tests/infrastructure/MockFileService.test.ts`
Expected: 5 passed

- [ ] **Step 5: 创建 `src/infrastructure/TauriFileService.ts`**

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { IFileService } from './IFileService'
import type { FileEntry } from '../domain/types/file'

export class TauriFileService implements IFileService {
  async readFile(path: string): Promise<string> {
    return invoke<string>('read_file', { path })
  }

  async writeFile(path: string, content: string): Promise<void> {
    return invoke<void>('write_file', { path, content })
  }

  async readDir(path: string): Promise<FileEntry[]> {
    return invoke<FileEntry[]>('read_dir', { path })
  }

  async createDir(path: string): Promise<void> {
    return invoke<void>('create_dir', { path })
  }

  async exists(path: string): Promise<boolean> {
    return invoke<boolean>('path_exists', { path })
  }
}
```

- [ ] **Step 6: 创建 FileService 工厂函数（追加到 TauriFileService.ts 或独立文件）**

创建 `src/infrastructure/createFileService.ts`:

```typescript
import type { IFileService } from './IFileService'
import { MockFileService } from './MockFileService'
import { TauriFileService } from './TauriFileService'

export function createFileService(): IFileService {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return new TauriFileService()
  }
  return new MockFileService()
}
```

- [ ] **Step 7: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 8: 提交**

```bash
git add src/infrastructure/ tests/infrastructure/MockFileService.test.ts
git commit -m "feat: 实现 FileService (接口 + Mock + Tauri + 工厂)"
```

---

## Task 4: BookRepository + ChapterRepository

**Files:**
- Create: `src/infrastructure/BookRepository.ts`
- Create: `src/infrastructure/ChapterRepository.ts`
- Create: `tests/infrastructure/BookRepository.test.ts`
- Create: `tests/infrastructure/ChapterRepository.test.ts`

- [ ] **Step 1: 创建 `src/infrastructure/BookRepository.ts`**

```typescript
import type { IFileService } from './IFileService'
import type { Book, BookMeta, CreateBookInput } from '../domain/types/book'

export class BookRepository {
  constructor(private fs: IFileService) {}

  async listBooks(baseDir: string): Promise<Book[]> {
    if (!(await this.fs.exists(baseDir))) return []
    const entries = await this.fs.readDir(baseDir)
    const books: Book[] = []
    for (const entry of entries) {
      if (entry.isDir) {
        const bookJsonPath = `${entry.path}/book.json`
        try {
          const content = await this.fs.readFile(bookJsonPath)
          const book = this.parseBook(content, entry.path)
          books.push(book)
        } catch {
          // 没有 book.json 的目录跳过
        }
      }
    }
    return books
  }

  async createBook(parentDir: string, input: CreateBookInput): Promise<Book> {
    const id = crypto.randomUUID()
    const dirName = input.title.replace(/[<>:"/\\|?*]/g, '_').trim()
    const bookDir = `${parentDir}/${dirName}`
    const now = new Date().toISOString()

    await this.fs.createDir(`${bookDir}/chapters`)
    await this.fs.createDir(`${bookDir}/outline`)
    await this.fs.createDir(`${bookDir}/characters`)
    await this.fs.createDir(`${bookDir}/.super-author/history`)

    const meta: BookMeta = {
      title: input.title,
      author: input.author,
      description: input.description ?? '',
      tags: input.tags ?? [],
      style: input.style ?? '',
      createdAt: now,
      updatedAt: now,
    }

    await this.fs.writeFile(`${bookDir}/book.json`, JSON.stringify(meta, null, 2))

    return { id, ...meta, directory: bookDir }
  }

  async openBook(bookDir: string): Promise<Book> {
    const content = await this.fs.readFile(`${bookDir}/book.json`)
    return this.parseBook(content, bookDir)
  }

  async updateBookMeta(book: Book): Promise<void> {
    const { id, directory, ...meta } = book
    const updated = { ...meta, updatedAt: new Date().toISOString() }
    await this.fs.writeFile(`${directory}/book.json`, JSON.stringify(updated, null, 2))
  }

  private parseBook(content: string, directory: string): Book {
    const meta: BookMeta = JSON.parse(content)
    const id = crypto.randomUUID()
    return { id, ...meta, directory }
  }
}
```

- [ ] **Step 2: 创建 `tests/infrastructure/BookRepository.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { BookRepository } from '../../src/infrastructure/BookRepository'

describe('BookRepository', () => {
  let repo: BookRepository
  let fs: MockFileService

  beforeEach(() => {
    fs = new MockFileService()
    repo = new BookRepository(fs)
  })

  it('createBook 创建目录和 book.json', async () => {
    const book = await repo.createBook('/books', {
      title: '我的小说',
      author: '作者',
    })
    expect(book.title).toBe('我的小说')
    expect(book.author).toBe('作者')
    expect(book.directory).toContain('我的小说')

    const content = await fs.readFile(`${book.directory}/book.json`)
    const meta = JSON.parse(content)
    expect(meta.title).toBe('我的小说')
  })

  it('createBook 创建 chapters/outline/characters 目录', async () => {
    const book = await repo.createBook('/books', { title: 'Test', author: 'A' })
    expect(await fs.exists(`${book.directory}/chapters`)).toBe(true)
    expect(await fs.exists(`${book.directory}/outline`)).toBe(true)
    expect(await fs.exists(`${book.directory}/characters`)).toBe(true)
  })

  it('listBooks 扫描目录下的书籍', async () => {
    await repo.createBook('/books', { title: 'Book1', author: 'A' })
    await repo.createBook('/books', { title: 'Book2', author: 'B' })
    const books = await repo.listBooks('/books')
    expect(books).toHaveLength(2)
  })

  it('openBook 读取 book.json 并解析', async () => {
    const created = await repo.createBook('/books', {
      title: 'Test',
      author: 'Author',
      description: 'Desc',
      tags: ['玄幻'],
    })
    const opened = await repo.openBook(created.directory)
    expect(opened.title).toBe('Test')
    expect(opened.tags).toEqual(['玄幻'])
  })

  it('updateBookMeta 更新 book.json', async () => {
    const book = await repo.createBook('/books', { title: 'T', author: 'A' })
    book.title = '新标题'
    await repo.updateBookMeta(book)
    const content = await fs.readFile(`${book.directory}/book.json`)
    expect(JSON.parse(content).title).toBe('新标题')
  })
})
```

- [ ] **Step 3: 运行 BookRepository 测试**

Run: `npx vitest run tests/infrastructure/BookRepository.test.ts`
Expected: 5 passed

- [ ] **Step 4: 创建 `src/infrastructure/ChapterRepository.ts`**

```typescript
import type { IFileService } from './IFileService'
import type { Chapter } from '../domain/types/chapter'

export class ChapterRepository {
  constructor(private fs: IFileService) {}

  async listChapters(bookDir: string): Promise<Chapter[]> {
    const chaptersDir = `${bookDir}/chapters`
    if (!(await this.fs.exists(chaptersDir))) return []

    const entries = await this.fs.readDir(chaptersDir)
    const chapters: Chapter[] = []

    for (const entry of entries) {
      if (!entry.isDir && entry.name.endsWith('.md')) {
        const content = await this.fs.readFile(entry.path)
        chapters.push(this.parseChapter(bookDir, entry, content))
      }
    }

    return chapters.sort((a, b) => a.order - b.order)
  }

  async readChapter(filePath: string): Promise<string> {
    return this.fs.readFile(filePath)
  }

  async writeChapter(filePath: string, content: string): Promise<void> {
    return this.fs.writeFile(filePath, content)
  }

  async createChapter(bookDir: string, title: string): Promise<Chapter> {
    const chapters = await this.listChapters(bookDir)
    const nextOrder = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.order)) + 1
      : 1
    const orderStr = String(nextOrder).padStart(2, '0')
    const fileName = `${orderStr}-${title}.md`
    const filePath = `${bookDir}/chapters/${fileName}`
    const now = new Date().toISOString()

    const initialContent = `# ${title}\n\n`
    await this.fs.writeFile(filePath, initialContent)

    return {
      id: crypto.randomUUID(),
      bookId: bookDir.split('/').pop() ?? '',
      title,
      order: nextOrder,
      status: 'draft',
      wordCount: 0,
      filePath,
      createdAt: now,
      updatedAt: now,
    }
  }

  async deleteChapter(filePath: string): Promise<void> {
    // MockFileService 不支持删除，这里用空内容覆盖标记删除
    // 真正删除需扩展 MockFileService 添加 deleteFile
    await this.fs.writeFile(filePath, '')
  }

  private parseChapter(bookDir: string, entry: { name: string; path: string }, content: string): Chapter {
    // 文件名格式: "01-标题.md"
    const match = entry.name.match(/^(\d+)-(.+)\.md$/)
    const order = match ? Number.parseInt(match[1]!, 10) : 99
    const title = match
      ? match[2]!
      : entry.name.replace(/\.md$/, '')

    const text = content || ''
    const wordCount = text.replace(/[\s\n]/g, '').length

    return {
      id: crypto.randomUUID(),
      bookId: bookDir.split('/').pop() ?? '',
      title,
      order,
      status: 'draft',
      wordCount,
      filePath: entry.path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}
```

- [ ] **Step 5: 创建 `tests/infrastructure/ChapterRepository.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { BookRepository } from '../../src/infrastructure/BookRepository'
import { ChapterRepository } from '../../src/infrastructure/ChapterRepository'

describe('ChapterRepository', () => {
  let fs: MockFileService
  let bookRepo: BookRepository
  let chapterRepo: ChapterRepository
  let bookDir: string

  beforeEach(async () => {
    fs = new MockFileService()
    bookRepo = new BookRepository(fs)
    chapterRepo = new ChapterRepository(fs)
    const book = await bookRepo.createBook('/books', { title: 'Test', author: 'A' })
    bookDir = book.directory
  })

  it('createChapter 创建 .md 文件并返回 Chapter', async () => {
    const chapter = await chapterRepo.createChapter(bookDir, '开篇')
    expect(chapter.title).toBe('开篇')
    expect(chapter.order).toBe(1)
    expect(chapter.filePath).toContain('chapters/01-开篇.md')

    const content = await fs.readFile(chapter.filePath)
    expect(content).toBe('# 开篇\n\n')
  })

  it('listChapters 返回按 order 排序的章节', async () => {
    await chapterRepo.createChapter(bookDir, '第一章')
    await chapterRepo.createChapter(bookDir, '第二章')
    const chapters = await chapterRepo.listChapters(bookDir)
    expect(chapters).toHaveLength(2)
    expect(chapters[0]!.order).toBe(1)
    expect(chapters[1]!.order).toBe(2)
  })

  it('writeChapter 写入内容后 readChapter 返回', async () => {
    const chapter = await chapterRepo.createChapter(bookDir, '测试章')
    await chapterRepo.writeChapter(chapter.filePath, '# 新内容\n\n正文')
    const content = await chapterRepo.readChapter(chapter.filePath)
    expect(content).toBe('# 新内容\n\n正文')
  })

  it('parseChapter 正确解析文件名中的 order', async () => {
    const chapter = await chapterRepo.createChapter(bookDir, '序章')
    expect(chapter.order).toBe(1)
    // 文件名中提取的 order
    const chapters = await chapterRepo.listChapters(bookDir)
    expect(chapters[0]!.title).toBe('序章')
  })
})
```

- [ ] **Step 6: 运行 ChapterRepository 测试**

Run: `npx vitest run tests/infrastructure/ChapterRepository.test.ts`
Expected: 4 passed

- [ ] **Step 7: 运行所有测试**

Run: `npm test`
Expected: 23 passed (14 旧 + 5 MockFileService + 5 BookRepository + 4 ChapterRepository - 但新测试是独立文件，总数为 14+5+5+4 = 28)

- [ ] **Step 8: 提交**

```bash
git add src/infrastructure tests/infrastructure
git commit -m "feat: 实现 BookRepository + ChapterRepository"
```

---

## Task 5: bookStore (Zustand)

**Files:**
- Create: `src/application/stores/bookStore.ts`
- Create: `tests/stores/bookStore.test.ts`

- [ ] **Step 1: 创建 `tests/stores/bookStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { BookRepository } from '../../src/infrastructure/BookRepository'
import { ChapterRepository } from '../../src/infrastructure/ChapterRepository'

describe('bookStore', () => {
  let fs: MockFileService

  beforeEach(async () => {
    fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    // 注册依赖
    useBookStore.getState().setFileService(fs)
  })

  it('初始状态', () => {
    const state = useBookStore.getState()
    expect(state.books).toHaveLength(0)
    expect(state.currentBook).toBeNull()
    expect(state.chapters).toHaveLength(0)
    expect(state.currentChapter).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('createBook 创建并添加到列表', async () => {
    await useBookStore.getState().createBook('我的书', '作者A')
    expect(useBookStore.getState().books).toHaveLength(1)
    expect(useBookStore.getState().books[0]!.title).toBe('我的书')
  })

  it('openBook 设置 currentBook 并加载章节', async () => {
    await useBookStore.getState().createBook('小说', '作者')
    const book = useBookStore.getState().books[0]!
    await useBookStore.getState().openBook(book)
    expect(useBookStore.getState().currentBook?.id).toBe(book.id)
    expect(useBookStore.getState().chapters).toHaveLength(0)
  })

  it('createChapter 添加章节到当前书籍', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const book = useBookStore.getState().books[0]!
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('第一章')
    expect(useBookStore.getState().chapters).toHaveLength(1)
    expect(useBookStore.getState().chapters[0]!.title).toBe('第一章')
  })

  it('loadChapter 读取并设置 chapterContent', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const book = useBookStore.getState().books[0]!
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('测试')
    const chapter = useBookStore.getState().chapters[0]!
    await useBookStore.getState().loadChapter(chapter)
    expect(useBookStore.getState().currentChapter?.id).toBe(chapter.id)
    expect(useBookStore.getState().chapterContent).toBe('# 测试\n\n')
  })

  it('saveChapter 保存内容并更新字数', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const book = useBookStore.getState().books[0]!
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('章')
    const chapter = useBookStore.getState().chapters[0]!
    await useBookStore.getState().loadChapter(chapter)
    await useBookStore.getState().saveChapter('新内容正文')
    expect(useBookStore.getState().chapterContent).toBe('新内容正文')
    expect(useBookStore.getState().currentChapter?.wordCount).toBe(4)
  })

  it('closeBook 重置状态', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const book = useBookStore.getState().books[0]!
    await useBookStore.getState().openBook(book)
    useBookStore.getState().closeBook()
    expect(useBookStore.getState().currentBook).toBeNull()
    expect(useBookStore.getState().chapters).toHaveLength(0)
    expect(useBookStore.getState().chapterContent).toBe('')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/stores/bookStore.test.ts`
Expected: FAIL (bookStore 未创建)

- [ ] **Step 3: 创建 `src/application/stores/bookStore.ts`**

```typescript
import { create } from 'zustand'
import type { IFileService } from '../../infrastructure/IFileService'
import { MockFileService } from '../../infrastructure/MockFileService'
import { BookRepository } from '../../infrastructure/BookRepository'
import { ChapterRepository } from '../../infrastructure/ChapterRepository'
import type { Book } from '../../domain/types/book'
import type { Chapter } from '../../domain/types/chapter'

interface BookStore {
  books: Book[]
  currentBook: Book | null
  chapters: Chapter[]
  currentChapter: Chapter | null
  chapterContent: string
  isLoading: boolean
  baseDir: string

  // 内部依赖（测试可注入 Mock）
  _bookRepo: BookRepository | null
  _chapterRepo: ChapterRepository | null
  setFileService: (fs: IFileService) => void

  // 操作
  loadBooks: () => Promise<void>
  createBook: (title: string, author: string) => Promise<Book>
  openBook: (book: Book) => Promise<void>
  closeBook: () => void
  createChapter: (title: string) => Promise<void>
  loadChapter: (chapter: Chapter) => Promise<void>
  saveChapter: (content: string) => Promise<void>
  setBaseDir: (dir: string) => void
}

function createRepos(fs?: IFileService) {
  const fileService = fs ?? new MockFileService()
  return {
    bookRepo: new BookRepository(fileService),
    chapterRepo: new ChapterRepository(fileService),
  }
}

export const useBookStore = create<BookStore>((set, get) => {
  const { bookRepo, chapterRepo } = createRepos()

  return {
    books: [],
    currentBook: null,
    chapters: [],
    currentChapter: null,
    chapterContent: '',
    isLoading: false,
    baseDir: '/books',

    _bookRepo: bookRepo,
    _chapterRepo: chapterRepo,

    setFileService: (fs: IFileService) => {
      const repos = createRepos(fs)
      set({ _bookRepo: repos.bookRepo, _chapterRepo: repos.chapterRepo })
    },

    loadBooks: async () => {
      const repo = get()._bookRepo!
      const books = await repo.listBooks(get().baseDir)
      set({ books })
    },

    createBook: async (title: string, author: string) => {
      const repo = get()._bookRepo!
      const book = await repo.createBook(get().baseDir, { title, author })
      set((state) => ({ books: [...state.books, book] }))
      return book
    },

    openBook: async (book: Book) => {
      set({ isLoading: true })
      const repo = get()._chapterRepo!
      const chapters = await repo.listChapters(book.directory)
      set({
        currentBook: book,
        chapters,
        currentChapter: null,
        chapterContent: '',
        isLoading: false,
      })
    },

    closeBook: () => {
      set({
        currentBook: null,
        chapters: [],
        currentChapter: null,
        chapterContent: '',
      })
    },

    createChapter: async (title: string) => {
      const book = get().currentBook
      if (!book) throw new Error('没有打开书籍')
      const repo = get()._chapterRepo!
      const chapter = await repo.createChapter(book.directory, title)
      set((state) => ({ chapters: [...state.chapters, chapter] }))
    },

    loadChapter: async (chapter: Chapter) => {
      const repo = get()._chapterRepo!
      const content = await repo.readChapter(chapter.filePath)
      set({ currentChapter: chapter, chapterContent: content })
    },

    saveChapter: async (content: string) => {
      const chapter = get().currentChapter
      if (!chapter) throw new Error('没有打开的章节')
      const repo = get()._chapterRepo!
      const wordCount = content.replace(/[\s\n]/g, '').length
      const updated = { ...chapter, wordCount, updatedAt: new Date().toISOString() }
      await repo.writeChapter(chapter.filePath, content)
      set({
        chapterContent: content,
        currentChapter: updated,
        chapters: get().chapters.map((c) =>
          c.id === chapter.id ? updated : c
        ),
      })
    },

    setBaseDir: (dir: string) => set({ baseDir: dir }),
  }
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/stores/bookStore.test.ts`
Expected: 7 passed

- [ ] **Step 5: 提交**

```bash
git add src/application/stores/bookStore.ts tests/stores/bookStore.test.ts
git commit -m "feat: 实现 bookStore Zustand 状态管理"
```

---

## Task 6: 书籍选择页面

**Files:**
- Create: `src/presentation/bookSelector/BookSelector.tsx`
- Create: `src/presentation/bookSelector/BookSelector.css`
- Create: `tests/presentation/BookSelector.test.tsx`
- Modify: `src/presentation/layout/Layout.tsx`

- [ ] **Step 1: 创建 `src/presentation/bookSelector/BookSelector.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useBookStore } from '../../application/stores/bookStore'
import type { Book } from '../../domain/types/book'
import './BookSelector.css'

export function BookSelector() {
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.loadBooks)
  const openBook = useBookStore((s) => s.openBook)
  const createBook = useBookStore((s) => s.createBook)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const handleCreate = async () => {
    if (!title.trim() || !author.trim()) return
    await createBook(title.trim(), author.trim())
    setTitle('')
    setAuthor('')
    setShowCreate(false)
  }

  return (
    <div className="book-selector">
      <div className="book-selector-header">
        <h1>超级作者</h1>
        <p className="book-selector-subtitle">选择或创建一本书开始写作</p>
      </div>

      <div className="book-grid">
        {books.map((book: Book) => (
          <div key={book.id} className="book-card" onClick={() => openBook(book)}>
            <div className="book-card-cover">
              <span className="book-card-emoji">📖</span>
            </div>
            <div className="book-card-info">
              <h3>{book.title}</h3>
              <p className="book-card-author">{book.author}</p>
              {book.tags.length > 0 && (
                <div className="book-card-tags">
                  {book.tags.map((tag) => (
                    <span key={tag} className="book-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="book-card book-card-new" onClick={() => setShowCreate(true)}>
          <div className="book-card-cover">
            <span className="book-card-emoji">+</span>
          </div>
          <div className="book-card-info">
            <h3>新建书籍</h3>
            <p className="book-card-author">点击创建新书</p>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="book-selector-overlay">
          <div className="create-dialog">
            <h2>新建书籍</h2>
            <input
              className="create-input"
              placeholder="书名"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <input
              className="create-input"
              placeholder="作者"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <div className="create-actions">
              <button className="create-btn cancel" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="create-btn confirm" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/bookSelector/BookSelector.css`**

```css
.book-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: #1e1e1e;
}

.book-selector-header {
  text-align: center;
  margin-bottom: 40px;
}

.book-selector-header h1 {
  font-size: 32px;
  font-weight: 300;
  color: #cccccc;
  margin-bottom: 8px;
}

.book-selector-subtitle {
  color: #858585;
  font-size: 14px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-width: 700px;
  width: 100%;
}

.book-card {
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.book-card:hover {
  border-color: #007acc;
}

.book-card-cover {
  width: 48px;
  height: 48px;
  background-color: #333;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.book-card-emoji {
  font-size: 24px;
}

.book-card-info h3 {
  font-size: 15px;
  font-weight: 500;
  color: #cccccc;
  margin-bottom: 4px;
}

.book-card-author {
  font-size: 12px;
  color: #858585;
}

.book-card-tags {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.book-tag {
  font-size: 11px;
  padding: 2px 6px;
  background-color: #333;
  border-radius: 3px;
  color: #858585;
}

.book-card-new {
  border-style: dashed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.book-card-new .book-card-emoji {
  font-size: 32px;
  color: #858585;
}

.book-selector-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.create-dialog {
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 24px;
  width: 360px;
}

.create-dialog h2 {
  font-size: 18px;
  font-weight: 500;
  color: #cccccc;
  margin-bottom: 16px;
}

.create-input {
  width: 100%;
  padding: 8px 12px;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #cccccc;
  font-size: 14px;
  margin-bottom: 12px;
  outline: none;
}

.create-input:focus {
  border-color: #007acc;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.create-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.create-btn.cancel {
  background-color: #3c3c3c;
  color: #858585;
}

.create-btn.confirm {
  background-color: #007acc;
  color: #ffffff;
}

.create-btn.confirm:hover {
  background-color: #005a9e;
}
```

- [ ] **Step 3: 创建 `tests/presentation/BookSelector.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookSelector } from '../../src/presentation/bookSelector/BookSelector'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('BookSelector', () => {
  beforeEach(() => {
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(new MockFileService())
  })

  it('渲染标题和新建按钮', () => {
    render(<BookSelector />)
    expect(screen.getByText('超级作者')).toBeInTheDocument()
    expect(screen.getByText('新建书籍')).toBeInTheDocument()
  })

  it('打开新建对话框', async () => {
    render(<BookSelector />)
    await userEvent.click(screen.getByText('新建书籍'))
    expect(screen.getByPlaceholderText('书名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('作者')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: 修改 `src/presentation/layout/Layout.tsx` 集成 BookSelector**

```tsx
import { ActivityBar } from '../activityBar/ActivityBar'
import { AgentPanel } from '../agentPanel/AgentPanel'
import { EditorPanel } from '../editor/EditorPanel'
import { Sidebar } from '../sidebar/Sidebar'
import { BookSelector } from '../bookSelector/BookSelector'
import { useBookStore } from '../../application/stores/bookStore'
import './Layout.css'

export function Layout() {
  const currentBook = useBookStore((s) => s.currentBook)

  return (
    <div className="layout">
      <ActivityBar />
      {currentBook && <Sidebar />}
      {currentBook ? <EditorPanel /> : <BookSelector />}
      {currentBook && <AgentPanel />}
    </div>
  )
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/presentation/BookSelector.test.tsx`
Expected: 2 passed

- [ ] **Step 6: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 7: 提交**

```bash
git add src/presentation/bookSelector/ tests/presentation/BookSelector.test.tsx src/presentation/layout/Layout.tsx
git commit -m "feat: 实现书籍选择页面 BookSelector"
```

---

## Task 7: Monaco Editor 集成

**Files:**
- Modify: `src/presentation/editor/EditorPanel.tsx`

- [ ] **Step 1: 修改 `src/presentation/editor/EditorPanel.tsx` 集成 Monaco**

```tsx
import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef } from 'react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../application/stores/editorStore'
import { useBookStore } from '../../application/stores/bookStore'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const markDirty = useEditorStore((s) => s.markDirty)

  const chapterContent = useBookStore((s) => s.chapterContent)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const saveChapter = useBookStore((s) => s.saveChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleChange = (value: string | undefined) => {
    if (value !== undefined && activeTabId) {
      markDirty(activeTabId, true)
    }
  }

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 || !currentChapter ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>选择章节开始编辑</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            <Editor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={chapterContent}
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误（可能需要安装 @types 或 Monaco 自身的类型声明，`@monaco-editor/react` 通常自带）

注意：TypeScript 的 `noUnusedLocals: true` 可能对 `editorRef` 和 `saveChapter` 报未使用。按需使用或加下划线前缀。修改代码使用 `saveChapter`：

```tsx
const handleChange = (value: string | undefined) => {
  if (value !== undefined && activeTabId) {
    markDirty(activeTabId, true)
  }
}
```

改为：

```tsx
const handleChange = async (value: string | undefined) => {
  if (value !== undefined) {
    if (activeTabId) markDirty(activeTabId, true)
    // 直接保存（自动保存由后续 Task 处理）
  }
}
```

或暂时忽略 `editorRef` / `saveChapter` 的未使用告警。

- [ ] **Step 3: 运行所有测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/presentation/editor/EditorPanel.tsx
git commit -m "feat: 集成 Monaco Editor 替换占位 textarea"
```

---

## Task 8: 章节内容读写 + 自动保存

**Files:**
- Modify: `src/presentation/editor/EditorPanel.tsx`
- Modify: `src/application/stores/bookStore.ts`

- [ ] **Step 1: 修改 `src/presentation/editor/EditorPanel.tsx` 添加自动保存**

```tsx
import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef, useCallback, useEffect } from 'react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../application/stores/editorStore'
import { useBookStore } from '../../application/stores/bookStore'
import { EditorTabs } from './tabs/EditorTabs'
import { EditorStatusBar } from './EditorStatusBar'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const markDirty = useEditorStore((s) => s.markDirty)

  const chapterContent = useBookStore((s) => s.chapterContent)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const saveChapter = useBookStore((s) => s.saveChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(chapterContent)
  contentRef.current = chapterContent

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const doSave = useCallback(async () => {
    if (!currentChapter) return
    try {
      await saveChapter(contentRef.current)
      if (activeTabId) markDirty(activeTabId, false)
    } catch {
      // 保存失败暂不处理
    }
  }, [currentChapter, saveChapter, activeTabId, markDirty])

  // 自动保存定时器（5秒防抖）
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      contentRef.current = value
      if (activeTabId) markDirty(activeTabId, true)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(doSave, 5000)
    }
  }, [activeTabId, markDirty, doSave])

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        doSave()
      }
    }
  }, [doSave])

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 || !currentChapter ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>选择章节开始编辑</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            <Editor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={chapterContent}
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        )}
      </div>
      <EditorStatusBar />
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 3: 运行所有测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/presentation/editor/EditorPanel.tsx
git commit -m "feat: 章节自动保存 (5s debounce)"
```

---

## Task 9: 侧边栏章节树 + 大纲树

**Files:**
- Create: `src/presentation/sidebar/ChapterTree.tsx`
- Create: `src/presentation/sidebar/ChapterTree.css`
- Create: `tests/presentation/ChapterTree.test.tsx`
- Modify: `src/presentation/sidebar/Sidebar.tsx`

- [ ] **Step 1: 创建 `src/presentation/sidebar/ChapterTree.tsx`**

```tsx
import { useBookStore } from '../../application/stores/bookStore'
import type { Chapter } from '../../domain/types/chapter'
import './ChapterTree.css'

export function ChapterTree() {
  const chapters = useBookStore((s) => s.chapters)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const loadChapter = useBookStore((s) => s.loadChapter)
  const createChapter = useBookStore((s) => s.createChapter)
  const currentBook = useBookStore((s) => s.currentBook)

  const handleCreate = async () => {
    const title = prompt('输入章节名称：')
    if (title?.trim()) {
      await createChapter(title.trim())
    }
  }

  if (!currentBook) return null

  return (
    <div className="chapter-tree">
      <div className="chapter-tree-header">
        <span className="chapter-tree-title">章节</span>
        <button className="chapter-add-btn" onClick={handleCreate} title="新建章节">
          +
        </button>
      </div>
      <div className="chapter-list">
        {chapters.length === 0 && (
          <p className="chapter-empty">暂无章节，点击 + 新建</p>
        )}
        {chapters.map((chapter: Chapter) => (
          <div
            key={chapter.id}
            className={`chapter-item ${currentChapter?.id === chapter.id ? 'active' : ''}`}
            onClick={() => loadChapter(chapter)}
          >
            <span className="chapter-order">{String(chapter.order).padStart(2, '0')}</span>
            <span className="chapter-name">{chapter.title}</span>
            <span className="chapter-status">
              {chapter.status === 'completed' ? '✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/sidebar/ChapterTree.css`**

```css
.chapter-tree {
  display: flex;
  flex-direction: column;
}

.chapter-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #858585;
  font-weight: 600;
}

.chapter-add-btn {
  width: 20px;
  height: 20px;
  background: none;
  border: 1px solid #555;
  border-radius: 3px;
  color: #858585;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chapter-add-btn:hover {
  background-color: #3c3c3c;
  color: #cccccc;
}

.chapter-list {
  flex: 1;
  overflow-y: auto;
}

.chapter-empty {
  padding: 8px 16px;
  font-size: 12px;
  color: #858585;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #cccccc;
  gap: 8px;
}

.chapter-item:hover {
  background-color: #2a2d2e;
}

.chapter-item.active {
  background-color: #37373d;
}

.chapter-order {
  color: #858585;
  font-size: 11px;
  min-width: 20px;
  font-variant-numeric: tabular-nums;
}

.chapter-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-status {
  color: #4ec9b0;
  font-size: 12px;
}
```

- [ ] **Step 3: 修改 `src/presentation/sidebar/Sidebar.tsx` 集成 ChapterTree**

```tsx
import { useLayoutStore } from '../../application/stores/layoutStore'
import { ChapterTree } from './ChapterTree'
import './Sidebar.css'

export function Sidebar() {
  const visible = useLayoutStore((s) => s.sidebarVisible)
  const width = useLayoutStore((s) => s.panelSizes.sidebar)
  const activeActivity = useLayoutStore((s) => s.activeActivity)

  if (!visible) return null

  const renderPanel = () => {
    if (activeActivity === 'search') {
      return <p className="sidebar-placeholder">大纲（Phase 2 基础展示）</p>
    }
    if (activeActivity === 'characters') {
      return <p className="sidebar-placeholder">角色管理（后续 Phase 实现）</p>
    }
    // files 或未选中 → 章节树
    return <ChapterTree />
  }

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activeActivity === 'files' && '资源管理器'}
          {activeActivity === 'search' && '搜索'}
          {activeActivity === 'characters' && '角色管理'}
          {!activeActivity && '资源管理器'}
        </span>
      </div>
      <div className="sidebar-content">
        {renderPanel()}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 `tests/presentation/ChapterTree.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChapterTree } from '../../src/presentation/sidebar/ChapterTree'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('ChapterTree', () => {
  beforeEach(async () => {
    const fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(fs)
  })

  it('无书籍时返回 null', () => {
    const { container } = render(<ChapterTree />)
    expect(container.innerHTML).toBe('')
  })

  it('有章节时渲染列表', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = store.books[0]!
    await store.openBook(book)
    await store.createChapter('第一章')

    render(<ChapterTree />)
    expect(screen.getByText('第一章')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/presentation/ChapterTree.test.tsx`
Expected: 2 passed

- [ ] **Step 6: 提交**

```bash
git add src/presentation/sidebar/ tests/presentation/ChapterTree.test.tsx
git commit -m "feat: 实现侧边栏章节树 ChapterTree"
```

---

## Task 10: 状态栏

**Files:**
- Create: `src/presentation/editor/EditorStatusBar.tsx`
- Create: `tests/presentation/EditorStatusBar.test.tsx`
- Modify: `src/presentation/editor/EditorPanel.tsx`（如果 Task 8 未包含）

- [ ] **Step 1: 创建 `src/presentation/editor/EditorStatusBar.tsx`**

```tsx
import { useBookStore } from '../../application/stores/bookStore'
import './EditorStatusBar.css'

export function EditorStatusBar() {
  const currentChapter = useBookStore((s) => s.currentChapter)
  const chapterContent = useBookStore((s) => s.chapterContent)

  const wordCount = chapterContent
    ? chapterContent.replace(/[\s\n]/g, '').length
    : currentChapter?.wordCount ?? 0

  const status = currentChapter?.status === 'completed' ? '已完成' : '草稿'
  const fileName = currentChapter ? `${currentChapter.title}.md` : '未打开'

  return (
    <div className="editor-statusbar">
      <span className="statusbar-item">{fileName}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">字数: {wordCount.toLocaleString()}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">{status}</span>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/editor/EditorStatusBar.css`**

```css
.editor-statusbar {
  height: 24px;
  background-color: #007acc;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #ffffff;
  flex-shrink: 0;
}

.statusbar-item {
  white-space: nowrap;
}

.statusbar-divider {
  width: 1px;
  height: 14px;
  background-color: rgba(255, 255, 255, 0.3);
  margin: 0 10px;
}
```

- [ ] **Step 3: 创建 `tests/presentation/EditorStatusBar.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditorStatusBar } from '../../src/presentation/editor/EditorStatusBar'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('EditorStatusBar', () => {
  beforeEach(async () => {
    const fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(fs)
  })

  it('无章节时显示默认状态', () => {
    render(<EditorStatusBar />)
    expect(screen.getByText('未打开')).toBeInTheDocument()
    expect(screen.getByText('字数: 0')).toBeInTheDocument()
  })

  it('有章节时显示文件名和字数', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = store.books[0]!
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = store.chapters[0]!
    await store.loadChapter(chapter)

    render(<EditorStatusBar />)
    expect(screen.getByText(/第一章\.md/)).toBeInTheDocument()
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run tests/presentation/EditorStatusBar.test.tsx`
Expected: 2 passed

- [ ] **Step 5: 提交**

```bash
git add src/presentation/editor/EditorStatusBar.tsx src/presentation/editor/EditorStatusBar.css tests/presentation/EditorStatusBar.test.tsx
git commit -m "feat: 实现状态栏 — 字数统计 + 文件状态"
```

---

## Task 11: Phase 2 集成测试

**Files:**
- Create: `tests/phase2/Phase2.test.tsx`

- [ ] **Step 1: 创建 `tests/phase2/Phase2.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Layout } from '../../src/presentation/layout/Layout'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useLayoutStore } from '../../src/application/stores/layoutStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('Phase 2 集成测试', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
    useEditorStore.setState({ tabs: [], activeTabId: null })
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(new MockFileService())
  })

  it('无书籍时显示 BookSelector', () => {
    render(<Layout />)
    expect(screen.getByText('选择或创建一本书开始写作')).toBeInTheDocument()
  })

  it('打开书籍后显示编辑器和侧边栏', async () => {
    const store = useBookStore.getState()
    await store.createBook('测试书', '作者')
    const book = store.books[0]!
    await store.openBook(book)

    render(<Layout />)
    expect(screen.getByText('资源管理器')).toBeInTheDocument()
    expect(screen.getByText('选择章节开始编辑')).toBeInTheDocument()
  })

  it('完整流程：新建书籍 → 新建章 → 编辑内容', async () => {
    render(<Layout />)

    // 点击新建书籍
    await userEvent.click(screen.getByText('新建书籍'))
    await userEvent.type(screen.getByPlaceholderText('书名'), '我的小说')
    await userEvent.type(screen.getByPlaceholderText('作者'), '作者名')
    await userEvent.click(screen.getByText('创建'))

    // 应该显示侧边栏和编辑器
    expect(screen.getByText('资源管理器')).toBeInTheDocument()
    expect(screen.getByText('选择章节开始编辑')).toBeInTheDocument()
  })

  it('状态栏显示字数信息', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = store.books[0]!
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = store.chapters[0]!
    await store.loadChapter(chapter)
    await store.saveChapter('正文内容一千字')

    render(<Layout />)
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行集成测试**

Run: `npx vitest run tests/phase2/Phase2.test.tsx`
Expected: 4 passed

- [ ] **Step 3: 运行全部测试**

Run: `npm test`
Expected: 全部通过（约 36 个测试）

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 编译无错误

- [ ] **Step 5: 运行 lint**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add tests/phase2/
git commit -m "test: Phase 2 集成测试（创建书籍→章节→编辑→状态栏）"
```

---

## Phase 2 完成标志

- [x] Tauri v2 壳集成（`src-tauri/` 含 5 个 Rust FS commands）
- [x] 领域类型定义（Book, Chapter, FileEntry, etc.）
- [x] FileService 三层架构 (Interface → Mock → Tauri)
- [x] BookRepository（创建/打开/列取/更新）
- [x] ChapterRepository（创建/列表/读写）
- [x] bookStore（Zustand 状态管理）
- [x] 书籍选择页面（列表 + 新建对话框）
- [x] Monaco Editor 集成（markdown 编辑、多标签）
- [x] 章节自动保存（5s debounce）
- [x] 侧边栏章节树
- [x] 状态栏（字数统计、文件状态）
- [x] 全部测试通过
- [x] TypeScript 编译通过
- [x] Lint 无错误
