import { useEditorStore } from '../../application/stores/editorStore'
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
  { id: 'settings', label: '设置', icon: '\u{2699}\u{FE0F}' },
]

export function ActivityBar() {
  const activeActivity = useLayoutStore((s) => s.activeActivity)
  const setActiveActivity = useLayoutStore((s) => s.setActiveActivity)
  const openSettings = useEditorStore((s) => s.openSettings)

  const handleClick = (item: ActivityIcon) => {
    if (item.id === 'settings') {
      openSettings()
    } else {
      setActiveActivity(item.id)
    }
  }

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`activity-icon ${activeActivity === item.id ? 'active' : ''}`}
          onClick={() => handleClick(item)}
          title={item.label}
        >
          <span className="activity-icon-emoji">{item.icon}</span>
        </button>
      ))}
    </div>
  )
}
