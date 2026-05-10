import { useEditorStore } from '../../../application/stores/editorStore'
import { useModelService } from '../../../application/services/ModelService'
import './EditorTabs.css'

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const requestCloseTab = useEditorStore((s) => s.requestCloseTab)
  const isDirty = useModelService((s) => s.isDirty)

  if (tabs.length === 0) return null

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          tabIndex={0}
          className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setActiveTab(tab.id)
            }
          }}
        >
          <span className="tab-label">
            {isDirty(tab.filePath) && <span className="tab-dirty">{'●'}</span>}
            {tab.fileName}
          </span>
          <button
            type="button"
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              requestCloseTab(tab.id)
            }}
          >
            {'×'}
          </button>
        </div>
      ))}
    </div>
  )
}
