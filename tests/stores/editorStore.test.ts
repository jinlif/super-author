// tests/stores/editorStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useModelService } from '../../src/application/services/ModelService'
import { useEditorStore } from '../../src/application/stores/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ tabs: [], activeTabId: null })
    useModelService.setState({
      models: {},
      refCount: {},
      pendingCloseUri: null,
      pendingCloseFileName: '',
    })
  })

  it('初始状态无标签', () => {
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(0)
    expect(state.activeTabId).toBeNull()
  })

  it('openFile 创建标签并委托 ModelService 创建 Model', () => {
    useEditorStore.getState().openFile('/chapters/01.md', '01-开篇.md', '# 内容')
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    const tab = state.tabs[0]
    expect(tab?.filePath).toBe('/chapters/01.md')
    expect(tab?.fileName).toBe('01-开篇.md')
    expect(tab).not.toHaveProperty('content')
    expect(tab).not.toHaveProperty('isDirty')
    expect(state.activeTabId).toBe(tab?.id)

    const model = useModelService.getState().models['/chapters/01.md']
    expect(model).toBeDefined()
    expect(model?.value).toBe('# 内容')
  })

  it('openFile 同名文件不重复打开标签', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '旧')
    useEditorStore.getState().openFile('/a.md', 'a.md', '新')
    expect(useEditorStore.getState().tabs).toHaveLength(1)
    expect(useModelService.getState().models['/a.md']?.value).toBe('旧')
  })

  it('forceCloseTab 移除标签并 release Model', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    useEditorStore.getState().openFile('/b.md', 'b.md', '')
    useEditorStore.getState().openFile('/c.md', 'c.md', '')
    expect(useEditorStore.getState().tabs).toHaveLength(3)

    const bTab = useEditorStore.getState().tabs[1]
    if (!bTab) throw new Error('expected tab')
    useEditorStore.getState().forceCloseTab(bTab.id)
    expect(useEditorStore.getState().tabs).toHaveLength(2)
    expect(useModelService.getState().models['/b.md']).toBeUndefined()
  })

  it('requestCloseTab 干净 Model 直接关闭', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    const tab = useEditorStore.getState().tabs[0]
    if (!tab) throw new Error('expected tab')
    useEditorStore.getState().requestCloseTab(tab.id)
    expect(useEditorStore.getState().tabs).toHaveLength(0)
  })

  it('requestCloseTab 脏 Model 设 pending 状态', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    const tab = useEditorStore.getState().tabs[0]
    if (!tab) throw new Error('expected tab')
    useModelService.getState().updateValue('/a.md', '脏数据')
    useEditorStore.getState().requestCloseTab(tab.id)
    expect(useEditorStore.getState().tabs).toHaveLength(1)
    expect(useModelService.getState().pendingCloseUri).toBe('/a.md')
    expect(useModelService.getState().pendingCloseFileName).toBe('a.md')
  })

  it('cancelCloseTab 清空 pending 状态', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    useModelService.getState().updateValue('/a.md', '脏')
    const tab = useEditorStore.getState().tabs[0]
    if (!tab) throw new Error('tab not found')
    useEditorStore.getState().requestCloseTab(tab.id)
    useEditorStore.getState().cancelCloseTab()
    expect(useModelService.getState().pendingCloseUri).toBeNull()
  })

  it('setActiveTab 切换时清空 pending 状态', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    useEditorStore.getState().openFile('/b.md', 'b.md', '')
    useModelService.getState().updateValue('/a.md', '脏')
    const aTab = useEditorStore.getState().tabs[0]
    if (!aTab) throw new Error('aTab not found')
    useEditorStore.getState().requestCloseTab(aTab.id)
    expect(useModelService.getState().pendingCloseUri).toBe('/a.md')
    const bTab = useEditorStore.getState().tabs[1]
    if (!bTab) throw new Error('bTab not found')
    useEditorStore.getState().setActiveTab(bTab.id)
    expect(useModelService.getState().pendingCloseUri).toBeNull()
  })
})
