import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef } from 'react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../application/stores/editorStore'
import { useBookStore } from '../../application/stores/bookStore'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const markDirty = useEditorStore((s) => s.markDirty)
  const chapterContent = useBookStore((s) => s.chapterContent)
  const currentChapter = useBookStore((s) => s.currentChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleChange = (value: string | undefined) => {
    if (value !== undefined && activeTabId) {
      markDirty(activeTabId, true)
    }
  }

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 || !currentChapter ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>选择章节开始编辑</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={chapterContent}
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
