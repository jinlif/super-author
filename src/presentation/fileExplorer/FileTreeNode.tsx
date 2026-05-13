import { useCallback } from 'react'
import type { FileEntry } from '../../domain/types/file'
import { getSystemDirColor, getSystemDirIcon } from './systemDirs'

interface DirCache {
  [dirPath: string]: FileEntry[]
}

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  dirCache: DirCache
  expandedDirs: Set<string>
  onToggle: (entry: FileEntry) => void
  onFileClick: (entry: FileEntry) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  onCloseContextMenu: () => void
  loadDir: (dirPath: string) => Promise<FileEntry[]>
}

export function FileTreeNode({
  entry,
  depth,
  dirCache,
  expandedDirs,
  onToggle,
  onFileClick,
  onContextMenu,
  onCloseContextMenu,
  loadDir,
}: FileTreeNodeProps) {
  const isExpanded = entry.isDir && expandedDirs.has(entry.path)
  const children = entry.isDir ? dirCache[entry.path] : undefined
  const color = getSystemDirColor(entry.name)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onCloseContextMenu()
      onFileClick(entry)
    },
    [entry, onFileClick, onCloseContextMenu],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      onContextMenu(e, entry)
    },
    [entry, onContextMenu],
  )

  const handleToggleChildren = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onCloseContextMenu()
      if (entry.isDir) {
        // 如果展开时需要懒加载子目录
        if (!isExpanded && !children) {
          loadDir(entry.path)
        }
        onToggle(entry)
      }
    },
    [entry, isExpanded, children, loadDir, onToggle, onCloseContextMenu],
  )

  return (
    <>
      <div
        className="file-tree-node"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {entry.isDir ? (
          <span
            className={`file-tree-node-chevron ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggleChildren}
          >
            ▶
          </span>
        ) : (
          <span className="file-tree-node-chevron" />
        )}
        <span className="file-tree-node-icon" style={color ? { color } : undefined}>
          {getSystemDirIcon(entry.name, entry.isDir)}
        </span>
        <span className="file-tree-node-name" style={color ? { color } : undefined}>
          {entry.name}
        </span>
      </div>
      {entry.isDir &&
        isExpanded &&
        children &&
        (children.length === 0 ? (
          <div
            className="file-tree-node"
            style={{
              paddingLeft: `${8 + (depth + 1) * 16}px`,
              color: '#858585',
              fontStyle: 'italic',
              cursor: 'default',
            }}
          >
            (空目录)
          </div>
        ) : (
          children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              dirCache={dirCache}
              expandedDirs={expandedDirs}
              onToggle={onToggle}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              onCloseContextMenu={onCloseContextMenu}
              loadDir={loadDir}
            />
          ))
        ))}
    </>
  )
}
