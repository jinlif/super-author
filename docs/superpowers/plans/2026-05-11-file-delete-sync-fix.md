# 文件删除同步修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复文件删除后目录树和编辑器标签页不同步的问题

**Architecture:** 在 FileExplorer 的 handleAction 中直接调用 editorStore 和 modelService，删除前检查未保存状态，删除后关闭标签页并清理缓存

**Tech Stack:** React, Zustand, TypeScript

---

## 文件结构

- Modify: `src/presentation/fileExplorer/FileExplorer.tsx` — 添加删除同步逻辑
- Test: `tests/presentation/FileExplorer.test.tsx` — 添加删除相关测试

---

### Task 1: 添加辅助函数

**Files:**
- Modify: `src/presentation/fileExplorer/FileExplorer.tsx`

- [ ] **Step 1: 添加 collectFilePaths 函数**

在 `getParentDirName` 函数后添加：

```typescript
function collectFilePaths(dirPath: string, entries: FileEntry[], dirCache: DirCache): string[] {
  const paths: string[] = []
  for (const entry of entries) {
    if (entry.isDir) {
      const subEntries = dirCache[entry.path]
      if (subEntries) {
        paths.push(...collectFilePaths(entry.path, subEntries, dirCache))
      }
    } else {
      paths.push(entry.path)
    }
  }
  return paths
}
```

- [ ] **Step 2: 添加 hasMdFilesRecursive 函数**

在 `collectFilePaths` 函数后添加：

```typescript
async function hasMdFilesRecursive(
  dirPath: string,
  entries: FileEntry[],
  loadDir: (path: string) => Promise<FileEntry[]>,
  dirCache: DirCache,
): Promise<boolean> {
  for (const entry of entries) {
    if (!entry.isDir && entry.name.endsWith('.md')) {
      return true
    }
    if (entry.isDir) {
      const subEntries = dirCache[entry.path] ?? (await loadDir(entry.path))
      if (await hasMdFilesRecursive(entry.path, subEntries, loadDir, dirCache)) {
        return true
      }
    }
  }
  return false
}
```

- [ ] **Step 3: 添加 cleanupDeletedDir 函数**

在 `FileExplorer` 组件内，`refreshDir` 函数后添加：

```typescript
const cleanupDeletedDir = useCallback(
  (dirPath: string) => {
    // 从 expandedDirs 中移除
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      for (const path of next) {
        if (path === dirPath || path.startsWith(dirPath + '/') || path.startsWith(dirPath + '\\')) {
          next.delete(path)
        }
      }
      return next
    })

    // 从 dirCache 中移除
    setDirCache((prev) => {
      const next = { ...prev }
      for (const path of Object.keys(next)) {
        if (path === dirPath || path.startsWith(dirPath + '/') || path.startsWith(dirPath + '\\')) {
          delete next[path]
        }
      }
      return next
    })
  },
  [],
)
```

- [ ] **Step 4: 运行类型检查**

Run: `npm run build`
Expected: 无类型错误

- [ ] **Step 5: 提交**

```bash
git add src/presentation/fileExplorer/FileExplorer.tsx
git commit -m "feat: 添加删除同步辅助函数"
```

---

### Task 2: 修改删除文件逻辑

**Files:**
- Modify: `src/presentation/fileExplorer/FileExplorer.tsx:208-216`

- [ ] **Step 1: 导入 editorStore 和 modelService**

在文件顶部添加导入：

```typescript
import { useEditorStore } from '../../application/stores/editorStore'
import { useModelService } from '../../application/stores/modelService'
```

- [ ] **Step 2: 修改 delete case**

将现有的 `delete` case（第 208-216 行）替换为：

