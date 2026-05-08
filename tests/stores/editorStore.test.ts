import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../../src/application/stores/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ tabs: [], activeTabId: null })
  })

  it('初始状态无标签', () => {
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(0)
    expect(state.activeTabId).toBeNull()
  })

  it('openFile 打开新标签', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0]!.fileName).toBe('01-开篇.md')
    expect(state.activeTabId).toBe(state.tabs[0]!.id)
  })

  it('openFile 同名文件不重复打开', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    expect(useEditorStore.getState().tabs).toHaveLength(1)
  })

  it('closeTab 移除标签并切换到相邻', () => {
    const store = useEditorStore.getState()
    store.openFile('/a.md', 'a.md')
    store.openFile('/b.md', 'b.md')
    store.openFile('/c.md', 'c.md')
    expect(useEditorStore.getState().tabs).toHaveLength(3)

    const bTab = useEditorStore.getState().tabs[1]!
    useEditorStore.getState().closeTab(bTab.id)
    expect(useEditorStore.getState().tabs).toHaveLength(2)
  })

  it('markDirty 标记未保存', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md')
    const tab = useEditorStore.getState().tabs[0]!
    useEditorStore.getState().markDirty(tab.id, true)
    expect(useEditorStore.getState().tabs[0]!.isDirty).toBe(true)
  })
})
