import { beforeEach, describe, expect, it } from 'vitest'
import { useLayoutStore } from '../../src/application/stores/layoutStore'

describe('layoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
  })

  it('初始状态正确', () => {
    const state = useLayoutStore.getState()
    expect(state.sidebarVisible).toBe(true)
    expect(state.agentVisible).toBe(true)
    expect(state.agentPosition).toBe('right')
    expect(state.panelSizes.sidebar).toBe(280)
  })

  it('toggleSidebar 切换侧边栏可见性', () => {
    useLayoutStore.getState().toggleSidebar()
    expect(useLayoutStore.getState().sidebarVisible).toBe(false)
    useLayoutStore.getState().toggleSidebar()
    expect(useLayoutStore.getState().sidebarVisible).toBe(true)
  })

  it('toggleAgent 切换 Agent 面板可见性', () => {
    useLayoutStore.getState().toggleAgent()
    expect(useLayoutStore.getState().agentVisible).toBe(false)
    useLayoutStore.getState().toggleAgent()
    expect(useLayoutStore.getState().agentVisible).toBe(true)
  })

  it('setSidebarWidth 限制在 [180, 500] 范围', () => {
    useLayoutStore.getState().setSidebarWidth(100)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(180)
    useLayoutStore.getState().setSidebarWidth(600)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(500)
    useLayoutStore.getState().setSidebarWidth(300)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(300)
  })

  it('setActiveActivity 切换活动栏项目', () => {
    useLayoutStore.getState().setActiveActivity('files')
    expect(useLayoutStore.getState().activeActivity).toBe('files')
    useLayoutStore.getState().setActiveActivity('files')
    expect(useLayoutStore.getState().activeActivity).toBe(null)
  })
})
