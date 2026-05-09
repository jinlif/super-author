import { useLayoutStore } from '../../application/stores/layoutStore'
import { ChapterTree } from './ChapterTree'
import './Sidebar.css'

export function Sidebar() {
  const visible = useLayoutStore((s) => s.sidebarVisible)
  const width = useLayoutStore((s) => s.panelSizes.sidebar)
  const activeActivity = useLayoutStore((s) => s.activeActivity)

  if (!visible) return null

  const renderPanel = () => {
    if (activeActivity === 'search') {
      return <p className="sidebar-placeholder">大纲（Phase 2 基础展示）</p>
    }
    if (activeActivity === 'characters') {
      return <p className="sidebar-placeholder">角色管理（后续 Phase 实现）</p>
    }
    // files 或未选中 → 章节树
    return <ChapterTree />
  }

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
      <div className="sidebar-content">{renderPanel()}</div>
    </div>
  )
}
