import { useEffect, useRef } from 'react'
import type { FileEntry } from '../../domain/types/file'
import { isSystemDir } from './systemDirs'

export type ContextMenuAction =
  | 'new_dir'
  | 'new_file'
  | 'delete'
  | 'rename'
  | 'new_volume'
  | 'new_chapter'
  | 'delete_volume'

export interface ContextMenuState {
  x: number
  y: number
  node: FileEntry
  parentName: string
  isRoot?: boolean
}

/** 受保护的目录名（不可删除/重命名，但可在其中创建内容） */
const PROTECTED_DIR_NAMES = ['commands', 'skills']

/** 检查是否为 .super-author 下的受保护目录 */
function isProtectedDir(node: FileEntry): boolean {
  if (!node.isDir) return false
  const normalized = node.path.replace(/\\/g, '/')
  return normalized.includes('.super-author/') && PROTECTED_DIR_NAMES.includes(node.name)
}

interface ContextMenuProps {
  state: ContextMenuState
  onAction: (action: ContextMenuAction, node: FileEntry) => void
  onClose: () => void
}

interface MenuItem {
  action: ContextMenuAction
  label: string
}

/** 根据节点类型获取可用的操作列表 */
function getNodeActions(node: FileEntry, parentName: string, isRoot?: boolean): MenuItem[] {
  // 根节点（空白区域点击）只显示新建选项
  if (isRoot) {
    return [
      { action: 'new_dir', label: '新建目录' },
      { action: 'new_file', label: '新建 .md 文件' },
    ]
  }

  // 不可删除/重命名的项：book.json、.super-author 目录、.super-author 下的受保护目录
  if (node.name === 'book.json' || node.name === '.super-author' || isProtectedDir(node)) {
    return [
      { action: 'new_dir', label: '新建目录' },
      { action: 'new_file', label: '新建 .md 文件' },
    ]
  }

  if (node.isDir) {
    if (node.name === 'chapters') {
      return [
        { action: 'new_volume', label: '新增卷' },
        { action: 'new_chapter', label: '新增章节' },
      ]
    }
    if (parentName === 'chapters') {
      return [
        { action: 'new_chapter', label: '新增章节' },
        { action: 'delete_volume', label: '删除卷' },
      ]
    }
    if (isSystemDir(node.name)) {
      return [
        { action: 'new_dir', label: '新建目录' },
        { action: 'new_file', label: '新建 .md 文件' },
      ]
    }
    return [
      { action: 'new_dir', label: '新建目录' },
      { action: 'new_file', label: '新建 .md 文件' },
      { action: 'rename', label: '重命名' },
      { action: 'delete', label: '删除' },
    ]
  }

  return [
    { action: 'rename', label: '重命名' },
    { action: 'delete', label: '删除' },
  ]
}

export function ContextMenu({ state, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { node, parentName, isRoot } = state
  const items = getNodeActions(node, parentName, isRoot)

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (items.length === 0) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="file-context-menu"
      style={{ left: state.x, top: state.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <div
          key={item.action}
          className="file-context-menu-item"
          onClick={() => onAction(item.action, node)}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}
