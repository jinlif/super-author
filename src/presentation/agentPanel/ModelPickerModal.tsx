import { useCallback, useEffect } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'
import './ModelPickerModal.css'

interface ModelPickerModalProps {
  visible: boolean
  onClose: () => void
}

export function ModelPickerModal({ visible, onClose }: ModelPickerModalProps) {
  const models = useAgentStore((s) => s.providerConfig.models)
  const activeModel = useAgentStore((s) => s.providerConfig.model)
  const setProviderConfig = useAgentStore((s) => s.setProviderConfig)

  const handleSelect = useCallback(
    (model: string) => {
      setProviderConfig({ model })
      onClose()
    },
    [setProviderConfig, onClose],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handleKeyDown])

  if (!visible) return null

  return (
    <div className="model-picker-overlay" onClick={onClose}>
      <div className="model-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="model-picker-header">
          <span className="model-picker-title">选择模型</span>
          <button type="button" className="model-picker-close" onClick={onClose}>
            x
          </button>
        </div>
        <div className="model-picker-list">
          {models.map((m) => (
            <div
              key={m}
              className={`model-picker-item ${m === activeModel ? 'active' : ''}`}
              onClick={() => handleSelect(m)}
            >
              <span>{m}</span>
              {m === activeModel && <span className="model-picker-check">{'✓'}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
