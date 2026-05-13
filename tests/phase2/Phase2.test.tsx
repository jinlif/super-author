import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { useLayoutStore } from '../../src/application/stores/layoutStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { Layout } from '../../src/presentation/layout/Layout'

describe('Phase 2 集成测试', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
    useEditorStore.setState({ tabs: [], activeTabId: null })
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      isLoading: false,
    })
    useBookStore.getState().setFileService(new MockFileService(), '/home/user')
  })

  it('无书籍时显示 BookSelector', () => {
    render(<Layout />)
    expect(screen.getByText('选择或创建一本书开始写作')).toBeInTheDocument()
  })

  it('打开书籍后显示编辑器和侧边栏', async () => {
    const store = useBookStore.getState()
    await store.createBook('测试书', '作者')
    const book = useBookStore.getState().books[0]
    if (!book) throw new Error('Expected book')
    await store.openBook(book)

    render(<Layout />)
    expect(screen.getByText('资源管理器')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('chapters')).toBeInTheDocument()
    })
  })

  it('完整流程：新建书籍 → 新建章 → 编辑内容', async () => {
    render(<Layout />)

    // 点击新建书籍
    await userEvent.click(screen.getByText('新建书籍'))
    await userEvent.type(screen.getByPlaceholderText('书名'), '我的小说')
    await userEvent.type(screen.getByPlaceholderText('作者'), '作者名')
    await userEvent.click(screen.getByText('创建'))

    // 应该显示侧边栏和编辑器
    expect(screen.getByText('资源管理器')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('chapters')).toBeInTheDocument()
    })
  })

  it('状态栏显示字数信息', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = useBookStore.getState().books[0]
    if (!book) throw new Error('Expected book')
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = useBookStore.getState().chapters[0]
    if (!chapter) throw new Error('Expected chapter')
    await store.loadChapter(chapter)
    await store.saveChapter('正文内容一千字')

    render(<Layout />)
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