```typescript
case 'delete': {
  const name = node.isDir ? `目录 "${node.name}"` : `文件 "${node.name}"`
  const ok = await showConfirmDialog('确认删除', `确定删除${name}吗？此操作不可撤销。`)
  if (!ok) return

  // 检查是否有未保存修改
  const ms = useModelService.getState()
  if (!node.isDir && ms.isDirty(node.path)) {
    await showAlertDialog('提示', '文件有未保存的修改，请先保存后再删除')
    return
  }

  // 执行删除
  await fs.remove(node.path)

  // 关闭标签页
  if (!node.isDir) {
    const tab = useEditorStore.getState().tabs.find(t => t.filePath === node.path)
    if (tab) {
      useEditorStore.getState().forceCloseTab(tab.id)
    }
  }

  // 清理缓存并刷新
  const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
  await refreshDir(parentPath)
  break
}
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run build`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/presentation/fileExplorer/FileExplorer.tsx
git commit -m "feat: 删除文件时关闭标签页并检查未保存修改"
```

---

### Task 3: 修改删除卷逻辑

**Files:**
- Modify: `src/presentation/fileExplorer/FileExplorer.tsx:256-269`

- [ ] **Step 1: 修改 delete_volume case**

将现有的 `delete_volume` case（第 256-269 行）替换为：

```typescript
case 'delete_volume': {
  const entries = dirCache[node.path] ?? (await loadDir(node.path))

  // 检查是否有章节
  const hasChapters = await hasMdFilesRecursive(node.path, entries, loadDir, dirCache)
  if (hasChapters) {
    await showAlertDialog('提示', '卷内存在章节，请先删除章节后再删除卷')
    return
  }

  // 检查未保存修改
  const filePaths = collectFilePaths(node.path, entries, dirCache)
  const ms = useModelService.getState()
  const dirtyFiles = filePaths.filter(p => ms.isDirty(p))
  if (dirtyFiles.length > 0) {
    await showAlertDialog('提示', '卷内有未保存的文件，请先保存后再删除')
    return
  }

  // 确认删除
  const chapterNames = entries
    .filter((e) => !e.isDir && e.name.endsWith('.md'))
    .map((e) => `  - ${e.name}`)
    .join('\n')
  const msg = `确定删除卷 "${node.name}" 吗？\n卷内包含以下文件：\n${chapterNames || '  (空卷)'}\n\n此操作不可撤销。`
  const ok = await showConfirmDialog('删除卷', msg)
  if (!ok) return

  // 执行删除
  await fs.remove(node.path)

  // 关闭相关标签页
  const editorStore = useEditorStore.getState()
  const tabsToClose = editorStore.tabs.filter(t =>
    t.filePath.startsWith(node.path + '/') || t.filePath.startsWith(node.path + '\\')
  )
  tabsToClose.forEach(tab => editorStore.forceCloseTab(tab.id))

  // 清理缓存并刷新
  cleanupDeletedDir(node.path)
  const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
  await refreshDir(parentPath)
  break
}
```

- [ ] **Step 2: 更新 handleAction 依赖数组**

将 `handleAction` 的依赖数组更新为：

```typescript
[closeContextMenu, dirCache, loadDir, refreshDir, cleanupDeletedDir, showInputDialog, showConfirmDialog, showAlertDialog]
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run build`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/presentation/fileExplorer/FileExplorer.tsx
git commit -m "feat: 删除卷时检查章节、未保存修改，并清理缓存"
```

---

### Task 4: 添加测试

**Files:**
- Modify: `tests/presentation/FileExplorer.test.tsx`

- [ ] **Step 1: 添加删除文件测试**

在测试文件中添加：

```typescript
describe('文件删除同步', () => {
  it('删除已打开的文件时应关闭标签页', async () => {
    // 测试实现
  })

  it('删除有未保存修改的文件时应阻止删除', async () => {
    // 测试实现
  })
})
```

- [ ] **Step 2: 添加删除卷测试**

```typescript
describe('删除卷同步', () => {
  it('删除包含章节的卷时应阻止删除', async () => {
    // 测试实现
  })

  it('删除卷后应清理缓存', async () => {
    // 测试实现
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add tests/presentation/FileExplorer.test.tsx
git commit -m "test: 添加删除文件和卷的同步测试"
```

---

### Task 5: 更新 bug.md

**Files:**
- Modify: `bug.md`

- [ ] **Step 1: 标记 bug 已修复**

将 `bug.md` 中的复选框标记为已完成：

```markdown
- [x] openspec file-explorer-and-data-restructure 引入，删除卷或者md文件，目录树没同步更改，同时如果删除了正在打开的md，对应窗口需要关闭
```

- [ ] **Step 2: 提交**

```bash
git add bug.md
git commit -m "docs: 标记文件删除同步 bug 已修复"
```
