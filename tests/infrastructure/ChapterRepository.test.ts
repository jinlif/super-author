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
