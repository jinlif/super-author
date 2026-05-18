import { memo, useEffect, useMemo, useRef } from 'react'
import type { SelectedMention } from '../../domain/types/fileMention'

interface MentionHighlightProps {
  text: string
  scrollTop: number
  selectedMentions: SelectedMention[]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 文本 @ 高亮 overlay，position: absolute 覆盖在 textarea 上方。
 *
 * 工作原理：
 * - textarea 的文字颜色设为透明（caret-color 保留光标）
 * - overlay 显示实际文本 + 高亮，样式与 textarea 完全一致
 * - pointer-events: none，点击穿透到 textarea
 * - 通过 scrollTop 与 textarea 同步滚动
 */
export const MentionHighlight = memo(function MentionHighlight({
  text,
  scrollTop,
  selectedMentions,
}: MentionHighlightProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  // 同步滚动位置
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.scrollTop = scrollTop
    }
  }, [scrollTop])

  // 根据 selectedMentions 构建精确匹配正则
  const pattern = useMemo(() => {
    if (selectedMentions.length === 0) return null
    const escaped = selectedMentions
      .map((m) => escapeRegExp(m.displayText))
      .sort((a, b) => b.length - a.length)
    return new RegExp(escaped.join('|'), 'g')
  }, [selectedMentions])

  // HTML转义 + 精确高亮
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const html = pattern
    ? escaped.replace(pattern, (match) => `<mark>${match}</mark>`)
    : escaped

  return (
    <div
      ref={layerRef}
      className="mention-highlight-layer"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})
