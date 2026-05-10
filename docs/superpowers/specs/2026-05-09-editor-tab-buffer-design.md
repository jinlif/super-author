# 编辑器标签页内容缓冲设计

## 问题

1. **关闭脏标签无提示** — 当前 `closeTab` 直接删除标签，不检查 `isDirty`，用户可能丢失未保存的编辑
2. **标签页内容缓冲共享** — `bookStore.chapterContent` 是全局单一字符串，所有标签页共享同一份内容。关闭标签页再重新打开，显示的是未保存的内存版本，而非磁盘上的已保存版本

## 解决方案

采用方案 B：**editorStore 中增加 per-tab 内容缓冲**。

每个标签页持有一个独立的 `content` 字符串作为编辑缓冲，标签页的生命周期 = 缓冲的生命周期。关闭标签页时丢弃缓冲，重新打开时从磁盘读取新副本。

## 数据模型变更

### `EditorTab` 增加 `content` 字段 (`src/domain/types/layout.ts`)

```typescript
export interface EditorTab {
  id: string
  filePath: string
  fileName: string
  isDirty: boolean
  content: string   // 新增：标签页持有的内容缓冲
}
```

## editorStore 重构 (`src/application/stores/editorStore.ts`)

### 新增状态

| 字段 | 类型 | 说明 |
|------|------|------|
| `pendingCloseTabId` | `string \| null` | 待关闭的脏标签 ID，非 null 时触发对话框 |
| `pendingCloseTabFileName` | `string` | 待关闭标签的文件名，对话框显示用 |

### 新增/变更方法

| 方法 | 说明 |
|------|------|
| `openFile(filePath, fileName, content)` | 参数增加 `content`，创建标签时直接存入缓冲 |
| `updateTabContent(tabId, content)` | 编辑时更新标签的 content，自动设 `isDirty=true` |
| `requestCloseTab(tabId)` | **替代原来的 `closeTab`**。检查 `isDirty`：脏则设 pending 状态等待用户确认；干净则直接关闭 |
| `forceCloseTab(tabId)` | 确认后无检查强制关闭（用户已通过对话框做出选择） |
| `cancelCloseTab()` | 取消关闭，清空 pending 状态 |
| `closeTab(tabId)` | **移除** — 不再对外暴露，内部由 `forceCloseTab` / `requestCloseTab` 使用 |

### 关闭流程

```
用户点击关闭按钮
    │
    ▼
requestCloseTab(tabId)
    │
    ├── tab.isDirty === false ──→ 直接关闭（forceCloseTab）
    │
    └── tab.isDirty === true ──→ 设置 pendingCloseTabId
                                      │
                                      ▼
                               ConfirmSaveDialog 显示
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
                保存              不保存             取消
                    │                 │                 │
                    ▼                 ▼                 ▼
             写磁盘 +         forceCloseTab       cancelCloseTab
             forceCloseTab    （丢弃缓冲）         （什么都不做）
```

## 新增 ConfirmSaveDialog (`src/presentation/components/ConfirmSaveDialog.tsx`)

使用项目中已有的 `@radix-ui/react-dialog`，保持 UI 风格一致。

- 标题：「未保存的更改」
- 描述：「"xxx.md" 有未保存的更改，要保存吗？」
- 三个按钮：保存（primary）、不保存、取消

Props:
```typescript
interface ConfirmSaveDialogProps {
  open: boolean
  fileName: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}
```

## EditorPanel 重构 (`src/presentation/editor/EditorPanel.tsx`)

### 变更点

1. **编辑器 value 来源**：从 `bookStore.chapterContent` 改为 `activeTab?.content`
2. **编辑 onChange**：调用 `editorStore.updateTabContent(tabId, value)` 更新缓冲
3. **保存逻辑**：
   - 从 `activeTab.content` 获取内容写磁盘
   - 写磁盘后调用 `editorStore.markClean(tabId)`
4. **标签切换**：
   - 移除对 `loadChapter` 的依赖
   - 通过 `key={activeTabId}` 让 Monaco Editor 重新挂载（确保编辑器状态干净）
5. **关闭确认**：
   - 监听 `pendingCloseTabId`，渲染 `ConfirmSaveDialog`
   - 对话框回调处理对应的保存/不保存/取消逻辑
6. **移除**：
   - `contentRef` — 不再需要，内容在 tab.content 中
   - `chapterContent` 相关逻辑 — 不再从 bookStore 同步
   - `loadChapter` 调用 — 不再在标签切换时重新读盘

### 需要保留的

- 自动保存定时器（5 秒防抖）— 仍需要
- Ctrl+S 快捷键 — 仍需要
- 组件卸载时保存 — 仍需要
- EditorStatusBar 字数统计 — 改为从 `activeTab.content` 计算

## EditorTabs 重构 (`src/presentation/editor/tabs/EditorTabs.tsx`)

- `closeTab(tab.id)` → `requestCloseTab(tab.id)`

## 依赖关系

```
EditorTabs
  └─ editorStore.requestCloseTab()
      
EditorPanel
  ├─ editorStore (updateTabContent, requestCloseTab, forceCloseTab, pendingCloseTabId, ...)
  ├─ bookStore (saveChapter)
  └─ ConfirmSaveDialog
      
ConfirmSaveDialog
  └─ @radix-ui/react-dialog
```

## 边界情况

1. **多个脏标签连续关闭** — 每次只处理一个 pending 请求，关闭/取消后才允许下一个
2. **组件卸载时保存** — 取 activeTab.content 写磁盘，不再依赖 contentRef
3. **外部文件变更** — 暂不处理（超出本次范围）
4. **pending 状态下切换标签** — cancel 当前 pending 再处理标签切换
