import { beforeEach, describe, expect, it } from 'vitest'
import { ToolRegistry } from '../../src/application/agent/ToolRegistry'
import { useAgentStore } from '../../src/application/stores/agentStore'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import type { ToolContext } from '../../src/domain/types/tool'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { readFileTool } from '../../src/infrastructure/tools/ReadFileTool'
import { writeFileTool } from '../../src/infrastructure/tools/WriteFileTool'

describe('Phase 3 集成测试', () => {
  let fs: MockFileService

  beforeEach(async () => {
    // 重置 stores
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      bookDescription: '',
      isLoading: false,
    })

    useAgentStore.setState({
      messages: [],
      isStreaming: false,
      currentTurn: 0,
      error: null,
      conversationId: null,
      providerConfig: {
        id: 'claude',
        name: 'Claude',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        models: ['claude-sonnet-4-20250514'],
      },
      _registry: null,
      _toolContext: null,
      _abortController: null,
      tempChapterData: null,
    })

    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    })

    // 创建文件系统
    fs = new MockFileService()
    // 创建目录结构
    await fs.createDir('/books')
    await fs.createDir('/books/测试小说')
    await fs.createDir('/books/测试小说/chapters')
    await fs.createDir('/books/测试小说/characters')

    // 创建 book.json
    await fs.writeFile(
      '/books/测试小说/book.json',
      JSON.stringify({
        title: '测试小说',
        author: '作者',
        tags: [],
        style: '玄幻',
        dirDescriptions: {
          'chapters/': '存放章节正文',
          'characters/': '角色设定卡',
        },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }),
    )

    // 创建章节文件
    await fs.writeFile(
      '/books/测试小说/chapters/01-第一章.md',
      '# 第一章\n\n张三是一名修仙者，正在山上修炼。',
    )

    // 创建角色文件
    await fs.writeFile(
      '/books/测试小说/characters/张三.md',
      '姓名：张三\n角色：主角\n性格：坚韧不拔',
    )
  })

  it('完整的 Agent 对话流程', async () => {
    // 1. 创建书籍
    const book = await useBookStore.getState().createBook('测试小说', '作者')
    expect(book.title).toBe('测试小说')

    // 2. 打开书籍（绕过 store 直接调用 repo 以确保目录正确）
    useBookStore.setState({
      currentBook: { ...book, directory: '/books/测试小说' },
    })

    // 3. 加载章节
    useBookStore.setState({
      chapters: [
        {
          id: 'ch-1',
          bookId: 'test',
          title: '第一章',
          order: 1,
          status: 'draft',
          wordCount: 0,
          filePath: '/books/测试小说/chapters/01-第一章.md',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    })

    // 4. 设置 ToolRegistry
    const registry = new ToolRegistry()
    registry.register(readFileTool)
    registry.register(writeFileTool)

    const toolContext: ToolContext = {
      fileService: fs,
      bookDir: '/books/测试小说',
    }

    useAgentStore.getState().setRegistry(registry)
    useAgentStore.getState().setToolContext(toolContext)

    // 5. 初始状态验证
    expect(useAgentStore.getState().messages).toHaveLength(0)
    expect(useAgentStore.getState().isStreaming).toBe(false)

    // 6. 测试 read_file
    const readResult = await registry
      .get('read_file')
      ?.handler({ filePath: '/books/测试小说/chapters/01-第一章.md' }, toolContext)
    expect(readResult.content).toContain('张三')
    expect(readResult.content).toContain('修仙者')

    // 7. 测试 write_file
    const writeResult = await registry.get('write_file')?.handler(
      {
        filePath: '/books/测试小说/chapters/01-第一章.md',
        content: '# 第一章\n\n张三正在山上修炼，突然天边传来一声巨响。',
      },
      toolContext,
    )
    expect(writeResult.content).toContain('已写入')

    // 验证文件已更新
    const updatedContent = await fs.readFile('/books/测试小说/chapters/01-第一章.md')
    expect(updatedContent).toContain('天边传来一声巨响')

    // 8. 测试 Provider 配置持久化
    useAgentStore.getState().setProviderConfig({ model: 'claude-opus-4-7' })
    expect(useAgentStore.getState().providerConfig.model).toBe('claude-opus-4-7')

    // 9. 测试工具并发/串行执行
    const { ToolExecutor } = await import('../../src/application/agent/ToolExecutor')
    const executor = new ToolExecutor(registry)

    // 并发执行只读工具
    const toolResults = await executor.executeAll(
      [
        {
          id: 't1',
          name: 'read_file',
          input: { filePath: '/books/测试小说/chapters/01-第一章.md' },
        },
      ],
      toolContext,
    )
    expect(toolResults).toHaveLength(1)
    expect(toolResults[0].result.isError).toBeFalsy()
  })

  it('AgentStore 初始化应加载配置', async () => {
    // 设置文件服务
    useAgentStore.getState().setFileService(fs, '/home/user')

    // 预先保存配置到文件系统
    await fs.createDir('/home/user/.superauthor')
    await fs.writeFile(
      '/home/user/.superauthor/config.json',
      JSON.stringify({
        provider: {
          id: 'openai',
          name: 'OpenAI',
          apiKey: 'sk-openai-test',
          model: 'gpt-4o',
          models: ['gpt-4o'],
        },
      }),
    )

    await useAgentStore.getState().init()
    const config = useAgentStore.getState().providerConfig
    expect(config.id).toBe('openai')
    expect(config.model).toBe('gpt-4o')
    expect(config.apiKey).toBe('sk-openai-test')
  })
})
