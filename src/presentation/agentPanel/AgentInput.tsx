import { SendHorizonal, Square } from 'lucide-react'
import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useModelService } from '../../application/services/ModelService'
import { useAgentStore } from '../../application/stores/agentStore'
import { useEditorStore } from '../../application/stores/editorStore'
import type { Command } from '../../domain/types/command'
import { CommandSuggestions } from './CommandSuggestions'
import { ModelPickerModal } from './ModelPickerModal'

// 检测命令模式：行首 `/` 或空格后 `/`
function detectCommand(text: string): { active: boolean; query: string } {
  // 匹配：整行以 / 开头，或空格后跟 /
  const match = text.match(/(^|\s)\/(\w*)$/)
  if (match) {
    return { active: true, query: match[2] }
  }
  return { active: false, query: '' }
}

export function AgentInput() {
  const [input, setInput] = useState('')
  const [cmdActive, setCmdActive] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = useAgentStore((s) => s.isStreaming)
  const sendMessage = useAgentStore((s) => s.sendMessage)
  const abortStreaming = useAgentStore((s) => s.abortStreaming)
  const tempChapterData = useAgentStore((s) => s.tempChapterData)
  const setTempChapterData = useAgentStore((s) => s.setTempChapterData)
  const commandRegistry = useAgentStore((s) => s.commandRegistry)
  const clearConversation = useAgentStore((s) => s.clearConversation)

  const activeTabId = useEditorStore((s) => s.activeTabId)
  const tabs = useEditorStore((s) => s.tabs)

  const getCurrentChapterContent = useCallback(() => {
    if (!activeTabId) return undefined
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return undefined
    const model = useModelService.getState().models[activeTab.filePath]
    return model?.value
  }, [activeTabId, tabs])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    setCmdActive(false)
    const chapterContent = getCurrentChapterContent()
    sendMessage(text, chapterContent)
  }, [input, isStreaming, sendMessage, getCurrentChapterContent])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !cmdActive) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, cmdActive],
  )

  const handleInput = useCallback((value: string) => {
    setInput(value)
    // 命令检测
    const { active, query } = detectCommand(value)
    setCmdActive(active)
    setCmdQuery(query)
  }, [])

  const handleCommandSelect = useCallback(
    (command: Command) => {
      setCmdActive(false)
      if (command.action === 'modal') {
        if (command.modalName === 'ModelPicker') {
          setShowModelPicker(true)
        }
        // 清除输入中的 /xxx
        setInput('')
      } else if (command.action === 'execute') {
        if (command.name === 'new') {
          clearConversation()
        }
        setInput('')
      } else if (command.action === 'fill' && command.prompt) {
        // 替换 /command 为 prompt 模板
        const prompt = command.prompt
        const cursorIdx = prompt.indexOf('{cursor}')
        const cleanPrompt = prompt.replace('{cursor}', '')
        setInput(cleanPrompt)
        // 设置光标位置
        setTimeout(() => {
          if (textareaRef.current) {
            const pos = cursorIdx >= 0 ? cursorIdx : cleanPrompt.length
            textareaRef.current.setSelectionRange(pos, pos)
            textareaRef.current.focus()
          }
        }, 0)
      }
    },
    [clearConversation],
  )

  const handleCommandClose = useCallback(() => {
    setCmdActive(false)
  }, [])

  const allCommands = commandRegistry.getAll()

  return (
    <div className="agent-input-area">
      {/* Review bar for temp chapters */}
      {tempChapterData && (
        <div className="review-bar">
          <button type="button" className="review-btn save">
            保存到章节
          </button>
          <button
            type="button"
            className="review-btn"
            onClick={() => setInput(`请修改以下内容:\n\n${tempChapterData.content}`)}
          >
            修改
          </button>
          <button
            type="button"
            className="review-btn danger"
            onClick={() => setTempChapterData(null)}
          >
            放弃
          </button>
          <span style={{ fontSize: 11, color: '#858585', marginLeft: 8 }}>
            AI 生成 - 待审阅: {tempChapterData.title}
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="agent-input-row" style={{ position: 'relative' }}>
        <CommandSuggestions
          commands={allCommands}
          query={cmdQuery}
          visible={cmdActive}
          onSelect={handleCommandSelect}
          onClose={handleCommandClose}
        />
        <TextareaAutosize
          ref={textareaRef}
          className="agent-input"
          placeholder="输入写作指令... (输入 / 触发命令)"
          minRows={2}
          maxRows={15}
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button type="button" className="agent-abort-btn" onClick={abortStreaming} title="中止">
            <Square size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="agent-send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            title="发送"
          >
            <SendHorizonal size={14} />
          </button>
        )}
      </div>

      {/* Model picker modal */}
      <ModelPickerModal visible={showModelPicker} onClose={() => setShowModelPicker(false)} />
    </div>
  )
}
