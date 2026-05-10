# Editor Model 服务实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 VS Code 三层模型（TextModel + ModelService + 纯视图 EditorTab）替换当前 per-tab 内容缓冲方案，解决标签切换/关闭重开后显示内容与磁盘不一致的问题。

**Architecture:** 新增 ModelService（Zustand store）管理所有 TextModel 的生命周期（引用计数、脏检查），EditorTab 退化为纯视图指针（filePath），Monaco Editor 使用 `setModel()` 切换而非 `key=` 重挂载。保存通过 filePath 定位 Chapter，不依赖副作用同步的 currentChapter。

**Tech Stack:** React 19 + TypeScript 5 + Zustand 5 + Monaco Editor + Vitest 4

---

### Task 1: 定义 TextModel 类型

**Files:**
- Create: `src/domain/types/model.ts`

- [ ] **Step 1: 创建 TextModel 接口**

```typescript
// src/domain/types/model.ts
export interface TextModel {
  uri: string
  value: string
  versionId: number
  savedVersionId: number
  language: string
}
```

- [ ] **Step 2: 提交**

```bash
git add src/domain/types/model.ts
git commit -m "feat: 定义 TextModel 接口"
```

---

### Task 2: 简化 EditorTab 类型

**Files:**
- Modify: `src/domain/types/layout.ts`

- [ ] **Step 1: 移除 EditorTab 的 content 和 isDirty 字段**

原代码：
```typescript
export interface EditorTab {
  id: string
  filePath: string
  fileName: string
  isDirty: boolean
  content: string
}
```

修改为：
```typescript
export interface EditorTab {
  id: string
  filePath: string
  fileName: string
}
```

- [ ] **Step 2: 提交**

```bash
git add src/domain/types/layout.ts
git commit -m "refactor: 简化 EditorTab - 移除 content/isDirty，Tab 退化为纯视图指针"
```

---

### Task 3: 编写 ModelService 测试（先写测试）

**Files:**
- Create: `tests/services/ModelService.test.ts`

- [ ] **Step 1: 编写 ModelService 单元测试**

```typescript
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
    expect(model.value).toBe('原始') // 忽略新内容
    expect(useModelService.getState().refCount['/a.md']).toBe(2)
  })

  it('release 减少引用计数，归零时销毁 Model', () => {
    useModelService.getState().getOrCreate('/a.md', 'a', '')
    useModelService.getState().getOrCreate('/a.md', 'a', '') // refCount=2
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
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run tests/services/ModelService.test.ts
```

Expected: FAIL — `useModelService` 模块尚未创建。

- [ ] **Step 3: 提交**

```bash
git add tests/services/ModelService.test.ts
git commit -m "test: 添加 ModelService 单元测试（TDD）"
```

---

### Task 4: 实现 ModelService

**Files:**
- Create: `src/application/services/ModelService.ts`

- [ ] **Step 1: 实现 ModelService Zustand store**

```typescript
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

  getOrCreate: (uri, fileName, initialContent) => {
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

  setPendingClose: (uri, fileName) =>
    set({ pendingCloseUri: uri, pendingCloseFileName: fileName }),

  clearPendingClose: () =>
    set({ pendingCloseUri: null, pendingCloseFileName: '' }),
}))
```

- [ ] **Step 2: 运行测试**

```bash
npx vitest run tests/services/ModelService.test.ts
```

Expected: 全部 9 个测试通过。

- [ ] **Step 3: 提交**

```bash
git add src/application/services/ModelService.ts
git commit -m "feat: 实现 ModelService - VS Code 风格 Model 生命周期管理"
```

---

### Task 5: 编写新 editorStore 测试（先写测试）

**Files:**
- Overwrite: `tests/stores/editorStore.test.ts`

- [ ] **Step 1: 重写 editorStore 测试**

