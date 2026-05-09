import { useBookStore } from '../../application/stores/bookStore'
import './EditorStatusBar.css'

export function EditorStatusBar() {
  const currentChapter = useBookStore((s) => s.currentChapter)
  const chapterContent = useBookStore((s) => s.chapterContent)

  const wordCount = chapterContent
    ? chapterContent.replace(/[\s\n]/g, '').length
    : currentChapter?.wordCount ?? 0

  const status = currentChapter?.status === 'completed' ? '已完成' : '草稿'
  const fileName = currentChapter ? `${currentChapter.title}.md` : '未打开'

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
