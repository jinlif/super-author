import { ActivityBar } from '../activityBar/ActivityBar'
import { AgentPanel } from '../agentPanel/AgentPanel'
import { EditorPanel } from '../editor/EditorPanel'
import { Sidebar } from '../sidebar/Sidebar'
import { BookSelector } from '../bookSelector/BookSelector'
import { useBookStore } from '../../application/stores/bookStore'
import './Layout.css'

export function Layout() {
  const currentBook = useBookStore((s) => s.currentBook)

  return (
    <div className="layout">
      <ActivityBar />
      {currentBook && <Sidebar />}
      {currentBook ? <EditorPanel /> : <BookSelector />}
      {currentBook && <AgentPanel />}
    </div>
  )
}
