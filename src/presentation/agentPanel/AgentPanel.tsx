import { useLayoutStore } from '../../application/stores/layoutStore'
import './AgentPanel.css'

export function AgentPanel() {
  const visible = useLayoutStore((s) => s.agentVisible)
  const position = useLayoutStore((s) => s.agentPosition)
  const size = useLayoutStore((s) => s.panelSizes.agent)
  const toggleAgent = useLayoutStore((s) => s.toggleAgent)

  if (!visible) return null

  const isRight = position === 'right'

  return (
    <div
      className={`agent-panel ${isRight ? 'agent-right' : 'agent-bottom'}`}
      style={isRight ? { width: size } : { height: size }}
    >
      <div className="agent-header">
        <span className="agent-title">AI 助手</span>
        <div className="agent-actions">
          <button className="agent-action-btn" onClick={toggleAgent} title="关闭">
            {'×'}
          </button>
        </div>
      </div>
      <div className="agent-body">
        <div className="agent-messages">
          <p className="agent-placeholder">AI 写作助手已就绪</p>
        </div>
        <div className="agent-input-area">
          <textarea
            className="agent-input"
            placeholder="输入写作指令..."
            rows={2}
          />
          <button className="agent-send-btn">发送</button>
        </div>
      </div>
    </div>
  )
}
