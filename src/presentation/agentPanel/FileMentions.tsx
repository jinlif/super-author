import { Folder, File } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileMentionService } from '../../application/services/FileMentionService'
import type { FileMentionItem } from '../../application/services/FileMentionService'
import type { FileType } from '../../domain/types/fileMention'
import './FileMentions.css'

const TYPE_LABELS: Record<FileType, string> = {
  chapter: '章节',
  character: '角色',
  outline: '大纲',
  setting: '设定',
  other: '其他',
}

const TYPE_ORDER: FileType[] = ['chapter', 'character', 'outline', 'setting', 'other']

interface FileMentionsProps {
  query: string
  visible: boolean
  onSelect: (item: FileMentionItem) => void
  onClose: () => void
}

export function FileMentions({
  query,
  visible,
  onSelect,
  onClose,
}: FileMentionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [browsePath, setBrowsePath] = useState('')
  const [browseItems, setBrowseItems] = useState<FileMentionItem[]>([])
  const [searchFiles, setSearchFiles] = useState<FileMentionItem[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const isSearchMode = query.trim().length > 0
  const currentItems = isSearchMode ? searchFiles : browseItems

  // 重置状态
  useEffect(() => {
    if (!visible) {
      setBrowsePath('')
      setBrowseItems([])
      setSearchFiles([])
    }
  }, [visible])

  // 搜索模式：根据 query 搜索
  useEffect(() => {
    if (!visible) return
    if (!isSearchMode) return

    FileMentionService.searchFiles(query).then((results) => {
      setSearchFiles(results)
      setSelectedIndex(0)
    })
  }, [visible, query, isSearchMode])

  // 浏览模式：列出目录内容
  useEffect(() => {
    if (!visible) return
    if (isSearchMode) return

    FileMentionService.listDirectory(browsePath).then((results) => {
      // 非根目录时插入 "返回上级" 条目
      if (browsePath) {
        results.unshift({
          id: '..',
          type: 'other',
          title: '..',
          filePath: '',
          isDir: true,
          relativeDir: browsePath.split('/').slice(0, -1).join('/'),
        })
      }
      setBrowseItems(results)
      setSelectedIndex(0)
    })
  }, [visible, query, isSearchMode, browsePath])

  // 滚动到选中项
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, currentItems])

  // 键盘处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(currentItems.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + currentItems.length) % Math.max(currentItems.length, 1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const item = currentItems[selectedIndex]
        if (!item) return
        if (item.isDir) {
          if (item.id === '..') {
            // 返回上级
            const parent = browsePath.split('/').slice(0, -1).join('/')
            setBrowsePath(parent)
          } else {
            // 进入目录
            setBrowsePath(item.relativeDir ? `${item.relativeDir}/${item.title}` : item.title)
          }
        } else {
          onSelect(item)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [visible, currentItems, selectedIndex, onSelect, onClose, browsePath],
  )

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handleKeyDown])

  if (!visible) return null

  if (currentItems.length === 0) {
    return (
      <div className="file-mentions">
        <div className="file-mentions-header">{isSearchMode ? '搜索文件' : '浏览文件'}</div>
        <div className="file-mentions-empty">暂无文件</div>
      </div>
    )
  }

  if (isSearchMode) {
    // 搜索模式：按类型分组（同原有逻辑）
    const grouped = currentItems.reduce(
      (acc, f) => {
        const type = f.isDir ? 'other' : f.type
        ;(acc[type] ??= []).push(f)
        return acc
      },
      {} as Record<FileType, FileMentionItem[]>,
    )

    let flatIndex = 0

    return (
      <div className="file-mentions" ref={listRef}>
        <div className="file-mentions-header">引用文件</div>
        {TYPE_ORDER.map((type) => {
          const items = grouped[type]
          if (!items?.length) return null
          return (
            <div key={type} className="file-mentions-group">
              <div className="file-mentions-group-label">{TYPE_LABELS[type]}</div>
              {items.map((item) => {
                const idx = flatIndex++
                return (
                  <div
                    key={item.id}
                    className={`file-mentions-item ${idx === selectedIndex ? 'selected' : ''}`}
                    data-index={idx}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="file-mentions-item-icon">
                      <File size={14} />
                    </span>
                    <span className="file-mentions-item-name">@{item.title}</span>
                    {item.volume && (
                      <span className="file-mentions-item-volume">{item.volume}</span>
                    )}
                    <span className={`file-mentions-type-badge ${type}`}>
                      {TYPE_LABELS[type]}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // 浏览模式：目录 + 文件
  const dirs = currentItems.filter((i) => i.isDir)
  const files = currentItems.filter((i) => !i.isDir)
  let flatIndex = 0

  // 检查同名文件以决定是否显示路径上下文
  const nameCount = new Map<string, number>()
  files.forEach((f) => nameCount.set(f.title, (nameCount.get(f.title) ?? 0) + 1))

  return (
    <div className="file-mentions" ref={listRef}>
      <div className="file-mentions-header">
        {browsePath ? `浏览: /${browsePath}` : '浏览文件'}
      </div>
      {dirs.length > 0 && (
        <div className="file-mentions-group">
          <div className="file-mentions-group-label">目录</div>
          {dirs.map((item) => {
            const idx = flatIndex++
            return (
              <div
                key={item.id}
                className={`file-mentions-item ${idx === selectedIndex ? 'selected' : ''}`}
                data-index={idx}
                onClick={() => {
                  if (item.id === '..') {
                    const parent = browsePath.split('/').slice(0, -1).join('/')
                    setBrowsePath(parent)
                  } else {
                    setBrowsePath(
                      item.relativeDir ? `${item.relativeDir}/${item.title}` : item.title,
                    )
                  }
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="file-mentions-item-icon">
                  <Folder size={14} />
                </span>
                <span className="file-mentions-item-name">
                  {item.id === '..' ? '..' : item.title}/
                </span>
              </div>
            )
          })}
        </div>
      )}
      {files.length > 0 && (
        <div className="file-mentions-group">
          <div className="file-mentions-group-label">文件</div>
          {files.map((item) => {
            const idx = flatIndex++
            const showPath = nameCount.get(item.title)! > 1
            return (
              <div
                key={item.id}
                className={`file-mentions-item ${idx === selectedIndex ? 'selected' : ''}`}
                data-index={idx}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="file-mentions-item-icon">
                  <File size={14} />
                </span>
                <span className="file-mentions-item-name">@{item.title}</span>
                {showPath && item.relativeDir && (
                  <span className="file-mentions-item-path">{item.relativeDir}/</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
