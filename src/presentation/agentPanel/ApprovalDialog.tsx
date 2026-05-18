import { useCallback, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useAgentStore } from '../../application/stores/agentStore'

export function ApprovalDialog() {
  const pendingTool = useAgentStore((s) => s.pendingTool)
  const diffForReview = useAgentStore((s) => s.diffForReview)
  const resolvePending = useAgentStore((s) => s.resolvePending)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const isOthers = selectedOption === '__others__'
  const canSubmit =
    selectedOption !== null && (!isOthers || inputValue.trim().length > 0)

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    if (selectedOption === 'approve') {
      resolvePending({ action: 'approved' })
    } else if (selectedOption === 'reject') {
      resolvePending(null)
    } else if (selectedOption === '__others__') {
      resolvePending({ action: 'feedback', text: inputValue })
    }
  }, [canSubmit, selectedOption, inputValue, resolvePending])

  if (!pendingTool) return null

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">
          {String(pendingTool.input.title ?? '确认操作')}
        </div>

        {diffForReview && (
          <div className="approval-file-info">
            <span className="approval-file-path">{diffForReview.filePath}</span>
            <span className="approval-file-stats">
              {diffForReview.original.split('\n').length} → {diffForReview.modified.split('\n').length} 行
            </span>
          </div>
        )}

        <div className="agent-dialog-options">
          <label className="agent-dialog-option">
            <input
              type="radio"
              name="approval-option"
              checked={selectedOption === 'approve'}
              onChange={() => setSelectedOption('approve')}
            />
            <span>同意</span>
          </label>
          <label className="agent-dialog-option">
            <input
              type="radio"
              name="approval-option"
              checked={selectedOption === 'reject'}
              onChange={() => setSelectedOption('reject')}
            />
            <span>拒绝</span>
          </label>
          <label className="agent-dialog-option">
            <input
              type="radio"
              name="approval-option"
              checked={selectedOption === '__others__'}
              onChange={() => setSelectedOption('__others__')}
            />
            <span>其他...</span>
          </label>
        </div>

        {isOthers && (
          <div className="agent-dialog-extra">
            <TextareaAutosize
              ref={inputRef}
              className="agent-dialog-input"
              placeholder="补充反馈..."
              minRows={1}
              maxRows={5}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}

        <div className="agent-dialog-submit-row">
          <button
            type="button"
            className={`agent-dialog-btn primary${!canSubmit ? ' disabled' : ''}`}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
