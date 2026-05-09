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
    const book = useBookStore.getState().books[0]!
    await store.openBook(book)
    await store.createChapter('第一章')

    render(<ChapterTree />)
    expect(screen.getByText('第一章')).toBeInTheDocument()
  })
})
