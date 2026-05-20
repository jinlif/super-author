import { Bot, Brain, Check, ChevronDown, ChevronRight, User, Wrench, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
  AgentMessage,
  AssistantContentBlock,
  ToolResultContentBlock,
} from '../../domain/types/agent'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ChatRowProps {
  message: AgentMessage
  isStreaming?: boolean
}

// 匹配 agentStore 写入的工具结果文本：[工具 xxx 执行完成: ...] 或 [工具 xxx 执行失败: ...]
const TOOL_RESULT_RE = /^\n*\[工具 (.+?) 执行(完成|失败):\s*([\s\S]*?)\]\s*$/

type ContentGroup =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | {
      kind: 'tool'
      name: string
      input?: Record<string, unknown>
      result?: string
      isError?: boolean
    }

/** 从工具参数中提取关键摘要 */
function getToolSummary(name: string, input?: Record<string, unknown>): string {
  if (!input) return ''

  // 读取/写入/编辑文件类工具 → 显示路径
  if (
    ['read_file', 'write_file', 'edit_file', 'readFile', 'writeFile', 'editFile'].includes(name)
  ) {
    const path = (input.path ?? input.file_path ?? input.filePath ?? '') as string
    return path ? truncate(path, 40) : ''
  }

  // bash/execute_command → 显示命令
  if (['bash', 'execute_command', 'executeCommand', 'run_command'].includes(name)) {
    const cmd = (input.command ?? input.cmd ?? '') as string
    return cmd ? truncate(cmd, 40) : ''
  }

  // grep/search → 显示 pattern
  if (['grep', 'search', 'ripgrep'].includes(name)) {
    const pattern = (input.pattern ?? input.query ?? '') as string
    return pattern ? truncate(pattern, 40) : ''
  }

  // 其他工具 → 显示第一个字符串参数
  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.length > 0) {
      return truncate(val, 40)
    }
  }

  return ''
}

function truncate(str: string, max: number): string {
  const oneLine = str.replace(/\n/g, ' ')
  return oneLine.length > max ? `${oneLine.slice(0, max)}...` : oneLine
}

/** 将 content 块按顺序分组：文本/thinking 正常渲染，tool_use + 结果文本配对为折叠块 */
function groupContentBlocks(content: AgentMessage['content']): ContentGroup[] {
  const result: ContentGroup[] = []

  // 收集结构化 tool_result，按 tool_use_id 索引
  const resultMap = new Map<string, ToolResultContentBlock>()
  for (const block of content) {
    if (block.type === 'tool_result') {
      resultMap.set(block.tool_use_id, block as ToolResultContentBlock)
    }
  }

  // 记录已作为工具结果消费的文本块索引
  const consumedText = new Set<number>()

  for (let i = 0; i < content.length; i++) {
    const block = content[i]

    if (block.type === 'tool_use') {
      const b = block as AssistantContentBlock
      let toolResult = resultMap.get(b.id ?? '')?.content
      let toolError = resultMap.get(b.id ?? '')?.is_error

      // 尝试从紧随其后的文本块中提取结果
      if (!toolResult) {
        const next = content[i + 1]
        if (next?.type === 'text') {
          const text = (next as { text: string }).text
          const m = text.match(TOOL_RESULT_RE)
          if (m) {
            toolResult = m[3]
            toolError = m[2] === '失败'
            consumedText.add(i + 1)
          }
        }
      }

      result.push({
        kind: 'tool',
        name: b.name ?? '',
        input: b.input,
        result: toolResult,
        isError: toolError,
      })
    } else if (block.type === 'text' && !consumedText.has(i)) {
      result.push({ kind: 'text', text: (block as { text: string }).text })
    } else if (block.type === 'thinking') {
      result.push({ kind: 'thinking', text: (block as AssistantContentBlock).text ?? '' })
    }
    // tool_result 已在上面配对处理，此处跳过
  }

  return result
}

