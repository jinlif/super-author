// src/application/stores/editorStore.ts
import { create } from 'zustand'
import type { EditorTab } from '../../domain/types/layout'
import { useModelService } from '../services/ModelService'
import { useAgentStore } from './agentStore'

interface EditorStore {
  tabs: EditorTab[]
  activeTabId: string | null

  openFile: (filePath: string, fileName: string, content: string) => void
  openSettings: () => void
  openDiff: (title: string, filePath: string, original: string, modified: string) => void
  closeDiffTab: () => void
  setActiveTab: (tabId: string) => void
  requestCloseTab: (tabId: string) => void
  forceCloseTab: (tabId: string) => void
  cancelCloseTab: () => void
}

let nextId = 1

function closeTabLogic(tabs: EditorTab[], tabId: string, activeTabId: string | null) {
  const idx = tabs.findIndex((t) => t.id === tabId)
  const newTabs = tabs.filter((t) => t.id !== tabId)
  let newActiveId = activeTabId
  if (activeTabId === tabId) {
    if (newTabs.length > 0) {
      const newIdx = Math.min(idx, newTabs.length - 1)
      newActiveId = newTabs[newIdx]?.id ?? null
    } else {
      newActiveId = null
    }
  }
  return { tabs: newTabs, activeTabId: newActiveId }
}

export const useEditorStore = create<EditorStore>((set) => ({
  tabs: [],
  activeTabId: null,

  openFile: (filePath, fileName, content) =>
    set((state) => {
      const existing = state.tabs.find((t) => t.filePath === filePath)
      if (existing) {
        return { activeTabId: existing.id }
      }
      useModelService.getState().getOrCreate(filePath, fileName, content)
      const id = `tab-${nextId++}`
      const newTab: EditorTab = { id, filePath, fileName }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  openSettings: () =>
    set((state) => {
      const SETTINGS_ID = 'settings://'
      const existing = state.tabs.find((t) => t.filePath === SETTINGS_ID)
      if (existing) {
        return { activeTabId: existing.id }
      }
      const id = `tab-${nextId++}`
      const newTab: EditorTab = { id, filePath: SETTINGS_ID, fileName: '设置', type: 'settings' }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  openDiff: (title, filePath, original, modified) =>
    set((state) => {
      const DIFF_PATH = `diff://${filePath}`
      const existing = state.tabs.find((t) => t.filePath === DIFF_PATH)
      if (existing) {
        // 更新已有 diff 标签的数据并激活
        return {
          tabs: state.tabs.map((t) =>
            t.id === existing.id
              ? { ...t, diffData: { title, originalFilePath: filePath, original, modified } }
              : t,
          ),
          activeTabId: existing.id,
        }
      }
      const id = `tab-${nextId++}`
      const newTab: EditorTab = {
        id,
        filePath: DIFF_PATH,
        fileName: `Diff: ${title}`,
        type: 'diff',
        diffData: { title, originalFilePath: filePath, original, modified },
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  closeDiffTab: () =>
    set((state) => {
      const diffTab = state.tabs.find((t) => t.type === 'diff')
      if (!diffTab) return state
      return closeTabLogic(state.tabs, diffTab.id, state.activeTabId)
    }),

  setActiveTab: (tabId) => {
    useModelService.getState().clearPendingClose()
    set({ activeTabId: tabId })
  },

  requestCloseTab: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId)
      if (!tab) return state
      // diff 标签直接关闭，无需脏检查
      if (tab.type === 'diff') {
        useAgentStore.getState().clearDiffForReview()
        return closeTabLogic(state.tabs, tabId, state.activeTabId)
      }
      const ms = useModelService.getState()
      if (!ms.isDirty(tab.filePath)) {
        ms.release(tab.filePath)
        return closeTabLogic(state.tabs, tabId, state.activeTabId)
      }
      ms.setPendingClose(tab.filePath, tab.fileName)
      return state
    }),

  forceCloseTab: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId)
      if (tab) {
        useModelService.getState().release(tab.filePath)
      }
      const result = closeTabLogic(state.tabs, tabId, state.activeTabId)
      useModelService.getState().clearPendingClose()
      return result
    }),

  cancelCloseTab: () => {
    useModelService.getState().clearPendingClose()
  },
}))
