import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileEntry } from '../../domain/types/file'
import { useBookStore } from '../../application/stores/bookStore'
import { useEditorStore } from '../../application/stores/editorStore'
import { FileTreeNode } from './FileTreeNode'
import { ContextMenu, type ContextMenuAction, type ContextMenuState } from './ContextMenu'
import { InputDialog } from './InputDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { AlertDialog } from './AlertDialog'
import './FileExplorer.css'

interface DirCache {
  [dirPath: string]: FileEntry[]
}

function getParentDirName(filePath: string): string {
  // 统一为正斜杠处理，兼容 Windows 反斜杠路径
  const normalized = filePath.replace(/\\/g, '/').replace(/\/$/, '')
  const parts = normalized.split('/')
  return parts.length > 1 ? parts[parts.length - 2] : ''
}

// @ts-ignore - 将在后续任务中使用
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

// @ts-ignore - 将在后续任务中使用
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
    (title: string, message: string, options?: { confirmText?: string; cancelText?: string }): Promise<boolean> => {
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

  const showAlertDialog = useCallback(
    (title: string, message: string): Promise<void> => {
      return new Promise((resolve) => {
        setAlertTitle(title)
        setAlertMessage(message)
        setAlertDialogOpen(true)
        alertResolveRef.current = resolve
      })
    },
    [],
  )

  const rootPath = currentBook?.directory ?? null

  const loadDir = useCallback(
    async (dirPath: string) => {
      const fs = getFs()
      try {
        const entries = await fs.readDir(dirPath)
        setDirCache((prev) => ({ ...prev, [dirPath]: entries }))
        return entries
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
    [handleToggle, openFile],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, entry: FileEntry) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY, node: entry, parentName: getParentDirName(entry.path) })
    },
    [],
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

  const handleAction = useCallback(
    async (action: ContextMenuAction, node: FileEntry) => {
      closeContextMenu()
      const fs = getFs()

      switch (action) {
        case 'new_dir': {
          const name = await showInputDialog('新建目录', '请输入目录名称:', '目录名')
          if (!name) return
          const parentPath = node.isDir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'))
          // 同级同名校验
          const parentEntries = dirCache[parentPath] ?? (await loadDir(parentPath))
          if (parentEntries.some((e) => e.name === name)) {
            await showAlertDialog('提示', `目录 "${name}" 已存在`)
            return
          }
          await fs.createDir(`${parentPath}/${name}`)
          await refreshDir(parentPath)
          break
        }
        case 'new_file': {
          const title = await showInputDialog('新建文件', '请输入文件名（不含扩展名）:', '文件名')
          if (!title) return
          const parentPath = node.isDir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'))
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
          await fs.remove(node.path)
          const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
          await refreshDir(parentPath)
          break
        }
        case 'new_volume': {
          const name = await showInputDialog('新增卷', '请输入卷名:', '卷名')
          if (!name) return
          const chaptersDir = node.path
          const entries = dirCache[chaptersDir] ?? (await loadDir(chaptersDir))
          const existingVolumes = entries.filter(
            (e) => e.isDir && /^\d{2}_/.test(e.name),
          )
          const maxNum = existingVolumes.length > 0
            ? Math.max(
                ...existingVolumes.map((v) => Number.parseInt(v.name.substring(0, 2), 10)),
              )
            : 0
          const nextNum = String(maxNum + 1).padStart(2, '0')
          const volDir = `${chaptersDir}/${nextNum}_${name}`
          await fs.createDir(volDir)
          await refreshDir(chaptersDir)
          break
        }
        case 'new_chapter': {
          const title = await showInputDialog('新增章节', '请输入章节标题:', '章节标题')
          if (!title) return
          const parentDir = node.isDir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'))
          const entries = dirCache[parentDir] ?? (await loadDir(parentDir))
          const existingChapters = entries.filter(
            (e) => !e.isDir && /^\d{2}-.+\.md$/.test(e.name),
          )
          const maxNum = existingChapters.length > 0
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
          const chapterNames = entries
            .filter((e) => !e.isDir && e.name.endsWith('.md'))
            .map((e) => `  - ${e.name}`)
            .join('\n')
          const msg = `确定删除卷 "${node.name}" 吗？\n卷内包含以下文件：\n${chapterNames || '  (空卷)'}\n\n此操作不可撤销。`
          const ok = await showConfirmDialog('删除卷', msg)
          if (!ok) return
          await fs.remove(node.path)
          const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
          await refreshDir(parentPath)
          break
        }
      }
    },
    [closeContextMenu, dirCache, loadDir, refreshDir, cleanupDeletedDir, showInputDialog, showConfirmDialog, showAlertDialog],
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
    <div className="file-explorer">
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
              loadDir={loadDir}
            />
          ))
      )}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onAction={handleAction}
          onClose={closeContextMenu}
        />
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
