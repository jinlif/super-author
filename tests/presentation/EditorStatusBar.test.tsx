// tests/presentation/EditorStatusBar.test.tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useModelService } from '../../src/application/services/ModelService'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { EditorStatusBar } from '../../src/presentation/editor/EditorStatusBar'

describe('EditorStatusBar', () => {
  beforeEach(async () => {
    const fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      isLoading: false,
    })
    useBookStore.getState().setFileService(fs, '/home/user')
    useEditorStore.setState({ tabs: [], activeTabId: null })
    useModelService.setState({
      models: {},
      refCount: {},
      pendingCloseUri: null,
      pendingCloseFileName: '',
    })
  })

  it('无标签时显示默认状态', () => {
    render(<EditorStatusBar liveWordCount={0} />)
    expect(screen.getByText('未打开')).toBeInTheDocument()
    expect(screen.getByText('字数: 0')).toBeInTheDocument()
  })

  it('有激活标签时显示文件名和字数', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = useBookStore.getState().books[0]
    if (!book) throw new Error('Expected book')
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = useBookStore.getState().chapters[0]
    if (!chapter) throw new Error('Expected chapter')

    const content = await store.loadChapter(chapter)
    useEditorStore.getState().openFile(chapter.filePath, '第一章.md', content)

    render(<EditorStatusBar liveWordCount={0} />)
    expect(screen.getByText('第一章.md')).toBeInTheDocument()
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
