import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useModelService } from '../../application/services/ModelService'
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import { ConfirmSaveDialog } from '../components/ConfirmSaveDialog'
import { EditorStatusBar } from './EditorStatusBar'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const cancelCloseTab = useEditorStore((s) => s.cancelCloseTab)

  const updateValue = useModelService((s) => s.updateValue)
  const pendingCloseUri = useModelService((s) => s.pendingCloseUri)
  const pendingCloseFileName = useModelService((s) => s.pendingCloseFileName)

  const saveChapter = useBookStore((s) => s.saveChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [liveWordCount, setLiveWordCount] = useState(0)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const activeUri = activeTab?.filePath ?? null

  // 保存：通过 filePath 查找 Chapter，不依赖 currentChapter
  const doSave = useCallback(
    async (filePath: string) => {
      const ms = useModelService.getState()
      if (!ms.isDirty(filePath)) return
      const model = ms.models[filePath]
      if (!model) return
      const chapter = useBookStore.getState().chapters.find((c) => c.filePath === filePath)
      if (!chapter) return
      try {
        await saveChapter(model.value, chapter)
        ms.markClean(filePath)
      } catch {
        console.warn('保存失败')
      }
    },
    [saveChapter],
  )

  const doSaveRef = useRef(doSave)
  doSaveRef.current = doSave

  // Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeUri) doSaveRef.current(activeUri)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeUri])

  // 获取或创建 Monaco Model（利用 Monaco 内置 URI 去重）
  function getOrCreateMonacoModel(uri: string, monaco: typeof Monaco): editor.IModel | null {
    const monacoUri = monaco.Uri.parse(uri)
    const existing = monaco.editor.getModel(monacoUri)
    if (existing) return existing

    const ms = useModelService.getState()
    const textModel = ms.models[uri]
    if (!textModel) return null

    return monaco.editor.createModel(textModel.value, 'markdown', monacoUri)
  }

  // Monaco 挂载时切换到 activeTab 的 Model
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    const es = useEditorStore.getState()
    const tab = es.tabs.find((t) => t.id === es.activeTabId)
    if (tab) {
      const model = getOrCreateMonacoModel(tab.filePath, monaco)
      if (model) editor.setModel(model)
    }
  }

  // 切换标签时切换 Monaco Model（不重挂载）
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeUri) return

    const model = getOrCreateMonacoModel(activeUri, monaco)
    if (!model) return

    if (editor.getModel()?.uri.toString() === monaco.Uri.parse(activeUri).toString()) return

    editor.setModel(model)
    setLiveWordCount(model.getValue().replace(/[\s\n]/g, '').length)

    // 同步 currentChapter 到 bookStore（供 StatusBar 等使用）
    const chapter = useBookStore.getState().chapters.find((c) => c.filePath === activeUri)
    if (chapter) {
      useBookStore.setState({ currentChapter: chapter })
    }
  }, [activeUri])

  // 编辑时更新 Model
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined || !activeUri) return
      updateValue(activeUri, value)
      setLiveWordCount(value.replace(/[\s\n]/g, '').length)

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        doSaveRef.current(activeUri)
      }, 5000)
    },
    [activeUri, updateValue],
  )

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (activeUri) doSave(activeUri)
    }
  }, [activeUri, doSave])

  // 全部关闭时清除 currentChapter
  useEffect(() => {
    if (tabs.length === 0) {
      useBookStore.setState({ currentChapter: null })
    }
  }, [tabs.length])

  // 关闭确认对话框回调
  const handleSaveAndClose = useCallback(async () => {
    if (!pendingCloseUri) return
    await doSave(pendingCloseUri)
    const tab = useEditorStore.getState().tabs.find((t) => t.filePath === pendingCloseUri)
    if (tab) useEditorStore.getState().forceCloseTab(tab.id)
  }, [pendingCloseUri, doSave])

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingCloseUri) return
    const tab = useEditorStore.getState().tabs.find((t) => t.filePath === pendingCloseUri)
    if (tab) useEditorStore.getState().forceCloseTab(tab.id)
  }, [pendingCloseUri])

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 || !activeTab ? (
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
      <EditorStatusBar liveWordCount={liveWordCount} />
      <ConfirmSaveDialog
        open={pendingCloseUri !== null}
        fileName={pendingCloseFileName}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={cancelCloseTab}
      />
    </div>
  )
}
