# 文件删除同步修复设计

## 背景

当前 `FileExplorer` 组件中删除文件或卷后，存在以下问题：
1. 删除的文件仍然在编辑器中显示
2. 如果删除的是卷，卷内所有打开的文件都不会关闭
3. 目录树没有响应式更新（`dirCache` 和 `expandedDirs` 未清理）

## 设计目标

1. 删除文件时，关闭对应的编辑器标签页
2. 删除卷时，先检查是否包含章节，如果有则阻止删除
3. 如果目标文件有未保存修改，阻止删除并提示用户
4. 删除后清理 `dirCache` 和 `expandedDirs`，确保目录树正确更新

## 方案

在 `FileExplorer.tsx` 的 `handleAction` 中直接调用 `editorStore` 和 `modelService`。

### 删除文件流程

```
1. 检查文件是否有未保存修改（modelService.isDirty）
   → 如果有，弹出提示"文件有未保存的修改，请先保存后再删除"，阻止删除
2. 调用 fs.remove 删除文件
3. 关闭对应的编辑器标签页（editorStore.forceCloseTab）
4. 从 dirCache 中移除文件所在目录的缓存
5. 刷新父目录（refreshDir）
```

### 删除卷流程

```
1. 加载卷内文件列表
2. 递归检查卷内是否有章节文件（.md 文件）
   → 如果有，弹出提示"卷内存在章节，请先删除章节后再删除卷"，阻止删除
3. 检查卷内所有文件是否有未保存修改
   → 如果有，弹出提示"卷内有未保存的文件，请先保存后再删除"，阻止删除
4. 调用 fs.remove 删除卷目录
5. 关闭卷内所有打开的标签页
6. 从 expandedDirs 中移除卷目录及其子目录
7. 从 dirCache 中移除卷目录及其子目录的缓存
8. 刷新父目录
```

## 修改文件

- `src/presentation/fileExplorer/FileExplorer.tsx` — 修改 `handleAction` 函数

## 辅助函数

### collectFilePaths

递归收集目录下所有文件路径：

```typescript
function collectFilePaths(dirPath: string, entries: FileEntry[]): string[] {
  const paths: string[] = []
  for (const entry of entries) {
    if (entry.isDir) {
      const subEntries = dirCache[entry.path]
      if (subEntries) {
        paths.push(...collectFilePaths(entry.path, subEntries))
      }
    } else {
      paths.push(entry.path)
    }
  }
  return paths
}
```

### hasMdFilesRecursive

递归检查目录下是否有 .md 文件：

```typescript
async function hasMdFilesRecursive(
  dirPath: string,
  entries: FileEntry[],
  loadDir: (path: string) => Promise<FileEntry[]>,
  dirCache: Record<string, FileEntry[]>
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

### cleanupDeletedDir

清理已删除目录的状态：

```typescript
function cleanupDeletedDir(dirPath: string) {
  // 从 expandedDirs 中移除
  setExpandedDirs((prev) => {
    const next = new Set(prev)
    // 移除目录本身及其所有子目录
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
}
```

## 测试策略

1. **删除文件测试**
   - 删除未打开的文件 → 成功删除
   - 删除已打开的文件 → 标签页关闭
   - 删除有未保存修改的文件 → 阻止删除，弹出提示

2. **删除卷测试**
   - 删除空卷 → 成功删除
   - 删除包含章节的卷 → 阻止删除，弹出提示
   - 删除卷内文件有未保存修改 → 阻止删除，弹出提示

3. **目录树同步测试**
   - 删除文件后 → 目录树立即更新
   - 删除卷后 → 目录树立即更新
   - 删除展开的卷后 → expandedDirs 和 dirCache 被清理