```typescript
// tests/stores/editorStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { useModelService } from '../../src/application/services/ModelService'

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

    // 验证 ModelService 中创建了对应 Model
    const model = useModelService.getState().models['/chapters/01.md']
    expect(model).toBeDefined()
    expect(model?.value).toBe('# 内容')
  })

  it('openFile 同名文件不重复打开标签', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '旧')
    useEditorStore.getState().openFile('/a.md', 'a.md', '新')
    expect(useEditorStore.getState().tabs).toHaveLength(1)
    // Model 内容不被覆盖
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
    expect(useEditorStore.getState().tabs).toHaveLength(1) // 标签仍然存在
    expect(useModelService.getState().pendingCloseUri).toBe('/a.md')
    expect(useModelService.getState().pendingCloseFileName).toBe('a.md')
  })

  it('cancelCloseTab 清空 pending 状态', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    useModelService.getState().updateValue('/a.md', '脏')
    const tab = useEditorStore.getState().tabs[0]!
    useEditorStore.getState().requestCloseTab(tab.id)
    useEditorStore.getState().cancelCloseTab()
    expect(useModelService.getState().pendingCloseUri).toBeNull()
  })

  it('setActiveTab 切换时清空 pending 状态', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md', '')
    useEditorStore.getState().openFile('/b.md', 'b.md', '')
    useModelService.getState().updateValue('/a.md', '脏')
    const aTab = useEditorStore.getState().tabs[0]!
    useEditorStore.getState().requestCloseTab(aTab.id)
    expect(useModelService.getState().pendingCloseUri).toBe('/a.md')
    const bTab = useEditorStore.getState().tabs[1]!
    useEditorStore.getState().setActiveTab(bTab.id)
    expect(useModelService.getState().pendingCloseUri).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run tests/stores/editorStore.test.ts
```

Expected: 编译错误/测试失败 — editorStore 尚未重写。

- [ ] **Step 3: 提交**

```bash
git add tests/stores/editorStore.test.ts
git commit -m "test: 重写 editorStore 测试 - 适配 VS Code Model 模式"
```

---

### Task 6: 重写 editorStore

**Files:**
- Overwrite: `src/application/stores/editorStore.ts`

- [ ] **Step 1: 重写 editorStore 为纯视图状态管理**

```typescript
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
      // 委托 ModelService 创建 Model（如果已存在则复用）
      useModelService.getState().getOrCreate(filePath, fileName, content)
      const id = `tab-${nextId++}`
      const newTab: EditorTab = { id, filePath, fileName }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  setActiveTab: (tabId) => {
    // 切换标签时取消 pending 状态
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
```

- [ ] **Step 2: 运行 editorStore 测试**

```bash
npx vitest run tests/stores/editorStore.test.ts
```

Expected: 全部 8 个测试通过。

- [ ] **Step 3: 提交**

```bash
git add src/application/stores/editorStore.ts
git commit -m "refactor: 重写 editorStore - 纯视图状态，内容委托 ModelService"
```

---

### Task 7: 更新 bookStore

**Files:**
- Modify: `src/application/stores/bookStore.ts`

- [ ] **Step 1: 移除 chapterContent，简化 loadChapter 副作用**

三处修改：

1. 从接口移除 `chapterContent`：
```typescript
// 删除这一行
chapterContent: string
```

2. 从初始状态和状态重置中移除 `chapterContent`：
```typescript
// 初始状态中删除
chapterContent: '',

// openBook 中删除
chapterContent: '',

// closeBook 中删除
chapterContent: '',
```

3. 简化 `loadChapter`——移除 `chapterContent` set，保留 `currentChapter` set：
```typescript
loadChapter: async (chapter: Chapter) => {
  const repo = get()._chapterRepo
  const content = await repo.readChapter(chapter.filePath)
  set({ currentChapter: chapter })
  return content
},
```

- [ ] **Step 2: 运行 bookStore 测试验证无回归**

```bash
npx vitest run tests/stores/bookStore.test.ts
```

Expected: 测试可能因 `chapterContent` 断言而失败。需要更新测试。

- [ ] **Step 3: 更新 bookStore 测试**

修改 `tests/stores/bookStore.test.ts`：

