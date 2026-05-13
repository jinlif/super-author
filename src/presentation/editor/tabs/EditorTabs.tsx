import { useModelService } from '../../../application/services/ModelService'
import { useEditorStore } from '../../../application/stores/editorStore'
import './EditorTabs.css'

function TabDirtyDot({ filePath }: { filePath: string }) {
  const isDirty = useModelService((s) => {
    const model = s.models[filePath]
    return model ? model.versionId !== model.savedVersionId : false
  })
  if (!isDirty) return null
  return <span className="tab-dirty">{'●'}</span>
}

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const requestCloseTab = useEditorStore((s) => s.requestCloseTab)

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
            {tab.type !== 'settings' && <TabDirtyDot filePath={tab.filePath} />}
            {tab.type === 'settings' ? '⚙️ ' : ''}
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
