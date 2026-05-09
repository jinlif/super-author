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
    const book = useBookStore.getState().books[0]!
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = useBookStore.getState().chapters[0]!
    await store.loadChapter(chapter)

    render(<EditorStatusBar />)
    expect(screen.getByText(/第一章\.md/)).toBeInTheDocument()
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
