import { useLayoutStore } from '../../application/stores/layoutStore'
import './Sidebar.css'

export function Sidebar() {
  const visible = useLayoutStore((s) => s.sidebarVisible)
  const width = useLayoutStore((s) => s.panelSizes.sidebar)
  const activeActivity = useLayoutStore((s) => s.activeActivity)

  if (!visible) return null

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activeActivity === 'files' && '资源管理器'}
          {activeActivity === 'search' && '搜索'}
          {activeActivity === 'characters' && '角色管理'}
          {!activeActivity && '资源管理器'}
        </span>
      </div>
      <div className="sidebar-content">
        <p className="sidebar-placeholder">选择书籍开始写作</p>
      </div>
    </div>
  )
}
