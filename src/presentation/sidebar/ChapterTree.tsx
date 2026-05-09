import { useBookStore } from '../../application/stores/bookStore'
import type { Chapter } from '../../domain/types/chapter'
import './ChapterTree.css'

export function ChapterTree() {
  const chapters = useBookStore((s) => s.chapters)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const loadChapter = useBookStore((s) => s.loadChapter)
  const createChapter = useBookStore((s) => s.createChapter)
  const currentBook = useBookStore((s) => s.currentBook)

  const handleCreate = async () => {
    const title = prompt('输入章节名称：')
    if (title?.trim()) {
      await createChapter(title.trim())
    }
  }

  if (!currentBook) return null

  return (
    <div className="chapter-tree">
      <div className="chapter-tree-header">
        <span className="chapter-tree-title">章节</span>
        <button type="button" className="chapter-add-btn" onClick={handleCreate} title="新建章节">
          +
        </button>
      </div>
      <div className="chapter-list">
        {chapters.length === 0 && <p className="chapter-empty">暂无章节，点击 + 新建</p>}
        {chapters.map((chapter: Chapter) => (
          <div
            key={chapter.id}
            className={`chapter-item ${currentChapter?.id === chapter.id ? 'active' : ''}`}
            onClick={() => loadChapter(chapter)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') loadChapter(chapter)
            }}
            role="button"
            tabIndex={0}
          >
            <span className="chapter-order">{String(chapter.order).padStart(2, '0')}</span>
            <span className="chapter-name">{chapter.title}</span>
            <span className="chapter-status">{chapter.status === 'completed' ? '✓' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
