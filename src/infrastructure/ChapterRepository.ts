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
      if (entry.isDir) {
        // 卷目录 — 递归扫描卷内章节
        const volumeName = entry.name
        const volumeEntries = await this.fs.readDir(entry.path)
        for (const volumeEntry of volumeEntries) {
          if (!volumeEntry.isDir && volumeEntry.name.endsWith('.md')) {
            const content = await this.fs.readFile(volumeEntry.path)
            chapters.push(this.parseChapter(bookDir, volumeEntry, content, volumeName))
          }
        }
      } else if (entry.name.endsWith('.md')) {
        // 根级别章节
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

  async createChapter(bookDir: string, title: string, volume?: string): Promise<Chapter> {
    const chapters = await this.listChapters(bookDir)
    const chaptersInScope = volume
      ? chapters.filter((c) => c.volume === volume)
      : chapters.filter((c) => !c.volume)
    const nextOrder =
      chaptersInScope.length > 0 ? Math.max(...chaptersInScope.map((c) => c.order)) + 1 : 1
    const orderStr = String(nextOrder).padStart(2, '0')
    const fileName = `${orderStr}-${title}.md`
    const baseDir = volume ? `${bookDir}/chapters/${volume}` : `${bookDir}/chapters`
    const filePath = `${baseDir}/${fileName}`
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
      volume,
      createdAt: now,
      updatedAt: now,
    }
  }

  private parseChapter(
    bookDir: string,
    entry: { name: string; path: string },
    content: string,
    volume?: string,
  ): Chapter {
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
      volume,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}
