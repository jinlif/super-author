// src/presentation/editor/EditorStatusBar.tsx
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import { useModelService } from '../../application/services/ModelService'
import './EditorStatusBar.css'

interface EditorStatusBarProps {
  liveWordCount: number
}

export function EditorStatusBar({ liveWordCount }: EditorStatusBarProps) {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const chapters = useBookStore((s) => s.chapters)
  const models = useModelService((s) => s.models)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const activeModel = activeTab ? models[activeTab.filePath] : null
  const chapter = activeTab
    ? chapters.find((c) => c.filePath === activeTab.filePath) ?? null
    : null

  const wordCount = liveWordCount > 0
    ? liveWordCount
    : (activeModel
      ? activeModel.value.replace(/[\s\n]/g, '').length
      : (chapter?.wordCount ?? 0))

  const status = chapter?.status === 'completed' ? '已完成' : '草稿'
  const fileName = activeTab ? activeTab.fileName : (chapter ? `${chapter.title}.md` : '未打开')

  return (
    <div className="editor-statusbar">
      <span className="statusbar-item">{fileName}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">字数: {wordCount.toLocaleString()}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">{status}</span>
    </div>
  )
}
