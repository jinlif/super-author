import type { Book, BookMeta, CreateBookInput } from '../domain/types/book'
import type { IFileService } from './IFileService'

const DEFAULT_COMMANDS: Record<string, string> = {
  'continue.md': `---
name: continue
description: 续写当前章节
---
请根据上文内容，继续往下写约 500 字。保持风格一致，情节自然推进。
`,
  'polish.md': `---
name: polish
description: 润色改写选中文本
---
请对以下文本进行润色改写，提升文学性和可读性，保持原意不变：

{cursor}
`,
  'outline.md': `---
name: outline
description: 生成章节大纲
---
请根据当前故事进展，为下一章生成一个大纲，包含：
1. 章节标题建议
2. 主要情节节点
3. 涉及角色
4. 预计字数
`,
}

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
          console.warn(`跳过没有 book.json 的目录: ${entry.path}`)
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
    await this.fs.createDir(`${bookDir}/.super-author/skills`)
    await this.fs.createDir(`${bookDir}/.super-author/commands`)
    for (const [name, content] of Object.entries(DEFAULT_COMMANDS)) {
      await this.fs.writeFile(`${bookDir}/.super-author/commands/${name}`, content)
    }

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
