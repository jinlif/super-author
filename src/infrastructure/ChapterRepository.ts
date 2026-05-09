import type { Chapter } from '../domain/types/chapter'
import type { IFileService } from './IFileService'

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
    const nextOrder = chapters.length > 0 ? Math.max(...chapters.map((c) => c.order)) + 1 : 1
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
    await this.fs.writeFile(filePath, '')
  }

  private parseChapter(
    bookDir: string,
    entry: { name: string; path: string },
    content: string,
  ): Chapter {
    // 文件名格式: "01-标题.md"
    const match = entry.name.match(/^(\d+)-(.+)\.md$/)
    let order = 99
    let title = entry.name.replace(/\.md$/, '')
    if (match) {
      const [, orderStr, titleStr] = match
      if (orderStr) order = Number.parseInt(orderStr, 10)
      if (titleStr) title = titleStr
    }

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
