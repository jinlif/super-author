// src/application/services/ModelService.ts
import { create } from 'zustand'
import type { TextModel } from '../../domain/types/model'

interface ModelServiceState {
  models: Record<string, TextModel>
  refCount: Record<string, number>
  pendingCloseUri: string | null
  pendingCloseFileName: string

  getOrCreate: (uri: string, fileName: string, initialContent: string) => TextModel
  release: (uri: string) => void
  updateValue: (uri: string, value: string) => void
  markClean: (uri: string) => void
  isDirty: (uri: string) => boolean
  setPendingClose: (uri: string, fileName: string) => void
  clearPendingClose: () => void
}

export const useModelService = create<ModelServiceState>((set, get) => ({
  models: {},
  refCount: {},
  pendingCloseUri: null,
  pendingCloseFileName: '',

  getOrCreate: (uri, _fileName, initialContent) => {
    const state = get()
    const existing = state.models[uri]
    if (existing) {
      set({ refCount: { ...state.refCount, [uri]: (state.refCount[uri] ?? 1) + 1 } })
      return existing
    }
    const model: TextModel = {
      uri,
      value: initialContent,
      versionId: 1,
      savedVersionId: 1,
      language: 'markdown',
    }
    set({
      models: { ...state.models, [uri]: model },
      refCount: { ...state.refCount, [uri]: 1 },
    })
    return model
  },

  release: (uri) => {
    const state = get()
    const count = (state.refCount[uri] ?? 0) - 1
    if (count <= 0) {
      const { [uri]: _, ...restModels } = state.models
      const { [uri]: __, ...restRefCount } = state.refCount
      set({ models: restModels, refCount: restRefCount })
    } else {
      set({ refCount: { ...state.refCount, [uri]: count } })
    }
  },

  updateValue: (uri, value) => {
    const model = get().models[uri]
    if (!model) return
    set({
      models: {
        ...get().models,
        [uri]: { ...model, value, versionId: model.versionId + 1 },
      },
    })
  },

  markClean: (uri) => {
    const model = get().models[uri]
    if (!model) return
    set({
      models: {
        ...get().models,
        [uri]: { ...model, savedVersionId: model.versionId },
      },
    })
  },

  isDirty: (uri) => {
    const model = get().models[uri]
    if (!model) return false
    return model.versionId !== model.savedVersionId
  },

  setPendingClose: (uri, fileName) => set({ pendingCloseUri: uri, pendingCloseFileName: fileName }),

  clearPendingClose: () => set({ pendingCloseUri: null, pendingCloseFileName: '' }),
}))
