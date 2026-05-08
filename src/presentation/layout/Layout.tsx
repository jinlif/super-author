import { ActivityBar } from '../activityBar/ActivityBar'
import { Sidebar } from '../sidebar/Sidebar'
import { EditorPanel } from '../editor/EditorPanel'
import { AgentPanel } from '../agentPanel/AgentPanel'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <ActivityBar />
      <Sidebar />
      <EditorPanel />
      <AgentPanel />
    </div>
  )
}
