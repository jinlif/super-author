// tests/services/ModelService.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useModelService } from '../../src/application/services/ModelService'

describe('ModelService', () => {
  beforeEach(() => {
    useModelService.setState({
      models: {},
      refCount: {},
      pendingCloseUri: null,
      pendingCloseFileName: '',
    })
  })

  it('初始状态为空', () => {
    const state = useModelService.getState()
    expect(state.models).toEqual({})
    expect(state.refCount).toEqual({})
    expect(state.pendingCloseUri).toBeNull()
  })

  it('getOrCreate 创建新 Model 并设 refCount=1', () => {
    const model = useModelService.getState().getOrCreate('/chapters/01.md', '第一章', '# 内容')
    expect(model.uri).toBe('/chapters/01.md')
    expect(model.value).toBe('# 内容')
    expect(model.versionId).toBe(1)
    expect(model.savedVersionId).toBe(1)
    expect(model.language).toBe('markdown')
    expect(useModelService.getState().refCount['/chapters/01.md']).toBe(1)
  })

  it('getOrCreate 同名 URI 复用已有 Model，refCount+1，忽略传入 content', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '原始')
    const model = useModelService.getState().getOrCreate('/a.md', 'a', '新内容')
    expect(model.value).toBe('原始')
    expect(useModelService.getState().refCount['/a.md']).toBe(2)
  })

  it('release 减少引用计数，归零时销毁 Model', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '')
    useModelService.getState().getOrCreate('/a.md', 'a', '')
    useModelService.getState().release('/a.md')
    expect(useModelService.getState().refCount['/a.md']).toBe(1)
    expect(useModelService.getState().models['/a.md']).toBeDefined()
    useModelService.getState().release('/a.md')
    expect(useModelService.getState().refCount['/a.md']).toBeUndefined()
    expect(useModelService.getState().models['/a.md']).toBeUndefined()
  })

  it('updateValue 更新 value 并递增 versionId', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '旧')
    useModelService.getState().updateValue('/a.md', '新内容')
    const model = useModelService.getState().models['/a.md']
    expect(model?.value).toBe('新内容')
    expect(model?.versionId).toBe(2)
  })

  it('isDirty 派生自 versionId !== savedVersionId', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '')
    expect(useModelService.getState().isDirty('/a.md')).toBe(false)
    useModelService.getState().updateValue('/a.md', '修改')
    expect(useModelService.getState().isDirty('/a.md')).toBe(true)
  })

  it('markClean 同步 savedVersionId 到 versionId', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '')
    useModelService.getState().updateValue('/a.md', '修改')
    expect(useModelService.getState().isDirty('/a.md')).toBe(true)
    useModelService.getState().markClean('/a.md')
    expect(useModelService.getState().isDirty('/a.md')).toBe(false)
  })

  it('setPendingClose 设置待确认关闭', () => {
    useModelService.getState().setPendingClose('/a.md', 'a.md')
    expect(useModelService.getState().pendingCloseUri).toBe('/a.md')
    expect(useModelService.getState().pendingCloseFileName).toBe('a.md')
  })

  it('clearPendingClose 清空待确认状态', () => {
    useModelService.getState().setPendingClose('/a.md', 'a.md')
    useModelService.getState().clearPendingClose()
    expect(useModelService.getState().pendingCloseUri).toBeNull()
    expect(useModelService.getState().pendingCloseFileName).toBe('')
  })
})
