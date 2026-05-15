import { useCallback, useEffect, useRef, useState } from 'react'
import { useModelService } from '../../application/services/ModelService'
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import type { FileEntry } from '../../domain/types/file'
import { AlertDialog } from './AlertDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { ContextMenu, type ContextMenuAction, type ContextMenuState } from './ContextMenu'
import { FileTreeNode } from './FileTreeNode'
import { InputDialog } from './InputDialog'
import { TwoFieldDialog } from './TwoFieldDialog'
import './FileExplorer.css'

interface DirCache {
  [dirPath: string]: FileEntry[]
}

/** 将路径统一为正斜杠，兼容 Windows 反斜杠，并去除尾部斜杠 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

function getParentDirName(filePath: string): string {
  const normalized = normalizePath(filePath).replace(/\/$/, '')
  const parts = normalized.split('/')
  return parts.length > 1 ? parts[parts.length - 2] : ''
}

function collectFilePaths(_dirPath: string, entries: FileEntry[], dirCache: DirCache): string[] {
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

async function hasMdFilesRecursive(
  _dirPath: string,
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

export function FileExplorer() {
  const currentBook = useBookStore((s) => s.currentBook)
  const updateBookMeta = useBookStore((s) => s.updateBookMeta)
  const fileExplorerRefreshKey = useBookStore((s) => s.fileExplorerRefreshKey)
  const openFile = useEditorStore((s) => s.openFile)
  const getFs = useCallback(() => useBookStore.getState()._fs, [])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set())
  const [dirCache, setDirCache] = useState<DirCache>({})
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [loading, setLoading] = useState(false)

  // 对话框状态
  const [inputDialogOpen, setInputDialogOpen] = useState(false)
  const [inputTitle, setInputTitle] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [inputPlaceholder, setInputPlaceholder] = useState('')
  const inputResolveRef = useRef<((value: string | null) => void) | null>(null)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmText, setConfirmText] = useState('确定')
  const [cancelText, setCancelText] = useState('取消')
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null)

  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const alertResolveRef = useRef<(() => void) | null>(null)

  const [twoFieldOpen, setTwoFieldOpen] = useState(false)
  const [twoFieldTitle, setTwoFieldTitle] = useState('')
  const [twoField1Label, setTwoField1Label] = useState('')
  const [twoField1Placeholder, setTwoField1Placeholder] = useState('')
  const [twoField1Default, setTwoField1Default] = useState('')
  const [twoField2Label, setTwoField2Label] = useState('')
  const [twoField2Placeholder, setTwoField2Placeholder] = useState('')
  const [twoField2Default, setTwoField2Default] = useState('')
  const twoFieldResolveRef = useRef<
    ((value: { field1: string; field2: string } | null) => void) | null
  >(null)

  const showTwoFieldDialog = useCallback(
    (opts: {
      title: string
      field1Label: string
      field1Placeholder?: string
      field1Default?: string
      field2Label: string
      field2Placeholder?: string
      field2Default?: string
    }): Promise<{ field1: string; field2: string } | null> => {
      return new Promise((resolve) => {
        setTwoFieldTitle(opts.title)
        setTwoField1Label(opts.field1Label)
        setTwoField1Placeholder(opts.field1Placeholder ?? '')
        setTwoField1Default(opts.field1Default ?? '')
        setTwoField2Label(opts.field2Label)
        setTwoField2Placeholder(opts.field2Placeholder ?? '')
        setTwoField2Default(opts.field2Default ?? '')
        setTwoFieldOpen(true)
        twoFieldResolveRef.current = resolve
      })
    },
    [],
  )

  const showInputDialog = useCallback(
    (title: string, message: string, placeholder?: string): Promise<string | null> => {
      return new Promise((resolve) => {
        setInputTitle(title)
        setInputMessage(message)
        setInputPlaceholder(placeholder ?? '')
        setInputDialogOpen(true)
        inputResolveRef.current = resolve
      })
    },
    [],
  )

  const showConfirmDialog = useCallback(
    (
      title: string,
      message: string,
      options?: { confirmText?: string; cancelText?: string },
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmTitle(title)
        setConfirmMessage(message)
        setConfirmText(options?.confirmText ?? '确定')
        setCancelText(options?.cancelText ?? '取消')
        setConfirmDialogOpen(true)
        confirmResolveRef.current = resolve
      })
    },
    [],
  )

  const showAlertDialog = useCallback((title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertTitle(title)
      setAlertMessage(message)
      setAlertDialogOpen(true)
      alertResolveRef.current = resolve
    })
  }, [])

  const rootPath = currentBook?.directory ? normalizePath(currentBook.directory) : null

  const loadDir = useCallback(
    async (dirPath: string) => {
      const fs = getFs()
      try {
        const entries = await fs.readDir(dirPath)
        // 规范化路径，确保 Windows 反斜杠统一为正斜杠
        const normalizedEntries = entries
          .map((e) => ({
            ...e,
            path: normalizePath(e.path),
          }))
          .sort((a, b) => {
            // 目录在前，文件在后；同级别按字母序排列
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
            return a.name.localeCompare(b.name)
          })
        const normalizedDir = normalizePath(dirPath)
        setDirCache((prev) => ({ ...prev, [normalizedDir]: normalizedEntries }))
        return normalizedEntries
      } catch {
        return [] as FileEntry[]
      }
    },
    [getFs],
  )

  // 加载根目录
  useEffect(() => {
    if (rootPath) {
      setLoading(true)
      setDirCache({})
      loadDir(rootPath).finally(() => setLoading(false))
    } else {
      setDirCache({})
    }
  }, [rootPath, loadDir])

  // 监听 fileExplorerRefreshKey 变化，刷新已展开的目录
  useEffect(() => {
    if (fileExplorerRefreshKey > 0 && rootPath) {
      // 刷新根目录
      loadDir(rootPath)
      // 刷新所有已展开的目录
      for (const dirPath of expandedDirs) {
        loadDir(dirPath)
      }
    }
  }, [fileExplorerRefreshKey, rootPath, loadDir, expandedDirs])

  const handleToggle = useCallback(
    async (entry: FileEntry) => {
      if (entry.isDir) {
        setExpandedDirs((prev) => {
          const next = new Set(prev)
          if (next.has(entry.path)) {
            next.delete(entry.path)
          } else {
            next.add(entry.path)
            // 懒加载子目录
            loadDir(entry.path)
          }
          return next
        })
      }
    },
    [loadDir],
  )

  const handleFileClick = useCallback(
    async (entry: FileEntry) => {
      if (entry.isDir) {
        await handleToggle(entry)
        return
      }
      try {
        const fs = getFs()
        const content = await fs.readFile(entry.path)
        openFile(entry.path, entry.name, content)
      } catch {
        console.warn('读取文件失败:', entry.path)
      }
    },
    [handleToggle, openFile, getFs],
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node: entry,
      parentName: getParentDirName(entry.path),
    })
  }, [])

  const handleBlankContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!rootPath) return
      // 仅在点击空白区域（非 FileTreeNode）时触发
      if ((e.target as HTMLElement).closest('.file-tree-node')) return
      e.preventDefault()
      e.stopPropagation()
      const rootName = rootPath.split('/').pop() || rootPath
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        node: { name: rootName, path: rootPath, isDir: true },
        parentName: '',
        isRoot: true,
      })
    },
    [rootPath],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const refreshDir = useCallback(
    async (dirPath: string) => {
      await loadDir(dirPath)
    },
    [loadDir],
  )

  const cleanupDeletedDir = useCallback((dirPath: string) => {
    // 从 expandedDirs 中移除
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      for (const path of next) {
        if (path === dirPath || path.startsWith(`${dirPath}/`) || path.startsWith(`${dirPath}\\`)) {
          next.delete(path)
        }
      }
      return next
    })

    // 从 dirCache 中移除
    setDirCache((prev) => {
      const next = { ...prev }
      for (const path of Object.keys(next)) {
        if (path === dirPath || path.startsWith(`${dirPath}/`) || path.startsWith(`${dirPath}\\`)) {
          delete next[path]
        }
      }
      return next
    })
  }, [])

  const handleAction = useCallback(
    async (action: ContextMenuAction, node: FileEntry) => {
      closeContextMenu()
      const fs = getFs()

      switch (action) {
        case 'new_dir': {
          const result = await showTwoFieldDialog({
            title: '新建目录',
            field1Label: '目录名称',
            field1Placeholder: '目录名',
            field2Label: '目录描述（选填）',
            field2Placeholder: '简要描述此目录的用途',
          })
          if (!result) return
          const { field1: name, field2: description } = result
          const parentPath = node.isDir
            ? node.path
            : node.path.substring(0, node.path.lastIndexOf('/'))
          // 同级同名校验
          const parentEntries = dirCache[parentPath] ?? (await loadDir(parentPath))
          if (parentEntries.some((e) => e.name === name)) {
            await showAlertDialog('提示', `目录 "${name}" 已存在`)
            return
          }
          await fs.createDir(`${parentPath}/${name}`)
          // 写入描述到 book.json
          if (description && currentBook) {
            const relPath = `${parentPath.replace(`${rootPath}/`, '')}/${name}/`
            const updatedBook = {
              ...currentBook,
              dirDescriptions: { ...currentBook.dirDescriptions, [relPath]: description },
            }
            await updateBookMeta(updatedBook)
          }
          await refreshDir(parentPath)
          break
        }
        case 'new_file': {
          const title = await showInputDialog('新建文件', '请输入文件名（不含扩展名）:', '文件名')
          if (!title) return
          const parentPath = node.isDir
            ? node.path
            : node.path.substring(0, node.path.lastIndexOf('/'))
          const fileName = `${title}.md`
          const parentEntries = dirCache[parentPath] ?? (await loadDir(parentPath))
          if (parentEntries.some((e) => e.name === fileName)) {
            await showAlertDialog('提示', `文件 "${fileName}" 已存在`)
            return
          }
          const filePath = `${parentPath}/${fileName}`
          await fs.writeFile(filePath, `# ${title}\n\n`)
          await refreshDir(parentPath)
          break
        }
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

          if (node.isDir) {
            // 清理目录及其子项的缓存
            cleanupDeletedDir(node.path)
          } else {
            // 关闭标签页
            const tab = useEditorStore.getState().tabs.find((t) => t.filePath === node.path)
            if (tab) {
              useEditorStore.getState().forceCloseTab(tab.id)
            }
          }

          // 刷新父目录
          const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
          await refreshDir(parentPath)
          break
        }
        case 'rename': {
          const oldName = node.name
          const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : ''
          const nameWithoutExt = ext ? oldName.substring(0, oldName.length - ext.length) : oldName

          if (node.isDir) {
            // 目录重命名：使用 TwoFieldDialog，支持修改描述
            const relPath = `${node.path.replace(`${rootPath}/`, '')}/`
            const currentDesc = currentBook?.dirDescriptions?.[relPath] ?? ''
            const result = await showTwoFieldDialog({
              title: '重命名目录',
              field1Label: '目录名称',
              field1Default: nameWithoutExt,
              field2Label: '目录描述',
              field2Placeholder: '简要描述此目录的用途',
              field2Default: currentDesc,
            })
            if (!result) return
            const { field1: newName, field2: description } = result
            if (newName === nameWithoutExt && description === currentDesc) return

            const parentDir = node.path.substring(0, node.path.lastIndexOf('/'))
            const newFullName = newName

            // 同级同名校验（仅在名称变更时）
            if (newName !== nameWithoutExt) {
              const parentEntries = dirCache[parentDir] ?? (await loadDir(parentDir))
              if (parentEntries.some((e) => e.name === newFullName && e.path !== node.path)) {
                await showAlertDialog('提示', `"${newFullName}" 已存在`)
                return
              }
              // 目录重命名暂不支持
              await showAlertDialog('提示', '目录重命名暂不支持，仅允许修改描述')
              return
            }

            // 名称未变，仅更新描述
            if (currentBook) {
              const newRelPath = `${parentDir.replace(`${rootPath}/`, '')}/${newFullName}/`
              const newDescriptions = { ...currentBook.dirDescriptions }
              delete newDescriptions[relPath]
              if (description) {
                newDescriptions[newRelPath] = description
              }
              const updatedBook = { ...currentBook, dirDescriptions: newDescriptions }
              await updateBookMeta(updatedBook)
            }
            return
          }

          // 文件重命名
          const newName = await showInputDialog('重命名', `请输入新名称:`, nameWithoutExt)
          if (!newName || newName === nameWithoutExt) return
          const parentDir = node.path.substring(0, node.path.lastIndexOf('/'))
          const newFullName = `${newName}${ext}`
          const newPath = `${parentDir}/${newFullName}`

          // 同级同名校验
          const parentEntries = dirCache[parentDir] ?? (await loadDir(parentDir))
          if (parentEntries.some((e) => e.name === newFullName && e.path !== node.path)) {
            await showAlertDialog('提示', `"${newFullName}" 已存在`)
            return
          }

          // 检查未保存修改
          const ms = useModelService.getState()
          if (ms.isDirty(node.path)) {
            await showAlertDialog('提示', '文件有未保存的修改，请先保存后再重命名')
            return
          }

          const content = await fs.readFile(node.path)
          await fs.writeFile(newPath, content)
          await fs.remove(node.path)

          // 关闭旧标签页，打开新文件
          const tab = useEditorStore.getState().tabs.find((t) => t.filePath === node.path)
          if (tab) {
            useEditorStore.getState().forceCloseTab(tab.id)
            openFile(newPath, newFullName, content)
          }

          await refreshDir(parentDir)
          break
        }
        case 'new_volume': {
          const result = await showTwoFieldDialog({
            title: '新增卷',
            field1Label: '卷名',
            field1Placeholder: '卷名',
            field2Label: '卷描述（选填）',
            field2Placeholder: '简要描述此卷的内容',
          })
          if (!result) return
          const { field1: name, field2: description } = result
          const chaptersDir = node.path
          const entries = dirCache[chaptersDir] ?? (await loadDir(chaptersDir))
          const existingVolumes = entries.filter((e) => e.isDir && /^\d{2}_/.test(e.name))
          const maxNum =
            existingVolumes.length > 0
              ? Math.max(...existingVolumes.map((v) => Number.parseInt(v.name.substring(0, 2), 10)))
              : 0
          const nextNum = String(maxNum + 1).padStart(2, '0')
          const volDirName = `${nextNum}_${name}`
          const volDir = `${chaptersDir}/${volDirName}`
          await fs.createDir(volDir)
          // 写入描述到 book.json
          if (description && currentBook) {
            const relPath = `${chaptersDir.replace(`${rootPath}/`, '')}/${volDirName}/`
            const updatedBook = {
              ...currentBook,
              dirDescriptions: { ...currentBook.dirDescriptions, [relPath]: description },
            }
            await updateBookMeta(updatedBook)
          }
          await refreshDir(chaptersDir)
          break
        }
        case 'new_chapter': {
          const title = await showInputDialog('新增章节', '请输入章节标题:', '章节标题')
          if (!title) return
          const parentDir = node.isDir
            ? node.path
            : node.path.substring(0, node.path.lastIndexOf('/'))
          const entries = dirCache[parentDir] ?? (await loadDir(parentDir))
          const existingChapters = entries.filter((e) => !e.isDir && /^\d{2}-.+\.md$/.test(e.name))
          const maxNum =
            existingChapters.length > 0
              ? Math.max(
                  ...existingChapters.map((c) => Number.parseInt(c.name.substring(0, 2), 10)),
                )
              : 0
          const nextNum = String(maxNum + 1).padStart(2, '0')
          const fileName = `${nextNum}-${title}.md`
          const filePath = `${parentDir}/${fileName}`
          await fs.writeFile(filePath, `# ${title}\n\n`)
          await refreshDir(parentDir)
          break
        }
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
          const dirtyFiles = filePaths.filter((p) => ms.isDirty(p))
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
          const tabsToClose = editorStore.tabs.filter(
            (t) =>
              t.filePath.startsWith(`${node.path}/`) || t.filePath.startsWith(`${node.path}\\`),
          )
          tabsToClose.forEach((tab) => editorStore.forceCloseTab(tab.id))

          // 清理缓存并刷新
          cleanupDeletedDir(node.path)
          const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
          await refreshDir(parentPath)
          break
        }
      }
    },
    [
      closeContextMenu,
      dirCache,
      loadDir,
      refreshDir,
      cleanupDeletedDir,
      showInputDialog,
      showTwoFieldDialog,
      showConfirmDialog,
      showAlertDialog,
      getFs,
      openFile,
      currentBook,
      updateBookMeta,
      rootPath,
    ],
  )

  // 点击其他地方关闭上下文菜单
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => closeContextMenu()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu, closeContextMenu])

  if (!rootPath) {
    return <div className="file-explorer-empty">未打开书籍</div>
  }

  const rootEntries = dirCache[rootPath] ?? []
  if (loading) {
    return <div className="file-explorer-loading">加载中...</div>
  }

  return (
    <div className="file-explorer" onContextMenu={handleBlankContextMenu}>
      {rootEntries.length === 0 ? (
        <div className="file-explorer-empty">目录为空</div>
      ) : (
        rootEntries
          .filter((e) => e.name !== 'book.json')
          .map((entry) => (
            <FileTreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              dirCache={dirCache}
              expandedDirs={expandedDirs}
              onToggle={handleToggle}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              onCloseContextMenu={closeContextMenu}
              loadDir={loadDir}
            />
          ))
      )}
      {contextMenu && (
        <ContextMenu state={contextMenu} onAction={handleAction} onClose={closeContextMenu} />
      )}
      <InputDialog
        open={inputDialogOpen}
        title={inputTitle}
        message={inputMessage}
        placeholder={inputPlaceholder}
        onConfirm={(value) => {
          setInputDialogOpen(false)
          inputResolveRef.current?.(value)
          inputResolveRef.current = null
        }}
        onCancel={() => {
          setInputDialogOpen(false)
          inputResolveRef.current?.(null)
          inputResolveRef.current = null
        }}
      />
      <TwoFieldDialog
        open={twoFieldOpen}
        title={twoFieldTitle}
        field1Label={twoField1Label}
        field1Placeholder={twoField1Placeholder}
        field1Default={twoField1Default}
        field2Label={twoField2Label}
        field2Placeholder={twoField2Placeholder}
        field2Default={twoField2Default}
        onConfirm={(field1, field2) => {
          setTwoFieldOpen(false)
          twoFieldResolveRef.current?.({ field1, field2 })
          twoFieldResolveRef.current = null
        }}
        onCancel={() => {
          setTwoFieldOpen(false)
          twoFieldResolveRef.current?.(null)
          twoFieldResolveRef.current = null
        }}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={() => {
          setConfirmDialogOpen(false)
          confirmResolveRef.current?.(true)
          confirmResolveRef.current = null
        }}
        onCancel={() => {
          setConfirmDialogOpen(false)
          confirmResolveRef.current?.(false)
          confirmResolveRef.current = null
        }}
      />
      <AlertDialog
        open={alertDialogOpen}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertDialogOpen(false)
          alertResolveRef.current?.()
          alertResolveRef.current = null
        }}
      />
    </div>
  )
}
