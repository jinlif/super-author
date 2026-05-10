import { useState } from 'react'
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import type { Chapter } from '../../domain/types/chapter'
import { CreateChapterDialog } from '../components/CreateChapterDialog'
import './ChapterTree.css'

export function ChapterTree() {
  const chapters = useBookStore((s) => s.chapters)
  const currentChapter = useBookStore((s) => s.currentChapter)
  const loadChapter = useBookStore((s) => s.loadChapter)
  const openFile = useEditorStore((s) => s.openFile)
  const createChapter = useBookStore((s) => s.createChapter)
  const currentBook = useBookStore((s) => s.currentBook)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = async (title: string) => {
    if (title.trim()) {
      await createChapter(title.trim())
    }
  }

  if (!currentBook) return null

  return (
    <div className="chapter-tree">
      <div className="chapter-tree-header">
        <span className="chapter-tree-title">章节</span>
        <button type="button" className="chapter-add-btn" onClick={() => setDialogOpen(true)} title="新建章节">
          +
        </button>
      </div>
      <CreateChapterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
      <div className="chapter-list">
        {chapters.length === 0 && <p className="chapter-empty">暂无章节，点击 + 新建</p>}
        {chapters.map((chapter: Chapter) => (
          <div
            key={chapter.id}
            className={`chapter-item ${currentChapter?.id === chapter.id ? 'active' : ''}`}
            onClick={async () => {
              const content = await loadChapter(chapter)
              openFile(chapter.filePath, chapter.title + '.md', content)
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                const content = await loadChapter(chapter)
                openFile(chapter.filePath, chapter.title + '.md', content)
              }
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
