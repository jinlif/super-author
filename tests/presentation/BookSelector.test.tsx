import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookSelector } from '../../src/presentation/bookSelector/BookSelector'
import { useBookStore } from '../../src/application/stores/bookStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('BookSelector', () => {
  beforeEach(() => {
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(new MockFileService())
  })

  it('渲染标题和新建按钮', () => {
    render(<BookSelector />)
    expect(screen.getByText('超级作者')).toBeInTheDocument()
    expect(screen.getByText('新建书籍')).toBeInTheDocument()
  })

  it('打开新建对话框', async () => {
    render(<BookSelector />)
    await userEvent.click(screen.getByText('新建书籍'))
    expect(screen.getByPlaceholderText('书名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('作者')).toBeInTheDocument()
  })
})
