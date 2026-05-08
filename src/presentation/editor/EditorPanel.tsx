import { useEditorStore } from '../../application/stores/editorStore'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>打开文件开始写作</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            <textarea
              className="editor-placeholder"
              readOnly
              value="编辑器区域 — Phase 2 集成 Monaco Editor"
            />
          </div>
        )}
      </div>
    </div>
  )
}