删除引用 `chapterContent` 的断言：
- 第 71-72 行 `loadChapter` 测试中移除 `expect(state.chapterContent).toBe(...)`，改为检查返回值：
```typescript
it('loadChapter 读取并设置 currentChapter', async () => {
  // ... setup ...
  const content = await useBookStore.getState().loadChapter(chapter)
  expect(useBookStore.getState().currentChapter?.id).toBe(chapter.id)
  expect(content).toBe('# 测试\n\n')
})
```

- 第 98 行 `closeBook` 测试中移除 `chapterContent` 断言：
```typescript
expect(useBookStore.getState().chapterContent).toBe('')  // 删除此行
```

- 在 `beforeEach` 的 `useBookStore.setState` 中移除 `chapterContent: ''`。

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/stores/bookStore.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/application/stores/bookStore.ts tests/stores/bookStore.test.ts
git commit -m "refactor: 移除 bookStore.chapterContent - 内容缓冲由 ModelService 管理"
```

---

### Task 8: 更新 EditorTabs 组件

**Files:**
- Modify: `src/presentation/editor/tabs/EditorTabs.tsx`

- [ ] **Step 1: isDirty 从 ModelService 读取，而非 tab.isDirty**

```typescript
// src/presentation/editor/tabs/EditorTabs.tsx
import { useEditorStore } from '../../../application/stores/editorStore'
import { useModelService } from '../../../application/services/ModelService'
import './EditorTabs.css'

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const requestCloseTab = useEditorStore((s) => s.requestCloseTab)
  const isDirty = useModelService((s) => s.isDirty)

  if (tabs.length === 0) return null

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          tabIndex={0}
          className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setActiveTab(tab.id)
            }
          }}
        >
          <span className="tab-label">
            {isDirty(tab.filePath) && <span className="tab-dirty">{'●'}</span>}
            {tab.fileName}
          </span>
          <button
            type="button"
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              requestCloseTab(tab.id)
            }}
          >
            {'×'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/presentation/editor/tabs/EditorTabs.tsx
git commit -m "refactor: EditorTabs isDirty 从 ModelService 读取"
```

---

### Task 9: 更新 ChapterTree 组件

**Files:**
- Modify: `src/presentation/sidebar/ChapterTree.tsx`

- [ ] **Step 1: 适配 openFile 新签名（需要 content 参数）**

`loadChapter` 已返回 content，直接传入。无需大改——当前代码就已经先 `loadChapter` 再 `openFile`：

```typescript
// ChapterTree 中点击处理保持不变
onClick={async () => {
  const content = await loadChapter(chapter)
  openFile(chapter.filePath, chapter.title + '.md', content)
}}
onKeyDown={async (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const content = await loadChapter(chapter)
    openFile(chapter.filePath, chapter.title + '.md', content)
  }
}}
```

注意：fileName 参数改为 `chapter.title + '.md'`（原来只传 `chapter.title`，现在保持一致的命名）。

- [ ] **Step 2: 提交**

```bash
git add src/presentation/sidebar/ChapterTree.tsx
git commit -m "refactor: ChapterTree 适配 editorStore.openFile 新签名"
```

---

### Task 10: 更新 EditorStatusBar 组件

**Files:**
- Modify: `src/presentation/editor/EditorStatusBar.tsx`
- Modify: `tests/presentation/EditorStatusBar.test.tsx`

- [ ] **Step 1: 字数从 Model 计算，章节信息通过 activeTab.filePath 查找**

```typescript
// src/presentation/editor/EditorStatusBar.tsx
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import { useModelService } from '../../application/services/ModelService'
import './EditorStatusBar.css'

interface EditorStatusBarProps {
  liveWordCount: number
}

