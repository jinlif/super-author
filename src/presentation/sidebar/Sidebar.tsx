import { useLayoutStore } from '../../application/stores/layoutStore'
import { FileExplorer } from '../fileExplorer/FileExplorer'
import './Sidebar.css'

export function Sidebar() {
  const visible = useLayoutStore((s) => s.sidebarVisible)
  const width = useLayoutStore((s) => s.panelSizes.sidebar)

  if (!visible) return null

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-title">资源管理器</span>
      </div>
      <div className="sidebar-content">
        <FileExplorer />
      </div>
    </div>
  )
}
