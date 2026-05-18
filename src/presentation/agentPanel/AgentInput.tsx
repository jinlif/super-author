import { SendHorizonal, Square } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { FileMentionService } from "../../application/services/FileMentionService";
import type { FileMentionItem } from "../../application/services/FileMentionService";
import { useModelService } from "../../application/services/ModelService";
import { useAgentStore } from "../../application/stores/agentStore";
import { useEditorStore } from "../../application/stores/editorStore";
import type { Command } from "../../domain/types/command";
import type { SelectedMention } from "../../domain/types/fileMention";
import { CommandSuggestions } from "./CommandSuggestions";
import { FileMentions } from "./FileMentions";
import { MentionHighlight } from "./MentionHighlight";

// 检测命令模式：行首 `/` 或空格后 `/`
function detectCommand(text: string): { active: boolean; query: string } {
  // 匹配：整行以 / 开头，或空格后跟 /
  const match = text.match(/(^|\s)\/(\w*)$/);
  if (match) {
    return { active: true, query: match[2] };
  }
  return { active: false, query: "" };
}

// 检测文件提及模式：行首 `@` 或空格后 `@`
function detectMention(
  text: string,
  cursorPos: number,
): { active: boolean; query: string; startPos: number } {
  // 获取光标前的文本
  const beforeCursor = text.substring(0, cursorPos);
  // 匹配：行首 @ 或空格后跟 @，后面跟着非空白字符
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (match) {
    const fullMatch = match[0];
    const queryPart = match[2] || "";
    const startPos = cursorPos - fullMatch.length;
    return { active: true, query: queryPart, startPos };
  }
  return { active: false, query: "", startPos: 0 };
}

interface AgentInputProps {
  onOpenModelPicker: () => void
}

