import { useLayoutStore } from '../../application/stores/layoutStore'
import type { ActivityBarItem } from '../../domain/types/layout'
import './ActivityBar.css'

interface ActivityIcon {
  id: ActivityBarItem
  label: string
  icon: string
}

const items: ActivityIcon[] = [
  { id: 'files', label: '文件', icon: '\u{1F4C1}' },
  { id: 'search', label: '搜索', icon: '\u{1F50D}' },
  { id: 'characters', label: '角色', icon: '\u{1F464}' },
  { id: 'settings', label: '设置', icon: '\u{2699}\u{FE0F}' },
]

export function ActivityBar() {
  const activeActivity = useLayoutStore((s) => s.activeActivity)
  const setActiveActivity = useLayoutStore((s) => s.setActiveActivity)

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`activity-icon ${activeActivity === item.id ? 'active' : ''}`}
          onClick={() => setActiveActivity(item.id)}
          title={item.label}
        >
          <span className="activity-icon-emoji">{item.icon}</span>
        </button>
      ))}
    </div>
  )
}
