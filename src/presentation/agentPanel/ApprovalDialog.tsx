import { useCallback, useRef } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'

export function ApprovalDialog() {
  const pendingTool = useAgentStore((s) => s.pendingTool)
  const resolvePending = useAgentStore((s) => s.resolvePending)
  const abortStreaming = useAgentStore((s) => s.abortStreaming)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleApprove = useCallback(() => {
    resolvePending({ action: 'approved' })
  }, [resolvePending])

  const handleReject = useCallback(() => {
    resolvePending({ action: 'rejected', reason: '用户拒绝' })
    abortStreaming()
  }, [resolvePending, abortStreaming])

  const handleRejectWithInput = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    resolvePending({ action: 'rejected', reason: '用户输入', text })
    abortStreaming()
  }, [resolvePending, abortStreaming])

  if (!pendingTool || pendingTool.name !== 'approval') return null

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">
          {String(pendingTool.input.title ?? '确认操作')}
        </div>
        <div className="agent-dialog-buttons">
          <button
            type="button"
            className="agent-dialog-btn danger"
            onClick={handleReject}
          >
            拒绝
          </button>
          <button
            type="button"
            className="agent-dialog-btn primary"
            onClick={handleApprove}
          >
            同意
          </button>
        </div>
        <div className="agent-dialog-input-row">
          <textarea
            ref={inputRef}
            className="agent-dialog-input"
            placeholder="补充指令（可选）"
            rows={2}
          />
          <button
            type="button"
            className="agent-dialog-btn primary"
            onClick={handleRejectWithInput}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
