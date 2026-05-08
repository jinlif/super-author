import { create } from 'zustand'
import type { EditorTab } from '../../domain/types/layout'

interface EditorStore {
  tabs: EditorTab[]
  activeTabId: string | null

  openFile: (filePath: string, fileName: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  markDirty: (tabId: string, dirty: boolean) => void
}

let nextId = 1

export const useEditorStore = create<EditorStore>((set) => ({
  tabs: [],
  activeTabId: null,

  openFile: (filePath, fileName) =>
    set((state) => {
      const existing = state.tabs.find((t) => t.filePath === filePath)
      if (existing) {
        return { activeTabId: existing.id }
      }
      const id = `tab-${nextId++}`
      const newTab: EditorTab = {
        id,
        filePath,
        fileName,
        isDirty: false,
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  closeTab: (tabId) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId)
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveId = state.activeTabId
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          const newIdx = Math.min(idx, newTabs.length - 1)
          newActiveId = newTabs[newIdx]?.id ?? null
        } else {
          newActiveId = null
        }
      }
      return { tabs: newTabs, activeTabId: newActiveId }
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  markDirty: (tabId, dirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t)),
    })),
}))
