import { Check, ClipboardCopy } from 'lucide-react'
import { useCallback, useState } from 'react'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') ?? ''

  const text = typeof children === 'string' ? children : String(children ?? '')
  // react-markdown 末尾会带一个换行，去掉
  const code = text.replace(/\n$/, '')

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button type="button" className="code-block-copy" onClick={handleCopy} title="复制">
          {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
        </button>
      </div>
      <pre className={className}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body${className ? ` ${className}` : ''}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code(props) {
            const { className, children, ...rest } = props
            const isBlock = Boolean(className?.includes('language-'))
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>
            }
            return (
              <code className="inline-code" {...rest}>
                {children}
              </code>
            )
          },
          a(props) {
            const { children, href, ...rest } = props
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
