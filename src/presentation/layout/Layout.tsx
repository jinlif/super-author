import { ActivityBar } from '../activityBar/ActivityBar'
import { AgentPanel } from '../agentPanel/AgentPanel'
import { EditorPanel } from '../editor/EditorPanel'
import { Sidebar } from '../sidebar/Sidebar'
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
