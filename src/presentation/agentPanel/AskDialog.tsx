import { useCallback, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useAgentStore } from '../../application/stores/agentStore'

interface AskOption {
  label: string
  value: string
  recommended?: boolean
}

const OTHERS_VALUE = '__others__'

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

  const isOthersSelected = selectedValues.has(OTHERS_VALUE)
  const inputText = inputRef.current?.value ?? ''
  const canSubmit =
    selectedValues.size > 0 &&
    !(isOthersSelected && inputText.trim().length === 0)

  const allOptions: AskOption[] = [
    ...(options ?? []),
    ...(allowInput ? [{ label: '其他...', value: OTHERS_VALUE }] : []),
  ]

  const handleToggle = useCallback(
    (value: string) => {
      setSelectedValues((prev) => {
        const next = new Set(prev)
        if (isMultiple) {
          if (next.has(value)) next.delete(value)
          else next.add(value)
        } else {
          if (next.has(value)) next.delete(value)
          else {
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
    if (!canSubmit) return
    const text = inputRef.current?.value ?? ''
    const selected = Array.from(selectedValues).filter(
      (v) => v !== OTHERS_VALUE,
    )
    resolvePending({ action: 'answered', selected, text })
  }, [canSubmit, resolvePending, selectedValues])

  if (!pendingTool || pendingTool.name !== 'ask_question') return null
  if (allOptions.length === 0) return null

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">{question}</div>

        <div className="agent-dialog-options">
          {allOptions.map((opt) => (
            <label key={opt.value} className="agent-dialog-option">
              <input
                type={isMultiple ? 'checkbox' : 'radio'}
                name="ask-option"
                checked={selectedValues.has(opt.value)}
                onChange={() => handleToggle(opt.value)}
              />
              <span>{opt.label}</span>
              {opt.recommended && (
                <span className="agent-dialog-recommend">推荐</span>
              )}
            </label>
          ))}
        </div>

        {isOthersSelected && (
          <div className="agent-dialog-extra">
            <TextareaAutosize
              ref={inputRef}
              className="agent-dialog-input"
              placeholder="输入内容..."
              minRows={1}
              maxRows={5}
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