export function EditorStatusBar({ liveWordCount }: EditorStatusBarProps) {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const chapters = useBookStore((s) => s.chapters)
  const models = useModelService((s) => s.models)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const activeModel = activeTab ? models[activeTab.filePath] : null
  const chapter = activeTab
    ? chapters.find((c) => c.filePath === activeTab.filePath) ?? null
    : null

  const wordCount = liveWordCount > 0
    ? liveWordCount
    : (activeModel
      ? activeModel.value.replace(/[\s\n]/g, '').length
      : (chapter?.wordCount ?? 0))

  const status = chapter?.status === 'completed' ? '已完成' : '草稿'
  const fileName = activeTab ? activeTab.fileName : (chapter ? `${chapter.title}.md` : '未打开')

  return (
    <div className="editor-statusbar">
      <span className="statusbar-item">{fileName}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">字数: {wordCount.toLocaleString()}</span>
      <span className="statusbar-divider" />
      <span className="statusbar-item">{status}</span>
    </div>
  )
}
```

- [ ] **Step 2: 更新 EditorStatusBar 测试**

```typescript
// tests/presentation/EditorStatusBar.test.tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from '../../src/application/stores/bookStore'
import { useEditorStore } from '../../src/application/stores/editorStore'
import { useModelService } from '../../src/application/services/ModelService'
import { MockFileService } from '../../src/infrastructure/MockFileService'
import { EditorStatusBar } from '../../src/presentation/editor/EditorStatusBar'

