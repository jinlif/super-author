import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { useLayoutStore } from '../../src/application/stores/layoutStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { Layout } from '../../src/presentation/layout/Layout'

describe('Layout', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
    useEditorStore.setState({ tabs: [], activeTabId: null, pendingCloseTabId: null, pendingCloseTabFileName: '' })
    useBookStore.setState({
      books: [],
      currentBook: {
        id: 'test-book',
        title: '测试书籍',
        author: '测试作者',
        description: '',
        tags: [],
        style: '',
        directory: '/books/test-book',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      chapters: [],
      currentChapter: null,
      chapterContent: '',
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(new MockFileService())
  })

  it('渲染四个面板区域', () => {
    render(<Layout />)
    expect(screen.getByTitle('文件')).toBeInTheDocument()
    expect(screen.getByTitle('搜索')).toBeInTheDocument()
    expect(screen.getByTitle('角色')).toBeInTheDocument()
    expect(screen.getByTitle('设置')).toBeInTheDocument()
    expect(screen.getByText('超级作者')).toBeInTheDocument()
    expect(screen.getByText('AI 助手')).toBeInTheDocument()
  })

  it('可以通过 toggleAgent 隐藏 Agent 面板', () => {
    useLayoutStore.getState().toggleAgent()
    render(<Layout />)
    expect(screen.queryByText('AI 助手')).not.toBeInTheDocument()
  })

  it('可以通过 toggleSidebar 隐藏侧边栏', () => {
    useLayoutStore.getState().toggleSidebar()
    render(<Layout />)
    expect(screen.queryByText('资源管理器')).not.toBeInTheDocument()
  })

  it('打开文件后显示标签', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md', '# 测试内容')
    render(<Layout />)
    expect(screen.getAllByText('01-开篇.md').length).toBeGreaterThanOrEqual(1)
  })
})