export function ChatRow({ message, isStreaming }: ChatRowProps) {
  const isUser = message.role === 'user'
  const isSubAgent = message.source === 'sub_agent'

  if (isUser) {
    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')

    return (
      <div className="chat-row user">
        <div className="chat-label">
          <User size={12} /> 你
        </div>
        <div className="chat-bubble">{text}</div>
      </div>
    )
  }

  return (
    <div className={`chat-row assistant${isSubAgent ? ' sub-agent' : ''}`}>
      <div className="chat-label">
        <Bot size={12} /> {isSubAgent ? 'SubAgent' : 'AI 助手'}
      </div>
      <AssistantBubble content={message.content} isStreaming={isStreaming} />
    </div>
  )
}

function AssistantBubble({
  content,
  isStreaming,
}: {
  content: AgentMessage['content']
  isStreaming?: boolean
}) {
  const groups = useMemo(() => groupContentBlocks(content), [content])

  const hasTool = groups.some((g) => g.kind === 'tool')
  const hasText = groups.some((g) => g.kind === 'text')

  return (
    <div className="chat-bubble">
      {groups.map((g, i) => {
        if (g.kind === 'thinking') {
          // biome-ignore lint/suspicious/noArrayIndexKey: 内容块顺序稳定不会重排
          return <ThinkingBlock key={`think-${i}`} text={g.text} isStreaming={isStreaming} />
        }
        if (g.kind === 'tool') {
          return (
            <ToolCallBlock
              // biome-ignore lint/suspicious/noArrayIndexKey: 内容块顺序稳定不会重排
              key={`tool-${i}`}
              name={g.name}
              input={g.input}
              result={g.result}
              isError={g.isError}
            />
          )
        }
        // text
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: 内容块顺序稳定不会重排
          <div key={`text-${i}`}>
            <MarkdownRenderer content={g.text} />
            {isStreaming && i === groups.length - 1 && <span className="streaming-cursor" />}
          </div>
        )
      })}
      {isStreaming && !hasText && !hasTool && <span className="streaming-cursor" />}
    </div>
  )
}

function ThinkingBlock({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [manuallyToggled, setManuallyToggled] = useState<boolean | null>(null)
  // 流式时自动展开；用户手动操作后尊重用户选择
  const expanded = manuallyToggled ?? (isStreaming && text.length > 0)

  return (
    <div className="thinking-block">
      <button
        type="button"
        className="thinking-toggle"
        onClick={() => {
          setManuallyToggled((prev) => (prev === null ? !expanded : !prev))
        }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Brain size={14} />
        思考过程
      </button>
      {expanded && <div className="thinking-content">{text}</div>}
    </div>
  )
}

function ToolCallBlock({
  name,
  input,
  result,
  isError,
}: {
  name: string
  input?: Record<string, unknown>
  result?: string
  isError?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const formattedInput = input ? JSON.stringify(input, null, 2) : ''
  const hasDetail = formattedInput || result
  const summary = getToolSummary(name, input)

  return (
    <div className="tool-call-block">
      <button
        type="button"
        className="tool-call-toggle"
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <span className="tool-call-arrow">
          {hasDetail ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
        </span>
        <Wrench size={14} />
        <span className="tool-call-name">{name}</span>
        {summary && <span className="tool-call-summary">{summary}</span>}
        {result && !expanded && (
          <span className={`tool-call-status ${isError ? 'error' : ''}`}>
            {isError ? <X size={14} /> : <Check size={14} />}
          </span>
        )}
      </button>
      {expanded && (
        <div className="tool-call-detail">
          {formattedInput && (
            <>
              <div className="tool-call-section-label">Input</div>
              <pre className="tool-call-input">{formattedInput}</pre>
            </>
          )}
          {result && (
            <>
              <div className="tool-call-section-label">Result</div>
              <div className={`tool-call-result${isError ? ' error' : ''}`}>{result}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
