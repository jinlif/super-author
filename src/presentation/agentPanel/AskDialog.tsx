import { useCallback, useRef, useState } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'

interface AskOption {
  label: string
  value: string
}

export function AskDialog() {
  const pendingTool = useAgentStore((s) => s.pendingTool)
  const resolvePending = useAgentStore((s) => s.resolvePending)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())

  const isMultiple = !!(
    (pendingTool?.input as Record<string, unknown>)?.multiple
  )
  const options = (pendingTool?.input as Record<string, unknown>)
    ?.options as AskOption[] | undefined
  const allowInput = !!(
    (pendingTool?.input as Record<string, unknown>)?.allowInput
  )
  const question = String(
    (pendingTool?.input as Record<string, unknown>)?.question ?? '',
  )

  const handleToggle = useCallback(
    (value: string) => {
      setSelectedValues((prev) => {
        const next = new Set(prev)
        if (isMultiple) {
          if (next.has(value)) {
            next.delete(value)
          } else {
            next.add(value)
          }
        } else {
          if (next.has(value)) {
            next.delete(value)
          } else {
            next.clear()
            next.add(value)
          }
        }
        return next
      })
    },
    [isMultiple],
  )

  const handleSubmit = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    const selected = Array.from(selectedValues)
    resolvePending({ action: 'answered', selected, text })
  }, [resolvePending, selectedValues])

  if (!pendingTool || pendingTool.name !== 'ask_question') return null

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">{question}</div>

        {options && options.length > 0 && (
          <div className="agent-dialog-options">
            {options.map((opt) => (
              <label key={opt.value} className="agent-dialog-option">
                <input
                  type={isMultiple ? 'checkbox' : 'radio'}
                  name="ask-option"
                  checked={selectedValues.has(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {allowInput && (
          <div className="agent-dialog-input-row">
            <textarea
              ref={inputRef}
              className="agent-dialog-input"
              placeholder="输入内容..."
              rows={2}
            />
          </div>
        )}

        <div className="agent-dialog-buttons">
          <button
            type="button"
            className="agent-dialog-btn primary"
            onClick={handleSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
