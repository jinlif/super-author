import { beforeEach, describe, expect, it } from 'vitest'
import { BookRepository } from '../../src/infrastructure/BookRepository'
import { MockFileService } from '../../src/infrastructure/MockFileService'

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
