import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgentStore } from '../../src/application/stores/agentStore'
import { useLayoutStore } from '../../src/application/stores/layoutStore'
import { AgentPanel } from '../../src/presentation/agentPanel/AgentPanel'

// jsdom 中 Virtuoso 容器高度为 0，不渲染 item，直接替换为简单列表
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[]
    itemContent: (i: number, d: unknown) => React.ReactNode
  }) => <div>{data.map((item, i) => itemContent(i, item))}</div>,
}))

// jsdom 不支持 scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

describe('AgentPanel', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      agentVisible: true,
      agentPosition: 'right',
      sidebarVisible: false,
      activeActivity: null,
      sidebarPanel: null,
      panelSizes: { sidebar: 260, agent: 360 },
    })
    useAgentStore.setState({
      messages: [],
      isStreaming: false,
      error: null,
      conversationId: null,
      currentTurn: 0,
      providerConfig: {
        id: 'claude',
        name: 'Claude',
        apiKey: '',
        model: 'claude-sonnet-4-20250514',
        models: ['claude-sonnet-4-20250514'],
      },
      _abortController: null,
      tempChapterData: null,
    })
  })

  it('visible 为 true 时应渲染', () => {
    render(React.createElement(AgentPanel))
    expect(screen.getByText('AI 助手')).toBeTruthy()
  })

  it('应显示 Provider 标签', () => {
    render(React.createElement(AgentPanel))
    expect(screen.getByText(/Claude · claude-sonnet-4-20250514/)).toBeTruthy()
  })

  it('应显示占位文字', () => {
    render(React.createElement(AgentPanel))
    expect(screen.getByText(/AI 写作助手已就绪/)).toBeTruthy()
  })

  it('visible 为 false 时应返回 null', () => {
    useLayoutStore.setState({ agentVisible: false })
    const { container } = render(React.createElement(AgentPanel))
    expect(container.innerHTML).toBe('')
  })

  it('应显示消息列表', () => {
    useAgentStore.setState({
      messages: [
        { role: 'user', content: [{ type: 'text', text: '续写下一段' }] },
        { role: 'assistant', content: [{ type: 'text', text: '好的，我来续写' }] },
      ],
    })
    render(React.createElement(AgentPanel))
    expect(screen.getByText('续写下一段')).toBeTruthy()
    expect(screen.getByText('好的，我来续写')).toBeTruthy()
  })
})
