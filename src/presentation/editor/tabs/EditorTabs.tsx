import { useEditorStore } from '../../../application/stores/editorStore'
import './EditorTabs.css'

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const closeTab = useEditorStore((s) => s.closeTab)

  if (tabs.length === 0) return null

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-label">
            {tab.isDirty && <span className="tab-dirty">{'●'}</span>}
            {tab.fileName}
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            {'×'}
          </button>
        </div>
      ))}
    </div>
  )
}
