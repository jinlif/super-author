import { create } from 'zustand'
import type { Book } from '../../domain/types/book'
import type { Chapter } from '../../domain/types/chapter'
import { BookRepository } from '../../infrastructure/BookRepository'
import { ChapterRepository } from '../../infrastructure/ChapterRepository'
import { ConfigService } from '../../infrastructure/ConfigService'
import { createFileService } from '../../infrastructure/createFileService'
import type { IFileService } from '../../infrastructure/IFileService'

interface BookStore {
  books: Book[]
  currentBook: Book | null
  chapters: Chapter[]
  currentChapter: Chapter | null
  bookDescription: string
  isLoading: boolean
  fileExplorerRefreshKey: number

  _bookRepo: BookRepository
  _chapterRepo: ChapterRepository
  _fs: IFileService
  _homeDir: string | null
  _configService: ConfigService | null
  setFileService: (fs: IFileService, homeDir: string) => void

  loadBooks: () => Promise<void>
  createBook: (title: string, author: string) => Promise<Book>
  openBook: (book: Book) => Promise<void>
  closeBook: () => void
  createChapter: (title: string, volume?: string) => Promise<void>
  loadChapter: (chapter: Chapter) => Promise<string>
  saveChapter: (content: string, chapter?: Chapter) => Promise<void>
  updateBookMeta: (book: Book) => Promise<void>
  refreshFileExplorer: () => void
}

function createRepos(fs?: IFileService) {
  const fileService = fs ?? createFileService()
  return {
    bookRepo: new BookRepository(fileService),
    chapterRepo: new ChapterRepository(fileService),
    fs: fileService,
  }
}

export const useBookStore = create<BookStore>((set, get) => {
  const { bookRepo, chapterRepo, fs } = createRepos()

  async function getConfigService(): Promise<ConfigService> {
    const state = get()
    if (state._configService) return state._configService
    const homeDir = await state._fs.getHomeDir()
    const cs = new ConfigService(state._fs, homeDir)
    set({ _homeDir: homeDir, _configService: cs })
    return cs
  }

  return {
    books: [],
    currentBook: null,
    chapters: [],
    currentChapter: null,
    bookDescription: '',
    isLoading: false,
    fileExplorerRefreshKey: 0,

    _bookRepo: bookRepo,
    _chapterRepo: chapterRepo,
    _fs: fs,
    _homeDir: null,
    _configService: null,

    setFileService: (fs: IFileService, homeDir: string) => {
      const repos = createRepos(fs)
      set({
        _bookRepo: repos.bookRepo,
        _chapterRepo: repos.chapterRepo,
        _fs: repos.fs,
        _homeDir: homeDir,
        _configService: new ConfigService(fs, homeDir),
      })
    },

    loadBooks: async () => {
      const repo = get()._bookRepo
      const cs = await getConfigService()
      const books = await repo.listBooks(cs.booksDir)
      set({ books })
    },

    createBook: async (title: string, author: string) => {
      const repo = get()._bookRepo
      const cs = await getConfigService()
      const book = await repo.createBook(cs.booksDir, { title, author })
      set((state) => ({ books: [...state.books, book] }))
      return book
    },

    openBook: async (book: Book) => {
      set({ isLoading: true })
      const repo = get()._chapterRepo
      const chapters = await repo.listChapters(book.directory)

      // 确保 dirDescriptions 有默认值
      const defaultDirDescs: Record<string, string> = {
        'chapters/': '存放章节正文',
        'characters/': '角色设定卡',
        'outline/': '大纲',
      }
      if (!book.dirDescriptions) {
        book.dirDescriptions = { ...defaultDirDescs }
      } else {
        for (const [key, val] of Object.entries(defaultDirDescs)) {
          if (!book.dirDescriptions[key]) {
            book.dirDescriptions[key] = val
          }
        }
      }

      // 读取 DESCRIPTION.md
      let bookDescription = ''
      try {
        const descPath = `${book.directory}/DESCRIPTION.md`
        if (await get()._fs.exists(descPath)) {
          bookDescription = await get()._fs.readFile(descPath)
        }
      } catch {
        // DESCRIPTION.md 不存在或读取失败
      }

      set({
        currentBook: book,
        chapters,
        currentChapter: null,
        bookDescription,
        isLoading: false,
      })
    },

    closeBook: () => {
      set({
        currentBook: null,
        chapters: [],
        currentChapter: null,
        bookDescription: '',
      })
    },

    createChapter: async (title: string, volume?: string) => {
      const book = get().currentBook
      if (!book) throw new Error('没有打开书籍')
      const repo = get()._chapterRepo
      const chapter = await repo.createChapter(book.directory, title, volume)
      set((state) => ({ chapters: [...state.chapters, chapter] }))
    },

    loadChapter: async (chapter: Chapter) => {
      const repo = get()._chapterRepo
      const content = await repo.readChapter(chapter.filePath)
      set({ currentChapter: chapter })
      return content
    },

    saveChapter: async (content: string, chapter?: Chapter) => {
      const ch = chapter ?? get().currentChapter
      if (!ch) throw new Error('没有打开的章节')
      const repo = get()._chapterRepo
      const wordCount = content.replace(/[\s\n]/g, '').length
      const updated = { ...ch, wordCount, updatedAt: new Date().toISOString() }
      await repo.writeChapter(ch.filePath, content)
      set({
        currentChapter: updated,
        chapters: get().chapters.map((c) => (c.id === ch.id ? updated : c)),
      })
    },

    updateBookMeta: async (book: Book) => {
      const repo = get()._bookRepo
      await repo.updateBookMeta(book)
      set({ currentBook: book })
    },

    refreshFileExplorer: () => {
      set((state) => ({ fileExplorerRefreshKey: state.fileExplorerRefreshKey + 1 }))
      // 文件变更时使 @ 引用缓存失效
      import('../services/FileMentionService').then((m) => m.FileMentionService.invalidateCache())
    },
  }
})
