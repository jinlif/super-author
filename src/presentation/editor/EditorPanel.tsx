import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef, useCallback, useEffect } from 'react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../application/stores/editorStore'
import { useBookStore } from '../../application/stores/bookStore'
import { EditorTabs } from './tabs/EditorTabs'
import { EditorStatusBar } from './EditorStatusBar'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const markDirty = useEditorStore((s) => s.markDirty)

  const chapterContent = useBookStore((s) => s.chapterContent)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const saveChapter = useBookStore((s) => s.saveChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(chapterContent)
  contentRef.current = chapterContent

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const doSave = useCallback(async () => {
    if (!currentChapter) return
    try {
      await saveChapter(contentRef.current)
      if (activeTabId) markDirty(activeTabId, false)
    } catch {
      // 保存失败暂不处理
    }
  }, [currentChapter, saveChapter, activeTabId, markDirty])

  // 自动保存定时器（5秒防抖）
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      contentRef.current = value
      if (activeTabId) markDirty(activeTabId, true)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(doSave, 5000)
    }
  }, [activeTabId, markDirty, doSave])

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        doSave()
      }
    }
  }, [doSave])

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
      <EditorStatusBar />
    </div>
  )
}