export function AgentInput({
  onOpenModelPicker,
}: AgentInputProps) {
  const [input, setInput] = useState("");
  const [cmdActive, setCmdActive] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<SelectedMention[]>(
    [],
  );
  const selectedMentionsRef = useRef<SelectedMention[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = useAgentStore((s) => s.isStreaming);
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const abortStreaming = useAgentStore((s) => s.abortStreaming);
  const tempChapterData = useAgentStore((s) => s.tempChapterData);
  const setTempChapterData = useAgentStore((s) => s.setTempChapterData);
  const commandRegistry = useAgentStore((s) => s.commandRegistry);
  const clearConversation = useAgentStore((s) => s.clearConversation);

  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);

  const getCurrentChapterContent = useCallback(() => {
    if (!activeTabId) return undefined;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return undefined;
    const model = useModelService.getState().models[activeTab.filePath];
    return model?.value;
  }, [activeTabId, tabs]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // 用 ref 获取最新值，避免闭包陷阱
    const mentions = [...selectedMentionsRef.current];
    setInput("");
    setCmdActive(false);
    setMentionActive(false);
    setSelectedMentions([]);
    selectedMentionsRef.current = [];

    // 读取引用文件内容
    const mentionContents: string[] = [];
    for (const mention of mentions) {
      try {
        const content = await FileMentionService.readFileContent(
          mention.item.filePath,
        );
        if (content) {
          mentionContents.push(
            `## ${mention.item.title}\n路径: ${mention.item.filePath}\n\n${content}`,
          );
        } else {
          console.warn(`[AgentInput] 文件为空或不存在: ${mention.item.filePath}`);
        }
      } catch (err) {
        console.error(`[AgentInput] 读取文件失败: ${mention.item.filePath}`, err);
      }
    }

    console.debug(`[AgentInput] 发送消息，引用文件数: ${mentionContents.length}/${mentions.length}`);

    const chapterContent = getCurrentChapterContent();
    sendMessage(text, chapterContent, mentionContents);
  }, [input, isStreaming, sendMessage, getCurrentChapterContent]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !cmdActive && !mentionActive) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, cmdActive, mentionActive],
  );

  const handleInput = useCallback((value: string) => {
    setInput(value);
    // 命令检测
    const { active, query } = detectCommand(value);
    setCmdActive(active);
    setCmdQuery(query);

    // 同步清理 selectedMentions：移除文本中已不存在的提及
    setSelectedMentions((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((m) => value.includes(m.displayText));
      if (next.length !== prev.length) {
        selectedMentionsRef.current = next;
      }
      return next;
    });

    // 文件提及检测
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      const mentionResult = detectMention(value, cursorPos);
      setMentionActive(mentionResult.active);
      setMentionQuery(mentionResult.query);
      setMentionStartPos(mentionResult.startPos);
    }
  }, []);

  const handleCommandSelect = useCallback(
    (command: Command) => {
      setCmdActive(false);
      if (command.action === "modal") {
        if (command.modalName === "ModelPicker") {
          onOpenModelPicker();
        }
        // 清除输入中的 /xxx
        setInput("");
      } else if (command.action === "execute") {
        if (command.name === "new") {
          clearConversation();
        }
        setInput("");
      } else if (command.action === "fill" && command.prompt) {
        // 替换 /command 为 prompt 模板
        const prompt = command.prompt;
        const cursorIdx = prompt.indexOf("{cursor}");
        const cleanPrompt = prompt.replace("{cursor}", "");
        setInput(cleanPrompt);
        // 设置光标位置
        setTimeout(() => {
          if (textareaRef.current) {
            const pos = cursorIdx >= 0 ? cursorIdx : cleanPrompt.length;
            textareaRef.current.setSelectionRange(pos, pos);
            textareaRef.current.focus();
          }
        }, 0);
      }
    },
    [clearConversation],
  );

  const handleCommandClose = useCallback(() => {
    setCmdActive(false);
  }, []);

  const handleMentionSelect = useCallback(
    (item: FileMentionItem) => {
      setMentionActive(false);

      // 替换输入框中的 @xxx 为 @文件名
      const mentionText = `@${item.title}`;
      const cursorPos = textareaRef.current?.selectionStart ?? input.length;
      // mentionStartPos 指向正则 (^|\s)@ 的起始位置，可能包含前导空格
      // 若前导是空格，substring(0, pos) 会丢掉空格，需 +1 保留
      const hasLeadingSpace = mentionStartPos > 0 && input[mentionStartPos] === ' ';
      const beforeMention = input.substring(0, hasLeadingSpace ? mentionStartPos + 1 : mentionStartPos);
      const afterCursor = input.substring(cursorPos);
      const newInput = `${beforeMention}${mentionText} ${afterCursor}`;
      setInput(newInput);

      // 添加到已选列表
      setSelectedMentions((prev) => {
        // 避免重复选择
        if (prev.some((m) => m.item.filePath === item.filePath)) return prev;
        const next = [...prev, { item, displayText: mentionText }];
        selectedMentionsRef.current = next;
        return next;
      });

      // 定位光标
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = beforeMention.length + mentionText.length + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    },
    [input, mentionStartPos],
  );

  const handleMentionClose = useCallback(() => {
    setMentionActive(false);
  }, []);

  const allCommands = commandRegistry.getAll();

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
            onClick={() =>
              setInput(`请修改以下内容:\n\n${tempChapterData.content}`)
            }
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
          <span style={{ fontSize: 11, color: "#858585", marginLeft: 8 }}>
            AI 生成 - 待审阅: {tempChapterData.title}
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="agent-input-row" style={{ position: "relative" }}>
        <CommandSuggestions
          commands={allCommands}
          query={cmdQuery}
          visible={cmdActive}
          onSelect={handleCommandSelect}
          onClose={handleCommandClose}
        />
        <FileMentions
          query={mentionQuery}
          visible={mentionActive}
          onSelect={handleMentionSelect}
          onClose={handleMentionClose}
        />
        {/* 输入框容器：overlay + textarea 共用定位上下文 */}
        <div className="agent-input-wrapper">
          <MentionHighlight
            text={input}
            scrollTop={scrollTop}
            selectedMentions={selectedMentions}
          />
          <TextareaAutosize
            ref={textareaRef}
            className="agent-input"
            placeholder="输入写作指令... (输入 / 触发命令，输入 @ 引用文件)"
            minRows={2}
            maxRows={15}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            style={{ caretColor: '#e0e0e0', color: 'transparent' }}
          />
        </div>
        {isStreaming ? (
          <button
            type="button"
            className="agent-abort-btn"
            onClick={abortStreaming}
            title="中止"
          >
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

    </div>
  );
}
