import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

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
    const { books } = useBookStore.getState()
    expect(books).toHaveLength(1)
    expect(books[0]?.title).toBe('我的书')
  })

  it('openBook 设置 currentBook 并加载章节', async () => {
    await useBookStore.getState().createBook('小说', '作者')
    const state = useBookStore.getState()
    const book = state.books[0]
    expect(book).toBeDefined()
    if (!book) return
    await useBookStore.getState().openBook(book)
    expect(useBookStore.getState().currentBook?.id).toBe(book.id)
    expect(useBookStore.getState().chapters).toHaveLength(0)
  })

  it('createChapter 添加章节到当前书籍', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const state = useBookStore.getState()
    const book = state.books[0]
    if (!book) return
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('第一章')
    const { chapters } = useBookStore.getState()
    expect(chapters).toHaveLength(1)
    expect(chapters[0]?.title).toBe('第一章')
  })

  it('loadChapter 读取并设置 chapterContent', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const state = useBookStore.getState()
    const book = state.books[0]
    if (!book) return
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('测试')
    const chapter = useBookStore.getState().chapters[0]
    if (!chapter) return
    await useBookStore.getState().loadChapter(chapter)
    expect(useBookStore.getState().currentChapter?.id).toBe(chapter.id)
    expect(useBookStore.getState().chapterContent).toBe('# 测试\n\n')
  })

  it('saveChapter 保存内容并更新字数', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const state = useBookStore.getState()
    const book = state.books[0]
    if (!book) return
    await useBookStore.getState().openBook(book)
    await useBookStore.getState().createChapter('章')
    const chapter = useBookStore.getState().chapters[0]
    if (!chapter) return
    await useBookStore.getState().loadChapter(chapter)
    await useBookStore.getState().saveChapter('新内容正文')
    expect(useBookStore.getState().chapterContent).toBe('新内容正文')
    expect(useBookStore.getState().currentChapter?.wordCount).toBe(5)
  })

  it('closeBook 重置状态', async () => {
    await useBookStore.getState().createBook('书', '作者')
    const state = useBookStore.getState()
    const book = state.books[0]
    if (!book) return
    await useBookStore.getState().openBook(book)
    useBookStore.getState().closeBook()
    expect(useBookStore.getState().currentBook).toBeNull()
    expect(useBookStore.getState().chapters).toHaveLength(0)
    expect(useBookStore.getState().chapterContent).toBe('')
  })
})
