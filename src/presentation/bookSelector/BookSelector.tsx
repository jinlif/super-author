import { useEffect, useState } from 'react'
import { useBookStore } from '../../application/stores/bookStore'
import type { Book } from '../../domain/types/book'
import './BookSelector.css'

export function BookSelector() {
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.loadBooks)
  const openBook = useBookStore((s) => s.openBook)
  const createBook = useBookStore((s) => s.createBook)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const handleCreate = async () => {
    if (!title.trim() || !author.trim()) return
    const book = await createBook(title.trim(), author.trim())
    await openBook(book)
    setTitle('')
    setAuthor('')
    setShowCreate(false)
  }

  return (
    <div className="book-selector">
      <div className="book-selector-header">
        <h1>超级作者</h1>
        <p className="book-selector-subtitle">选择或创建一本书开始写作</p>
      </div>

      <div className="book-grid">
        {books.map((book: Book) => (
          <div key={book.id} className="book-card" onClick={() => openBook(book)}>
            <div className="book-card-cover">
              <span className="book-card-emoji">📖</span>
            </div>
            <div className="book-card-info">
              <h3>{book.title}</h3>
              <p className="book-card-author">{book.author}</p>
              {book.tags.length > 0 && (
                <div className="book-card-tags">
                  {book.tags.map((tag) => (
                    <span key={tag} className="book-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="book-card book-card-new" onClick={() => setShowCreate(true)}>
          <div className="book-card-cover">
            <span className="book-card-emoji">+</span>
          </div>
          <div className="book-card-info">
            <h3>新建书籍</h3>
            <p className="book-card-author">点击创建新书</p>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="book-selector-overlay">
          <div className="create-dialog">
            <h2>新建书籍</h2>
            <input
              className="create-input"
              placeholder="书名"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <input
              className="create-input"
              placeholder="作者"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <div className="create-actions">
              <button className="create-btn cancel" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="create-btn confirm" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
