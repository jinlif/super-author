# 编辑器 Model 服务设计（VS Code 模式）

## 问题诊断

当前实现（`2026-05-09-editor-tab-buffer-design.md`）的缓冲区方案存在以下架构问题：

1. **Tab 持有 content 数据** — `EditorTab.content` 将内容缓冲绑定在视图层。关闭标签 → 缓冲丢失 → 再打开显示内容可能不一致
2. **`key={activeTab.id}` 强制重挂载 Monaco** — 每次切换标签整个编辑器销毁重建，而非使用 `editor.setModel()` 切换
3. **`doSave` 依赖 `currentChapter`** — `currentChapter` 通过副作用（useEffect）同步，关闭脏标签时可能指向错误章节
4. **缺少 Model 抽象层** — 没有独立于视图的内容缓冲管理，内容生命周期完全绑定在 Tab 上

## 解决方案：VS Code 三层模型

VS Code 编辑器的核心架构：

```
EditorTab (视图) → EditorInput (逻辑) → ITextModel (数据)
```

Tab 是纯 UI，Model 是纯数据。Tab 持有指向 Model 的引用（URI），内容在 Model 中独立管理。

### 核心数据结构

#### TextModel（新增 `src/domain/types/model.ts`）

```typescript
interface TextModel {
  uri: string            // filePath，作为唯一标识 key
  value: string          // 当前内容缓冲
  versionId: number      // 每次编辑 +1
  savedVersionId: number // 最后一次保存时的 versionId
  language: string       // 'markdown'
}

// isDirty 是派生值：versionId !== savedVersionId
```

#### EditorTab（简化 `src/domain/types/layout.ts`）

```typescript
interface EditorTab {
  id: string
  filePath: string       // 指向 TextModel.uri
  fileName: string
}
// 移除：content、isDirty
```

Tab 不再持有内容。Tab 只是指向 Model 的指针。Dirty 状态从 Model 派生。

### ModelService（新增 `src/application/services/ModelService.ts`）

Zustand store，管理所有 TextModel 的生命周期：

| 字段/方法 | 类型 | 说明 |
|---|---|---|
| `models` | `Map<uri, TextModel>` | 所有活跃的 Model |
| `refCount` | `Map<uri, number>` | 引用计数：多少个 Tab 引用该 Model |
| `pendingCloseUri` | `string \| null` | 待关闭的脏文件 URI |
| `pendingCloseFileName` | `string` | 待关闭文件名（对话框显示） |
| `getOrCreate(uri, fileName, initialContent)` | `() => TextModel` | refCount+1；已存在则复用忽略 initialContent，不存在则用 initialContent 创建 |
| `release(uri)` | `() => void` | refCount-1；归零后立即销毁 Model + Monaco Model |
| `updateValue(uri, value)` | `() => void` | 更新 value，versionId+1 |
| `markClean(uri)` | `() => void` | savedVersionId = versionId |
| `isDirty(uri)` | `() => boolean` | 派生值 |
| `setPendingClose(uri, name)` | `() => void` | 标记待确认关闭 |
| `clearPendingClose()` | `() => void` | 清空待确认状态 |

Model 生命周期：refCount > 0 → Model 存活。refCount → 0 → 立即销毁，不保留。重新打开文件时重新从磁盘读取。

### EditorStore（重写 `src/application/stores/editorStore.ts`）

退化为纯 UI 状态管理（tabs/activeTab），不持有内容：

| 字段/方法 | 类型 | 说明 |
|---|---|---|
| `tabs` | `EditorTab[]` | 纯视图引用 |
| `activeTabId` | `string \| null` | 当前活跃 Tab |
| `openFile(filePath, fileName, content)` | `() => void` | 委托 ModelService.getOrCreate 获取/创建 Model |
| `setActiveTab(tabId)` | `() => void` | 仅切换 activeTabId |
| `requestCloseTab(tabId)` | `() => void` | 查 ModelService.isDirty → 干净直接关，脏则设 pending |
| `forceCloseTab(tabId)` | `() => void` | 删 Tab + ModelService.release |
| `cancelCloseTab()` | `() => void` | 清空 ModelService pending 状态 |

## 数据流

### 打开文件

```
ChapterTree 点击章节
  → content = await chapterRepo.readChapter(filePath)  // 纯读取，无副作用
  → editorStore.openFile(filePath, fileName, content)
    → modelService.getOrCreate(uri, fileName, content)
      → models.has(uri)?
        是 → refCount++，复用已有 Model（忽略 content 参数）
        否 → 创建 TextModel + 创建 Monaco IModel → refCount=1
```

ModelService 不负责磁盘 I/O。调用方负责读取初始内容并传入。这样 ModelService 保持纯粹——只管理内存中的 Model 生命周期。

### 编辑（onChange）

```
Monaco onChange(value)
  → modelService.updateValue(activeTab.filePath, value)
    → TextModel.value = value, versionId++
  → 5s 防抖自动保存定时器
```

### 切换标签

```
用户点击 Tab B
  → editorStore.setActiveTab(B.id)
  → useEffect 检测 activeTabId 变化
    → editorRef.current.setModel(monacoEditor.getModel(B.filePath))
    → 无需 key 重挂载
```

