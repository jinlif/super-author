import { FilePlus, History, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'
import { useLayoutStore } from '../../application/stores/layoutStore'
import { AgentInput } from './AgentInput'
import { AgentMessages } from './AgentMessages'
import './AgentPanel.css'

export function AgentPanel() {
  const visible = useLayoutStore((s) => s.agentVisible)
  const position = useLayoutStore((s) => s.agentPosition)
  const size = useLayoutStore((s) => s.panelSizes.agent)
  const toggleAgent = useLayoutStore((s) => s.toggleAgent)
  const providerConfig = useAgentStore((s) => s.providerConfig)
  const clearConversation = useAgentStore((s) => s.clearConversation)
  const conversationHistory = useAgentStore((s) => s.conversationHistory)
  const loadConversationFromHistory = useAgentStore((s) => s.loadConversationFromHistory)

  const [showHistory, setShowHistory] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHistory) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHistory])

  if (!visible) return null

  const isRight = position === 'right'
  const providerName = providerConfig.id === 'claude' ? 'Claude' : 'OpenAI'

  const handleLoadHistory = (id: string) => {
    loadConversationFromHistory(id)
    setShowHistory(false)
  }

  return (
    <div
      className={`agent-panel ${isRight ? 'agent-right' : 'agent-bottom'}`}
      style={isRight ? { width: size } : { height: size }}
    >
      <div className="agent-header">
        <div className="agent-header-left">
          <span className="agent-title">AI 助手</span>
          <span className="provider-badge">
            {providerName} · {providerConfig.model}
          </span>
        </div>
        <div className="agent-header-actions">
          <button
            type="button"
            className="agent-header-btn"
            onClick={clearConversation}
            title="新建会话"
          >
            <FilePlus size={14} />
          </button>
          <button
            type="button"
            className="agent-header-btn"
            onClick={() => setShowHistory((v) => !v)}
            title="历史记录"
          >
            <History size={14} />
          </button>
          <button
            type="button"
            className="agent-header-btn"
            onClick={clearConversation}
            title="清空对话"
          >
            <Trash2 size={14} />
          </button>
          <button type="button" className="agent-header-btn" onClick={toggleAgent} title="关闭">
            <X size={14} />
          </button>
        </div>
      </div>
      {showHistory && (
        <div className="history-dropdown" ref={dropdownRef}>
          {conversationHistory.length === 0 ? (
            <div className="history-empty">暂无历史记录</div>
          ) : (
            conversationHistory.map((item) => (
              <button
                key={item.id}
                type="button"
                className="history-item"
                onClick={() => handleLoadHistory(item.id)}
                title={item.title}
              >
                {item.title}
              </button>
            ))
          )}
        </div>
      )}
      <div className="agent-body">
        <AgentMessages />
        <AgentInput />
      </div>
    </div>
  )
}
