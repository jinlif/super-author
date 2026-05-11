import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { useModelService } from '../../src/application/services/ModelService'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { FileExplorer } from '../../src/presentation/fileExplorer/FileExplorer'

function createBookJson(title: string) {
  return JSON.stringify({
    title,
    author: '作者',
    description: '',
    tags: [],
    style: '',
    createdAt: '',
    updatedAt: '',
  })
}

describe('FileExplorer', () => {
  let fs: MockFileService

  beforeEach(async () => {
    fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      isLoading: false,
    })
    useBookStore.getState().setFileService(fs)
    useEditorStore.setState({ tabs: [], activeTabId: null })
  })

  it('无书籍时显示空状态', () => {
    render(<FileExplorer />)
    expect(screen.getByText('未打开书籍')).toBeInTheDocument()
  })

  it('有书籍时显示目录结构', async () => {
    await fs.createDir('/home/user/.superauthor/books')
    await fs.createDir('/home/user/.superauthor/books/测试书')
    await fs.createDir('/home/user/.superauthor/books/测试书/chapters')
    await fs.createDir('/home/user/.superauthor/books/测试书/outline')
    await fs.createDir('/home/user/.superauthor/books/测试书/characters')
    await fs.writeFile(
      '/home/user/.superauthor/books/测试书/book.json',
      JSON.stringify({
        title: '测试书', author: '作者', description: '',
        tags: [], style: '', createdAt: '', updatedAt: '',
      }),
    )
    useBookStore.setState({
      currentBook: {
        id: 'test-id',
        title: '测试书',
        author: '作者',
        description: '',
        tags: [],
        style: '',
        directory: '/home/user/.superauthor/books/测试书',
        createdAt: '',
        updatedAt: '',
      },
    })

    render(<FileExplorer />)

    await waitFor(() => {
      expect(screen.getByText('chapters')).toBeInTheDocument()
    })
    expect(screen.getByText('outline')).toBeInTheDocument()
    expect(screen.getByText('characters')).toBeInTheDocument()
  })

  it('系统目录使用正确的颜色标识', async () => {
    await fs.createDir('/home/user/.superauthor/books')
    await fs.createDir('/home/user/.superauthor/books/书')
    await fs.createDir('/home/user/.superauthor/books/书/chapters')
    await fs.createDir('/home/user/.superauthor/books/书/outline')
    await fs.createDir('/home/user/.superauthor/books/书/characters')
    await fs.writeFile(
      '/home/user/.superauthor/books/书/book.json',
      createBookJson('书'),
    )
    useBookStore.setState({
      currentBook: {
        id: 'test',
        title: '书',
        author: '作者',
        description: '',
        tags: [],
        style: '',
        directory: '/home/user/.superauthor/books/书',
        createdAt: '',
        updatedAt: '',
      },
    })

    render(<FileExplorer />)

    await waitFor(() => {
      expect(screen.getByText('chapters')).toBeInTheDocument()
    })
    const chaptersEl = screen.getByText('chapters')
    expect(chaptersEl.style.color).toBe('rgb(79, 195, 247)')
  })

  // 5.2: 测试卷创建/章节创建/编号逻辑
  describe('卷和章节操作', () => {
    const bookDir = '/home/user/.superauthor/books/测试书'
    const chaptersDir = `${bookDir}/chapters`

    beforeEach(async () => {
      await fs.createDir(bookDir)
      await fs.createDir(chaptersDir)
      await fs.writeFile(`${bookDir}/book.json`, createBookJson('测试书'))
      useBookStore.setState({
        currentBook: {
          id: '测试书',
          title: '测试书',
          author: '作者',
          description: '',
          tags: [],
          style: '',
          directory: bookDir,
          createdAt: '',
          updatedAt: '',
        },
      })
    })

    function renderFileExplorer() {
      return render(<FileExplorer />)
    }

    it('创建卷时自动编号 01', async () => {
      const user = userEvent.setup()
      renderFileExplorer()

      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })

      // 右键 chapters → 新增卷
      fireEvent.contextMenu(screen.getByText('chapters'))

      await waitFor(() => {
        expect(screen.getByText('新增卷')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增卷'))

      await waitFor(() => {
        expect(screen.getByText('请输入卷名:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '黑暗森林')
      await user.click(screen.getByText('确定'))

      // 验证目录在文件系统上创建
      await waitFor(async () => {
        const entries = await fs.readDir(chaptersDir)
        expect(entries.some((e) => e.name === '01_黑暗森林')).toBe(true)
      })
    })

    it('创建第二个卷时编号为 02', async () => {
      const user = userEvent.setup()

      await fs.createDir(`${chaptersDir}/01_黑暗森林`)

      renderFileExplorer()

      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })

      fireEvent.contextMenu(screen.getByText('chapters'))

      await waitFor(() => {
        expect(screen.getByText('新增卷')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增卷'))

      await waitFor(() => {
        expect(screen.getByText('请输入卷名:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '星际迷航')
      await user.click(screen.getByText('确定'))

      await waitFor(async () => {
        const entries = await fs.readDir(chaptersDir)
        expect(entries.some((e) => e.name === '02_星际迷航')).toBe(true)
      })
    })

    it('在卷内创建章节时自动编号 01', async () => {
      const user = userEvent.setup()
      const volDir = `${chaptersDir}/01_黑暗森林`
      await fs.createDir(volDir)

      renderFileExplorer()

      // 展开 chapters 目录
      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01_黑暗森林')).toBeInTheDocument()
      })

      // 右键卷目录 → 新增章节
      fireEvent.contextMenu(screen.getByText('01_黑暗森林'))
      await waitFor(() => {
        expect(screen.getByText('新增章节')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增章节'))

      await waitFor(() => {
        expect(screen.getByText('请输入章节标题:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '觉醒')
      await user.click(screen.getByText('确定'))

      // 验证文件系统
      const entries = await fs.readDir(volDir)
      expect(entries.some((e) => e.name === '01-觉醒.md')).toBe(true)
    })

    it('在卷内创建第二个章节时编号递增为 02', async () => {
      const user = userEvent.setup()
      const volDir = `${chaptersDir}/01_黑暗森林`
      await fs.createDir(volDir)
      await fs.writeFile(`${volDir}/01-觉醒.md`, '# 觉醒\n\n')

      renderFileExplorer()

      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01_黑暗森林')).toBeInTheDocument()
      })

      fireEvent.contextMenu(screen.getByText('01_黑暗森林'))
      await waitFor(() => {
        expect(screen.getByText('新增章节')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增章节'))

      await waitFor(() => {
        expect(screen.getByText('请输入章节标题:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '探索')
      await user.click(screen.getByText('确定'))

      const entries = await fs.readDir(volDir)
      expect(entries.some((e) => e.name === '02-探索.md')).toBe(true)
    })

    it('不同卷之间章节编号独立', async () => {
      const vol1 = `${chaptersDir}/01_黑暗森林`
      const vol2 = `${chaptersDir}/02_星际迷航`
      await fs.createDir(vol1)
      await fs.createDir(vol2)
      await fs.writeFile(`${vol1}/01-觉醒.md`, '# 觉醒\n\n')

      const user = userEvent.setup()
      renderFileExplorer()

      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('02_星际迷航')).toBeInTheDocument()
      })

      fireEvent.contextMenu(screen.getByText('02_星际迷航'))
      await waitFor(() => {
        expect(screen.getByText('新增章节')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增章节'))

      await waitFor(() => {
        expect(screen.getByText('请输入章节标题:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '相遇')
      await user.click(screen.getByText('确定'))

      const entries = await fs.readDir(vol2)
      expect(entries.some((e) => e.name === '01-相遇.md')).toBe(true)
    })

    it('在 chapters 根级创建章节也正确编号', async () => {
      const user = userEvent.setup()
      await fs.writeFile(`${chaptersDir}/01-序章.md`, '# 序章\n\n')

      renderFileExplorer()

      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })

      fireEvent.contextMenu(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('新增章节')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新增章节'))

      await waitFor(() => {
        expect(screen.getByText('请输入章节标题:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.type(input, '新的开始')
      await user.click(screen.getByText('确定'))

      const entries = await fs.readDir(chaptersDir)
      expect(entries.some((e) => e.name === '02-新的开始.md')).toBe(true)
    })
  })

  // 5.4: 测试目录同名校验
  describe('目录同名校验', () => {
    const bookDir = '/home/user/.superauthor/books/测试书'

    beforeEach(async () => {
      await fs.createDir(bookDir)
      await fs.writeFile(`${bookDir}/book.json`, createBookJson('测试书'))
      useBookStore.setState({
        currentBook: {
          id: '测试书',
          title: '测试书',
          author: '作者',
          description: '',
          tags: [],
          style: '',
          directory: bookDir,
          createdAt: '',
          updatedAt: '',
        },
      })
    })

    it('新建同名目录时提示错误', async () => {
      const user = userEvent.setup()

      // 在书根目录创建两个目录：父目录 和 灵感
      await fs.createDir(`${bookDir}/父目录`)
      await fs.createDir(`${bookDir}/灵感`)

      render(<FileExplorer />)

      await waitFor(() => {
        expect(screen.getByText('父目录')).toBeInTheDocument()
      })

      // 右键「父目录」→ 新建目录（会在父目录内部创建子目录）
      fireEvent.contextMenu(screen.getByText('父目录'))
      await waitFor(() => {
        expect(screen.getByText('新建目录')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新建目录'))

      await waitFor(() => {
        expect(screen.getByText('请输入目录名称:')).toBeInTheDocument()
      })
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '灵感')
      await user.click(screen.getByText('确定'))

      // 第一次创建「父目录/灵感」应成功（因为父目录下还没有灵感）
      let parentEntries = await fs.readDir(`${bookDir}/父目录`)
      expect(parentEntries.some((e) => e.name === '灵感')).toBe(true)

      // 再次右键「父目录」→ 新建目录 → 输入同名
      await user.click(screen.getByText('父目录')) // close context menu if any
      fireEvent.contextMenu(screen.getByText('父目录'))
      await waitFor(() => {
        expect(screen.getByText('新建目录')).toBeInTheDocument()
      })
      await user.click(screen.getByText('新建目录'))

      await waitFor(() => {
        expect(screen.getByText('请输入目录名称:')).toBeInTheDocument()
      })
      const input2 = screen.getByRole('textbox')
      await user.clear(input2)
      await user.type(input2, '灵感')
      await user.click(screen.getByText('确定'))

      // 应出现错误提示
      await waitFor(() => {
        expect(screen.getByText(/已存在/)).toBeInTheDocument()
      })

      // 确认父目录下仍然只有一个「灵感」
      parentEntries = await fs.readDir(`${bookDir}/父目录`)
      const matched = parentEntries.filter((e) => e.name === '灵感')
      expect(matched.length).toBe(1)
    })
  })

  // 删除同步测试
  describe('文件删除同步', () => {
    const bookDir = '/home/user/.superauthor/books/测试书'
    const chaptersDir = `${bookDir}/chapters`

    beforeEach(async () => {
      await fs.createDir(bookDir)
      await fs.createDir(chaptersDir)
      await fs.writeFile(`${bookDir}/book.json`, createBookJson('测试书'))
      useBookStore.setState({
        currentBook: {
          id: '测试书',
          title: '测试书',
          author: '作者',
          description: '',
          tags: [],
          style: '',
          directory: bookDir,
          createdAt: '',
          updatedAt: '',
        },
      })
      useEditorStore.setState({ tabs: [], activeTabId: null })
      useModelService.setState({ models: {}, refCount: {} })
    })

    it('删除已打开的文件时应关闭标签页', async () => {
      const user = userEvent.setup()
      const filePath = `${chaptersDir}/01-第一章.md`
      await fs.writeFile(filePath, '# 第一章\n\n')

      // 打开文件
      useEditorStore.getState().openFile(filePath, '01-第一章.md', '# 第一章\n\n')
      expect(useEditorStore.getState().tabs.length).toBe(1)

      render(<FileExplorer />)

      // 展开 chapters 目录
      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01-第一章.md')).toBeInTheDocument()
      })

      // 右键删除
      fireEvent.contextMenu(screen.getByText('01-第一章.md'))
      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
      await user.click(screen.getByText('删除'))

      // 确认删除
      await waitFor(() => {
        expect(screen.getByText('确定')).toBeInTheDocument()
      })
      await user.click(screen.getByText('确定'))

      // 验证标签页已关闭
      await waitFor(() => {
        expect(useEditorStore.getState().tabs.length).toBe(0)
      })

      // 验证文件已删除
      const entries = await fs.readDir(chaptersDir)
      expect(entries.some((e) => e.name === '01-第一章.md')).toBe(false)
    })

    it('删除有未保存修改的文件时应阻止删除', async () => {
      const user = userEvent.setup()
      const filePath = `${chaptersDir}/01-第一章.md`
      await fs.writeFile(filePath, '# 第一章\n\n')

      // 打开文件
      useEditorStore.getState().openFile(filePath, '01-第一章.md', '# 第一章\n\n')

      // 创建模型并修改
      const model = useModelService.getState().getOrCreate(filePath, '01-第一章.md', '# 第一章\n\n')
      useModelService.getState().updateValue(filePath, '# 修改后的内容\n\n')

      // 验证模型是脏的
      expect(useModelService.getState().isDirty(filePath)).toBe(true)

      render(<FileExplorer />)

      // 展开 chapters 目录
      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01-第一章.md')).toBeInTheDocument()
      })

      // 右键删除
      fireEvent.contextMenu(screen.getByText('01-第一章.md'))
      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
      await user.click(screen.getByText('删除'))

      // 确认删除
      await waitFor(() => {
        expect(screen.getByText('确定')).toBeInTheDocument()
      })
      await user.click(screen.getByText('确定'))

      // 应该显示提示
      await waitFor(() => {
        expect(screen.getByText(/未保存的修改/)).toBeInTheDocument()
      })

      // 文件应该仍然存在
      const entries = await fs.readDir(chaptersDir)
      expect(entries.some((e) => e.name === '01-第一章.md')).toBe(true)
    })
  })

  describe('删除卷同步', () => {
    const bookDir = '/home/user/.superauthor/books/测试书'
    const chaptersDir = `${bookDir}/chapters`

    beforeEach(async () => {
      await fs.createDir(bookDir)
      await fs.createDir(chaptersDir)
      await fs.writeFile(`${bookDir}/book.json`, createBookJson('测试书'))
      useBookStore.setState({
        currentBook: {
          id: '测试书',
          title: '测试书',
          author: '作者',
          description: '',
          tags: [],
          style: '',
          directory: bookDir,
          createdAt: '',
          updatedAt: '',
        },
      })
      useEditorStore.setState({ tabs: [], activeTabId: null })
      useModelService.setState({ models: {}, refCount: {} })
    })

    it('删除包含章节的卷时应阻止删除', async () => {
      const user = userEvent.setup()
      const volDir = `${chaptersDir}/01_黑暗森林`
      await fs.createDir(volDir)
      await fs.writeFile(`${volDir}/01-第一章.md`, '# 第一章\n\n')

      render(<FileExplorer />)

      // 展开 chapters 目录
      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01_黑暗森林')).toBeInTheDocument()
      })

      // 右键删除卷
      fireEvent.contextMenu(screen.getByText('01_黑暗森林'))
      await waitFor(() => {
        expect(screen.getByText('删除卷')).toBeInTheDocument()
      })
      await user.click(screen.getByText('删除卷'))

      // 应该显示提示
      await waitFor(() => {
        expect(screen.getByText(/存在章节/)).toBeInTheDocument()
      })

      // 卷应该仍然存在
      const entries = await fs.readDir(chaptersDir)
      expect(entries.some((e) => e.name === '01_黑暗森林')).toBe(true)
    })

    it('删除空卷后应清理缓存', async () => {
      const user = userEvent.setup()
      const volDir = `${chaptersDir}/01_黑暗森林`
      await fs.createDir(volDir)

      render(<FileExplorer />)

      // 展开 chapters 目录
      await waitFor(() => {
        expect(screen.getByText('chapters')).toBeInTheDocument()
      })
      await user.click(screen.getByText('chapters'))
      await waitFor(() => {
        expect(screen.getByText('01_黑暗森林')).toBeInTheDocument()
      })

      // 右键删除卷
      fireEvent.contextMenu(screen.getByText('01_黑暗森林'))
      await waitFor(() => {
        expect(screen.getByText('删除卷')).toBeInTheDocument()
      })
      await user.click(screen.getByText('删除卷'))

      // 确认删除
      await waitFor(() => {
        expect(screen.getByText('确定')).toBeInTheDocument()
      })
      await user.click(screen.getByText('确定'))

      // 验证卷已删除
      await waitFor(async () => {
        const entries = await fs.readDir(chaptersDir)
        expect(entries.some((e) => e.name === '01_黑暗森林')).toBe(false)
      })
    })
  })
})