describe('EditorStatusBar', () => {
  beforeEach(async () => {
    const fs = new MockFileService()
    useBookStore.setState({
      books: [],
      currentBook: null,
      chapters: [],
      currentChapter: null,
      isLoading: false,
      baseDir: '/books',
    })
    useBookStore.getState().setFileService(fs)
    useEditorStore.setState({ tabs: [], activeTabId: null })
    useModelService.setState({
      models: {},
      refCount: {},
      pendingCloseUri: null,
      pendingCloseFileName: '',
    })
  })

  it('无标签时显示默认状态', () => {
    render(<EditorStatusBar liveWordCount={0} />)
    expect(screen.getByText('未打开')).toBeInTheDocument()
    expect(screen.getByText('字数: 0')).toBeInTheDocument()
  })

  it('有激活标签时显示文件名和字数', async () => {
    const store = useBookStore.getState()
    await store.createBook('书', '作者')
    const book = useBookStore.getState().books[0]
    if (!book) throw new Error('Expected book')
    await store.openBook(book)
    await store.createChapter('第一章')
    const chapter = useBookStore.getState().chapters[0]
    if (!chapter) throw new Error('Expected chapter')

    // 通过 editorStore.openFile 创建标签 + Model
    const content = await store.loadChapter(chapter)
    useEditorStore.getState().openFile(chapter.filePath, '第一章.md', content)

    render(<EditorStatusBar liveWordCount={0} />)
    expect(screen.getByText('第一章.md')).toBeInTheDocument()
    expect(screen.getByText(/字数:/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run tests/presentation/EditorStatusBar.test.tsx
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add src/presentation/editor/EditorStatusBar.tsx tests/presentation/EditorStatusBar.test.tsx
git commit -m "refactor: EditorStatusBar 从 ModelService 获取字数，通过 filePath 查找章节"
```

---

### Task 11: 重写 EditorPanel — 核心重构

**Files:**
- Overwrite: `src/presentation/editor/EditorPanel.tsx`

这是本次最大的重构。用 `editor.setModel()` 替代 `key=`，用 ModelService 替代 per-tab content，用 filePath 保存替代 currentChapter。

- [ ] **Step 1: 重写 EditorPanel 组件**

```typescript
// src/presentation/editor/EditorPanel.tsx
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type * as Monaco from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import { useModelService } from '../../application/services/ModelService'
import { ConfirmSaveDialog } from '../components/ConfirmSaveDialog'
import { EditorStatusBar } from './EditorStatusBar'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const forceCloseTab = useEditorStore((s) => s.forceCloseTab)
  const cancelCloseTab = useEditorStore((s) => s.cancelCloseTab)

  const models = useModelService((s) => s.models)
  const updateValue = useModelService((s) => s.updateValue)
  const markClean = useModelService((s) => s.markClean)
  const isDirtyModel = useModelService((s) => s.isDirty)
  const pendingCloseUri = useModelService((s) => s.pendingCloseUri)
  const pendingCloseFileName = useModelService((s) => s.pendingCloseFileName)

  const chapters = useBookStore((s) => s.chapters)
  const saveChapter = useBookStore((s) => s.saveChapter)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [liveWordCount, setLiveWordCount] = useState(0)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const activeUri = activeTab?.filePath ?? null

  // 保存：通过 filePath 查找 Chapter，不依赖 currentChapter
  const doSave = useCallback(
    async (filePath: string) => {
      const ms = useModelService.getState()
      if (!ms.isDirty(filePath)) return
      const model = ms.models[filePath]
      if (!model) return
      const chapter = useBookStore.getState().chapters.find((c) => c.filePath === filePath)
      if (!chapter) return
      try {
        await saveChapter(model.value, chapter)
        ms.markClean(filePath)
      } catch {
        console.warn('保存失败')
      }
    },
    [saveChapter],
  )

  const doSaveRef = useRef(doSave)
  doSaveRef.current = doSave

  // Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeUri) doSaveRef.current(activeUri)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeUri])

  // Monaco 挂载
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // 初始加载：切换到 activeTab 的 Monaco Model
    const es = useEditorStore.getState()
    const tab = es.tabs.find((t) => t.id === es.activeTabId)
    if (tab) {
      const model = getOrCreateMonacoModel(tab.filePath, monaco)
      if (model) editor.setModel(model)
    }
  }

  // 切换标签时切换 Monaco Model（不重挂载）
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeUri) return

    const model = getOrCreateMonacoModel(activeUri, monaco)
    if (!model) return

    // 如果当前 Monaco Model 就是目标 Model，跳过
    if (editor.getModel()?.uri.toString() === monaco.Uri.parse(activeUri).toString()) return

    editor.setModel(model)
    setLiveWordCount(model.getValue().replace(/[\s\n]/g, '').length)

    // 同步 currentChapter 到 bookStore（供 StatusBar 等使用）
    const chapter = useBookStore.getState().chapters.find((c) => c.filePath === activeUri)
    if (chapter) {
      useBookStore.setState({ currentChapter: chapter })
    }
  }, [activeUri])

  // 获取或创建 Monaco Model（去重）
  function getOrCreateMonacoModel(
    uri: string,
    monaco: typeof Monaco,
  ): editor.IModel | null {
    const monacoUri = monaco.Uri.parse(uri)
    const existing = monaco.editor.getModel(monacoUri)
    if (existing) return existing

    const ms = useModelService.getState()
    const textModel = ms.models[uri]
    if (!textModel) return null

    return monaco.editor.createModel(textModel.value, 'markdown', monacoUri)
  }

  // 编辑时更新 Model
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined || !activeUri) return
      updateValue(activeUri, value)
      setLiveWordCount(value.replace(/[\s\n]/g, '').length)

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        doSaveRef.current(activeUri)
      }, 5000)
    },
    [activeUri, updateValue],
  )

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (activeUri) doSave(activeUri)
    }
  }, [activeUri, doSave])

  // 全部关闭时清除 currentChapter
  useEffect(() => {
    if (tabs.length === 0) {
      useBookStore.setState({ currentChapter: null })
    }
  }, [tabs.length])

  // 关闭确认对话框回调
  const handleSaveAndClose = useCallback(async () => {
    if (!pendingCloseUri) return
    await doSave(pendingCloseUri)
    // 找到对应 tabId 并 forceClose
    const tab = useEditorStore.getState().tabs.find((t) => t.filePath === pendingCloseUri)
    if (tab) useEditorStore.getState().forceCloseTab(tab.id)
  }, [pendingCloseUri, doSave])

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingCloseUri) return
    const tab = useEditorStore.getState().tabs.find((t) => t.filePath === pendingCloseUri)
    if (tab) useEditorStore.getState().forceCloseTab(tab.id)
  }, [pendingCloseUri])

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 || !activeTab ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>选择章节开始编辑</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        )}
      </div>
      <EditorStatusBar liveWordCount={liveWordCount} />
      <ConfirmSaveDialog
        open={pendingCloseUri !== null}
        fileName={pendingCloseFileName}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={cancelCloseTab}
      />
    </div>
  )
}
```

关键变化 vs 旧代码：
- **移除** `key={activeTab.id}` — Monaco 不再重挂载
- **移除** `defaultValue={activeTab.content}` — 内容由 setModel 提供
- **移除** `contentRef` — 不需要了
- **移除** `editingChapterRef` — 保存用 filePath 查找
- **移除** `prevActiveTabIdRef` 和复杂的标签切换保存逻辑 — 切换只是 setModel
- **新增** `getOrCreateMonacoModel` — 利用 Monaco 内置 URI 去重
- **新增** `handleEditorDidMount` 中初始切换到 active model
- **新增** useEffect 在 activeUri 变化时 `editor.setModel()`
- **修改** `doSave` 通过 filePath 查找 chapter
- **修改** `handleChange` 直接更新 ModelService

- [ ] **Step 2: 提交**

```bash
git add src/presentation/editor/EditorPanel.tsx
git commit -m "refactor: EditorPanel 用 setModel() 替代 key 重挂载，通过 filePath 保存"
```

---

### Task 12: 全量测试 + 修复

**Files:**
- 所有修改过的文件

- [ ] **Step 1: 运行全部测试**

```bash
npx vitest run
```

- [ ] **Step 2: 检查失败**

重点关注：
- Phase2 集成测试中可能引用了 `chapterContent` 或旧的 Tab 属性
- 组件测试中可能引用了旧的 EditorTab 字段
- TypeScript 编译错误

- [ ] **Step 3: 修复 Phase2 集成测试（如有引用旧字段）**

检查 `tests/phase2/Phase2.test.tsx`，如果引用了 `chapterContent` 则改为通过 ModelService 验证：

```typescript
// 旧写法
expect(useBookStore.getState().chapterContent).toBe('...')
// 新写法
expect(useModelService.getState().models['/path']?.value).toBe('...')
```

- [ ] **Step 4: 运行 TypeScript 编译检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 运行 lint**

```bash
npx biome check
```

- [ ] **Step 6: 确认全部通过后提交**

```bash
git add -A
git commit -m "fix: 修复全量测试和类型检查，适配 ModelService 模式"
```

---

## 文件变更汇总

| 操作 | 文件 | 说明 |
|---|---|---|
| 新增 | `src/domain/types/model.ts` | TextModel 接口 |
| 新增 | `src/application/services/ModelService.ts` | Model 生命周期管理 |
| 新增 | `tests/services/ModelService.test.ts` | ModelService 测试 |
| 修改 | `src/domain/types/layout.ts` | EditorTab 移除 content/isDirty |
| 重写 | `src/application/stores/editorStore.ts` | 纯视图状态，委托 ModelService |
| 重写 | `tests/stores/editorStore.test.ts` | 适配新 API |
| 修改 | `src/application/stores/bookStore.ts` | 移除 chapterContent，简化 loadChapter |
| 修改 | `tests/stores/bookStore.test.ts` | 移除 chapterContent 断言 |
| 修改 | `src/presentation/editor/tabs/EditorTabs.tsx` | isDirty 从 ModelService 读取 |
| 修改 | `src/presentation/sidebar/ChapterTree.tsx` | 适配 openFile 新签名 |
| 修改 | `src/presentation/editor/EditorStatusBar.tsx` | 通过 filePath 查找章节 + 字数 |
| 修改 | `tests/presentation/EditorStatusBar.test.tsx` | 适配新数据源 |
| 重写 | `src/presentation/editor/EditorPanel.tsx` | setModel() + ModelService 集成 |
| 可能修改 | `tests/phase2/Phase2.test.tsx` | 如引用旧字段则修复 |
