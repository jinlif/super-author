import { create } from 'zustand'
import type {
  ActivityBarItem,
  AgentPosition,
  PanelSizes,
  SidebarPanel,
} from '../../domain/types/layout'

interface LayoutStore {
  activeActivity: ActivityBarItem | null
  sidebarPanel: SidebarPanel
  sidebarVisible: boolean
  agentPosition: AgentPosition
  agentVisible: boolean
  panelSizes: PanelSizes

  setActiveActivity: (item: ActivityBarItem) => void
  toggleSidebar: () => void
  setSidebarPanel: (panel: SidebarPanel) => void
  setAgentPosition: (pos: AgentPosition) => void
  toggleAgent: () => void
  setSidebarWidth: (width: number) => void
  setAgentSize: (size: number) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  activeActivity: null,
  sidebarPanel: null,
  sidebarVisible: true,
  agentPosition: 'right',
  agentVisible: true,
  panelSizes: {
    sidebar: 280,
    agent: 360,
  },

  setActiveActivity: (item) =>
    set((state) => ({
      activeActivity: state.activeActivity === item ? null : item,
      sidebarVisible: true,
    })),

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),

  setAgentPosition: (pos) => set({ agentPosition: pos }),

  toggleAgent: () => set((state) => ({ agentVisible: !state.agentVisible })),

  setSidebarWidth: (width) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, sidebar: Math.max(180, Math.min(500, width)) },
    })),

  setAgentSize: (size) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, agent: Math.max(200, Math.min(800, size)) },
    })),
}))
