import { useCallback, useEffect, useRef, useState } from 'react'
import type { Command, CommandCategory } from '../../domain/types/command'
import './CommandSuggestions.css'

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  builtin: '内置',
  custom: '自定义',
  skill: 'Skill',
}

interface CommandSuggestionsProps {
  commands: Command[]
  query: string
  visible: boolean
  onSelect: (command: Command) => void
  onClose: () => void
}

export function CommandSuggestions({
  commands,
  query,
  visible,
  onSelect,
  onClose,
}: CommandSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = commands.filter((c) => {
    const q = query.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  })

  // 按 category 分组
  const grouped = filtered.reduce(
    (acc, cmd) => {
      ;(acc[cmd.category] ??= []).push(cmd)
      return acc
    },
    {} as Record<CommandCategory, Command[]>,
  )

  const categoryOrder: CommandCategory[] = ['builtin', 'custom', 'skill']
  const flatList = categoryOrder.flatMap((cat) => grouped[cat] ?? [])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [])

  // 滚动到选中项
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % flatList.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + flatList.length) % flatList.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatList[selectedIndex]) {
          onSelect(flatList[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [visible, flatList, selectedIndex, onSelect, onClose],
  )

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handleKeyDown])

  if (!visible || flatList.length === 0) {
    if (visible && flatList.length === 0) {
      return (
        <div className="command-suggestions">
          <div className="command-empty">无匹配命令</div>
        </div>
      )
    }
    return null
  }

  let flatIndex = 0

  return (
    <div className="command-suggestions" ref={listRef}>
      <div className="command-suggestions-header">命令</div>
      {categoryOrder.map((cat) => {
        const items = grouped[cat]
        if (!items || items.length === 0) return null
        return (
          <div key={cat} className="command-category-group">
            <div className="command-category-label">{CATEGORY_LABELS[cat]}</div>
            {items.map((cmd) => {
              const idx = flatIndex++
              return (
                <div
                  key={cmd.name}
                  className={`command-item-suggestion ${idx === selectedIndex ? 'selected' : ''}`}
                  data-index={idx}
                  onClick={() => onSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="command-item-name-suggestion">/{cmd.name}</span>
                  <span className="command-item-desc-suggestion">{cmd.description}</span>
                  <span className={`command-category-badge ${cat}`}>{CATEGORY_LABELS[cat]}</span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
