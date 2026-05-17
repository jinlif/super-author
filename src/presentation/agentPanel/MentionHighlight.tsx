import { memo, useEffect, useRef } from 'react'

/** 匹配 @文件名（含中文、字母、数字、连字符、下划线、点号） */
const MENTION_RE = /@[\w一-鿿々\.\-_]+/g

interface MentionHighlightProps {
  text: string
  scrollTop: number
}

/**
 * 文本 @ 高亮 overlay，position: absolute 覆盖在 textarea 上方。
 * - pointer-events: none，点击穿透到 textarea
 * - color: transparent，只显示 mark 背景色
 * - 通过 scrollTop 与 textarea 同步滚动
 */
export const MentionHighlight = memo(function MentionHighlight({
  text,
  scrollTop,
}: MentionHighlightProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  // 同步滚动位置
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.scrollTop = scrollTop
    }
  }, [scrollTop])

  // HTML转义 + @高亮
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const html = escaped.replace(MENTION_RE, (match) => `<mark>${match}</mark>`)

  return (
    <div
      ref={layerRef}
      className="mention-highlight-layer"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})
