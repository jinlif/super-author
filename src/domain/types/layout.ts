// 活动栏项目标识
export type ActivityBarItem = 'files' | 'search' | 'characters' | 'settings'

// 侧边栏面板类型
export type SidebarPanel = 'explorer' | 'search' | 'characters' | null

// Agent 面板位置
export type AgentPosition = 'right' | 'bottom' | 'floating'

// 面板尺寸
export interface PanelSizes {
  sidebar: number
  agent: number
}

// 编辑器标签
export interface EditorTab {
  id: string
  filePath: string
  fileName: string
}

// 布局状态
export interface LayoutState {
  activeActivity: ActivityBarItem | null
  sidebarPanel: SidebarPanel
  sidebarVisible: boolean
  agentPosition: AgentPosition
  agentVisible: boolean
  panelSizes: PanelSizes
}
