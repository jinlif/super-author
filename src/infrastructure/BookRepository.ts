import type { Book, BookMeta, CreateBookInput } from '../domain/types/book'
import type { IFileService } from './IFileService'

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