### 保存

```
doSave(filePath)
  → model = modelService.getModel(filePath)
  → chapter = bookStore.chapters.find(c => c.filePath === filePath)
  → saveChapter(model.value, chapter)
  → modelService.markClean(filePath)
```

所有保存操作通过 `filePath` 定位，不依赖 `currentChapter`。

### 关闭标签

```
requestCloseTab(tabId)
  → tab = tabs.find(tabId)
  → modelService.isDirty(tab.filePath)?
    clean → forceCloseTab（删 Tab + release Model）
    dirty → setPendingClose → 显示 ConfirmSaveDialog
            ├─ 保存 → doSave → forceCloseTab
            ├─ 不保存 → forceCloseTab
            └─ 取消 → clearPendingClose
```

## Monaco Model 同步

利用 Monaco 内置的 Model 注册机制做去重：

```typescript
// EditorPanel 内
function getOrCreateMonacoModel(uri: string, value: string, monaco: Monaco): editor.IModel {
  const monacoUri = monaco.Uri.parse(uri)
  const existing = monaco.editor.getModel(monacoUri)
  if (existing) return existing
  return monaco.editor.createModel(value, 'markdown', monacoUri)
}
```

- 打开文件时：`monaco.editor.createModel(textModel.value, ...)` 创建
- 切换标签时：`editor.setModel(monacoModel)` 直接切换
- 释放 Model 时：`monacoModel.dispose()` 销毁

Monaco onChange 实时同步到 TextModel，ModelService 是内容的主源。

## 与 BookStore 的关系

```
EditorPanel.save()
  → ModelService 取内容 (by filePath)
  → BookStore.saveChapter(content, chapter-by-filePath) 写磁盘
  → ModelService.markClean(filePath)
```

BookStore 不再作为编辑缓冲，只负责持久化。
- `bookStore.chapterContent` 移除
- `bookStore.loadChapter()` 的副作用（设置 currentChapter/chapterContent）移除
- 新增纯读取方法或通过 ChapterRepository 直接读：`chapterRepo.readChapter(filePath)` 返回 content，不修改 store 状态

## EditorPanel 变更摘要

| 项目 | 旧方案 | 新方案 |
|---|---|---|
| Monaco 挂载方式 | `key={activeTab.id}` 重挂载 | `editor.setModel()` 切换 |
| 内容来源 | `activeTab.content` | `modelService.getModel(filePath).value` |
| onChange | `updateTabContent(tabId, value)` | `modelService.updateValue(filePath, value)` |
| 保存 | 依赖 `currentChapter`（副作用同步） | 通过 `filePath` 查找 Chapter |
| 字数统计 | `activeTab.content` | `model.value` |
| Monaco Model 创建 | 默认内置 | `createModel(value, language, uri)` |

## 边界情况

1. **Tab 重名不重复** — `openFile` 检查 `tabs.find(filePath)`，同名文件不重复打开（因为 filePath 不同）
2. **多个脏标签连续关闭** — 每次只处理一个 pending 请求
3. **组件卸载时保存** — 取 `modelService.getDirtyModels()` 逐个保存
4. **外部文件变更** — 暂不处理（超出本次范围）
5. **pending 状态下切换标签** — cancel 当前 pending 再切换

## 依赖关系

```
EditorPanel
  ├─ ModelService (getModel, updateValue, isDirty, release, pendingClose...)
  ├─ EditorStore (tabs, activeTabId, openFile, requestCloseTab, forceCloseTab)
  ├─ BookStore (saveChapter, chapters)
  ├─ Monaco Editor (setModel, createModel, getModel, dispose)
  └─ ConfirmSaveDialog

EditorTabs
  └─ EditorStore (tabs, activeTabId, setActiveTab, requestCloseTab)

ModelService
  （纯内存操作，不依赖 BookStore 或文件系统）

ConfirmSaveDialog
  └─ @radix-ui/react-dialog
```

## 文件变更清单

| 操作 | 文件 |
|---|---|
| **新增** | `src/domain/types/model.ts` — TextModel 接口 |
| **新增** | `src/application/services/ModelService.ts` — Model 服务 |
| **重写** | `src/application/stores/editorStore.ts` — 简化为纯视图状态 |
| **修改** | `src/domain/types/layout.ts` — EditorTab 移除 content/isDirty |
| **修改** | `src/presentation/editor/EditorPanel.tsx` — 改用 ModelService + setModel |
| **修改** | `src/presentation/editor/tabs/EditorTabs.tsx` — isDirty 从 ModelService 读取 |
| **修改** | `src/presentation/editor/EditorStatusBar.tsx` — 字数从 Model 计算 |
| **修改** | `src/presentation/sidebar/ChapterTree.tsx` — openFile 适配新签名 |
| **修改** | `src/presentation/components/ConfirmSaveDialog.tsx` — 适配新 props（如有需要） |
| **移除** | `bookStore.chapterContent` — 不再需要全局单一内容字符串 |
| **更新** | `tests/stores/editorStore.test.ts` — 新 API |
| **新增** | `tests/services/ModelService.test.ts` — ModelService 测试 |
| **更新** | `tests/presentation/EditorStatusBar.test.tsx` — 适配新数据源 |
