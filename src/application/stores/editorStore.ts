// src/application/stores/editorStore.ts
import { create } from 'zustand'
import type { EditorTab } from '../../domain/types/layout'
import { useModelService } from '../services/ModelService'

interface EditorStore {
  tabs: EditorTab[]
  activeTabId: string | null

  openFile: (filePath: string, fileName: string, content: string) => void
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

export const useEditorStore = create<EditorStore>((set, get) => ({
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

  setActiveTab: (tabId) => {
    useModelService.getState().clearPendingClose()
    set({ activeTabId: tabId })
  },

  requestCloseTab: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId)
      if (!tab) return state
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
