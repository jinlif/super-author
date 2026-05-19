import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { ChatRow } from '../../src/presentation/agentPanel/ChatRow'

describe('ChatRow SubAgent 渲染', () => {
  it('主 Agent 消息应显示 "AI 助手" 标签', () => {
    render(
      <ChatRow
        message={{
          role: 'assistant',
          content: [{ type: 'text', text: '你好' }],
        }}
      />,
    )
    expect(screen.getByText('AI 助手')).toBeTruthy()
  })

  it('SubAgent 消息应显示 "SubAgent" 标签', () => {
    render(
      <ChatRow
        message={{
          role: 'assistant',
          source: 'sub_agent',
          content: [{ type: 'text', text: '子Agent回复' }],
        }}
      />,
    )
    expect(screen.getByText('SubAgent')).toBeTruthy()
    expect(screen.getByText('子Agent回复')).toBeTruthy()
  })

  it('SubAgent 消息应包含 sub-agent CSS 类', () => {
    const { container } = render(
      <ChatRow
        message={{
          role: 'assistant',
          source: 'sub_agent',
          content: [{ type: 'text', text: '测试' }],
        }}
      />,
    )
    expect(container.querySelector('.chat-row.sub-agent')).toBeTruthy()
  })
})
