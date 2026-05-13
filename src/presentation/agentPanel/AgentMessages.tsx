import { useCallback, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useAgentStore } from '../../application/stores/agentStore'
import type { AgentMessage } from '../../domain/types/agent'
import { ChatRow } from './ChatRow'

export function AgentMessages() {
  const messages = useAgentStore((s) => s.messages)
  const isStreaming = useAgentStore((s) => s.isStreaming)

  const computeItemKey = useCallback((index: number) => `msg-${index}`, [])

  const itemContent = useCallback(
    (index: number, msg: AgentMessage) => (
      <div className="agent-virtuoso-item">
        <ChatRow
          message={msg}
          isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
        />
      </div>
    ),
    [isStreaming, messages.length],
  )

  const overscan = useMemo(() => ({ main: 500, reverse: 500 }), [])

  if (messages.length === 0) {
    return (
      <div className="agent-messages">
        <p className="agent-placeholder">AI 写作助手已就绪，输入指令开始创作</p>
      </div>
    )
  }

  return (
    <Virtuoso
      className="agent-messages"
      data={messages}
      computeItemKey={computeItemKey}
      itemContent={itemContent}
      followOutput="smooth"
      overscan={overscan}
    />
  )
}
