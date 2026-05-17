# Implementation Plan: ApprovalDialog & AskDialog Refinement (3.9b Refinement)

## Overview

Refine both dialogs with unified radio-based design, conditional input, corrected behavior, auto-resize textarea, and abortStreaming safety fix.

## Files to Modify

| File | Change |
|------|--------|
| `src/presentation/agentPanel/ApprovalDialog.tsx` | Complete rewrite |
| `src/presentation/agentPanel/AskDialog.tsx` | Significant refactor |
| `src/presentation/agentPanel/AgentPanel.css` | Update/Cleanup dialog CSS |
| `src/application/stores/agentStore.ts` | Fix abortStreaming |

---

## 1. `src/application/stores/agentStore.ts` — abortStreaming Fix

### Change

In `abortStreaming()`, before calling `controller.abort()`, also resolve the pendingTool promise with `null` so the AgentLoop's `await onUserInput()` doesn't hang forever.

### Current Code (line 590-596)

```typescript
abortStreaming: () => {
    const controller = get()._abortController
    if (controller) {
      controller.abort()
      set({ isStreaming: false, _abortController: null, pendingTool: null })
    }
  },
```

### New Code

```typescript
abortStreaming: () => {
    const state = get()
    const controller = state._abortController
    if (controller) {
      // 先 resolve pendingTool，让 AgentLoop 的 onUserInput 不被挂起
      state.pendingTool?.resolve(null)
      controller.abort()
      set({ isStreaming: false, _abortController: null, pendingTool: null })
    }
  },
```

### Rationale

Without this fix, if user clicks abort while a dialog is open, `pendingTool.resolve` never gets called, the `onUserInput` Promise in AgentLoop never resolves, and the `sendMessage` async generator hangs forever — the loop is stuck.

With `pendingTool?.resolve(null)`, AgentLoop's `onUserInput` returns `null`, which at AgentLoop line 167 triggers `yield { type: 'done' }; return` — a clean, non-hanging stop.

---

## 2. `src/presentation/agentPanel/ApprovalDialog.tsx` — Complete Rewrite

### Strategy

- Replace 2-button layout + always-visible textarea with radio-based selection
- Three radio options: "同意", "拒绝", "其他..."
- Input hidden by default; appears only when "其他..." selected
- Single "提交" button at bottom-right
- Replace `<textarea rows={2}>` with `TextareaAutosize` (minRows=1, maxRows=5)
- Submit disabled when "其他..." selected + input empty

### Full New Code

```tsx
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useAgentStore } from '../../application/stores/agentStore'

type ApprovalChoice = 'approved' | 'rejected' | 'others'

export function ApprovalDialog() {
  const pendingTool = useAgentStore((s) => s.pendingTool)
  const resolvePending = useAgentStore((s) => s.resolvePending)

  const [choice, setChoice] = useState<ApprovalChoice | null>(null)
  const [othersText, setOthersText] = useState('')

  if (!pendingTool || pendingTool.name !== 'approval') return null

  const isOthers = choice === 'others'
  const canSubmit =
    choice === 'approved' ||
    choice === 'rejected' ||
    (isOthers && othersText.trim().length > 0)

  const handleSubmit = () => {
    if (!choice) return
    if (choice === 'approved') {
      resolvePending({ action: 'approved' })
    } else if (choice === 'rejected') {
      resolvePending(null)
    } else if (choice === 'others' && othersText.trim()) {
      resolvePending({ action: 'feedback', text: othersText.trim() })
    }
  }

  const handleRadioChange = (value: ApprovalChoice) => {
    setChoice(value)
    if (value !== 'others') {
      setOthersText('')
    }
  }

  const title = String(pendingTool.input.title ?? '确认操作')

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">{title}</div>

        <div className="agent-dialog-options">
          {(['approved', 'rejected', 'others'] as const).map((value) => (
            <label key={value} className="agent-dialog-option">
              <input
                type="radio"
                name="approval-choice"
                checked={choice === value}
                onChange={() => handleRadioChange(value)}
              />
              <span>
                {value === 'approved' ? '同意' : value === 'rejected' ? '拒绝' : '其他...'}
              </span>
            </label>
          ))}
        </div>

        {isOthers && (
          <div className="agent-dialog-extra">
            <TextareaAutosize
              className="agent-dialog-input"
              placeholder="输入补充说明..."
              minRows={1}
              maxRows={5}
              value={othersText}
              onChange={(e) => setOthersText(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="agent-dialog-submit-row">
          <button
            type="button"
            className="agent-dialog-btn primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Key Points

- **"同意" + submit** → `resolvePending({ action: 'approved' })` → AgentLoop continues
- **"拒绝" + submit** → `resolvePending(null)` → AgentLoop yields `done`, returns (clean stop, no abort)
- **"其他..." + input + submit** → `resolvePending({ action: 'feedback', text })` → AgentLoop continues
- `autoFocus` on textarea when "其他..." is selected
- Input is cleared when switching away from "其他..."
- `choice` and `othersText` reset per dialog instance (zustand dialog unmounts/remounts when `pendingTool` changes)
- No `useRef` or `abortStreaming` import needed

---

## 3. `src/presentation/agentPanel/AskDialog.tsx` — Significant Refactor

### Strategy

- Replace checkbox/radio hybrid with pure radio-based design
- Tool options become radio buttons
- When `allowInput` is true, add a "其他..." radio option
- Input hidden by default; appears only when "其他..." selected
- Single "提交" button at bottom-right
- `TextareaAutosize` with minRows=1, maxRows=5
- Submit disabled when "其他..." selected + input empty
- Remove `multiple` support (design now uses radio-only)

### Full New Code

```tsx
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useAgentStore } from '../../application/stores/agentStore'

interface AskOption {
  label: string
  value: string
}

const OTHERS_VALUE = '__others__'

export function AskDialog() {
  const pendingTool = useAgentStore((s) => s.pendingTool)
  const resolvePending = useAgentStore((s) => s.resolvePending)

  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [othersText, setOthersText] = useState('')

  if (!pendingTool || pendingTool.name !== 'ask_question') return null

  const input = pendingTool.input as Record<string, unknown>
  const options = input?.options as AskOption[] | undefined
  const allowInput = !!(input?.allowInput)
  const question = String(input?.question ?? '')

  const isOthers = selectedValue === OTHERS_VALUE
  const canSubmit =
    selectedValue !== null &&
    (!isOthers || othersText.trim().length > 0)

  const handleSubmit = () => {
    if (selectedValue === null) return
    if (isOthers) {
      resolvePending({ action: 'answered', selected: [], text: othersText.trim() })
    } else {
      resolvePending({ action: 'answered', selected: [selectedValue], text: '' })
    }
  }

  const handleRadioChange = (value: string) => {
    setSelectedValue(value)
    if (value !== OTHERS_VALUE) {
      setOthersText('')
    }
  }

  return (
    <div className="agent-dialog-overlay">
      <div className="agent-dialog">
        <div className="agent-dialog-title">{question}</div>

        <div className="agent-dialog-options">
          {options?.map((opt) => (
            <label key={opt.value} className="agent-dialog-option">
              <input
                type="radio"
                name="ask-option"
                checked={selectedValue === opt.value}
                onChange={() => handleRadioChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
          {allowInput && (
            <label className="agent-dialog-option">
              <input
                type="radio"
                name="ask-option"
                checked={isOthers}
                onChange={() => handleRadioChange(OTHERS_VALUE)}
              />
              <span>其他...</span>
            </label>
          )}
        </div>

        {isOthers && (
          <div className="agent-dialog-extra">
            <TextareaAutosize
              className="agent-dialog-input"
              placeholder="输入内容..."
              minRows={1}
              maxRows={5}
              value={othersText}
              onChange={(e) => setOthersText(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="agent-dialog-submit-row">
          <button
            type="button"
            className="agent-dialog-btn primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Key Points

- Removed `multiple` support — always radio (single select)
- `OTHERS_VALUE` sentinel distinguishes "其他..." from regular options
- When a regular option is selected → `resolvePending({ action: 'answered', selected: [value], text: '' })`
- When "其他..." + input → `resolvePending({ action: 'answered', selected: [], text: othersText })`
- No `useRef` needed — input is state-controlled via `TextareaAutosize`

---

## 4. `src/presentation/agentPanel/AgentPanel.css` — CSS Updates

### Removals

Remove these CSS rules (no longer used):

```css
/* DELETE: replaced by .agent-dialog-submit-row */
.agent-dialog-buttons { ... }

/* DELETE: replaced by .agent-dialog-extra */
.agent-dialog-input-row { ... }

/* DELETE: no longer needed (no separate danger button) */
.agent-dialog-btn.danger { ... }
.agent-dialog-btn.danger:hover { ... }
```

### Modifications

Keep and reuse existing styles:
- `.agent-dialog-overlay` — unchanged
- `.agent-dialog` — unchanged
- `.agent-dialog-title` — unchanged
- `.agent-dialog-options` — unchanged (already uses flex column for radio, 6px gap, 10px margin-bottom)
- `.agent-dialog-option` — unchanged
- `.agent-dialog-input` — unchanged (already styled for dark theme, used by TextareaAutosize)
- `.agent-dialog-btn.primary` — unchanged (already has primary blue styling)
- `.agent-dialog-btn` — unchanged

### Additions

Add these new rules:

```css
/* Conditional extra input area (hidden by default, shown via JS) */
.agent-dialog-extra {
  margin-bottom: 0;
}

/* Submit button row — right-aligned with 12px margin-top */
.agent-dialog-submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
```

```css
/* Disabled state for submit button when "其他..." selected but empty */
.agent-dialog-btn.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.agent-dialog-btn.primary:disabled:hover {
  background-color: #007acc;
}
```

---

## 5. State Reset Notes

Both dialogs use local `useState`. Key behaviors:

- When `pendingTool` changes (new tool call arrives), React unmounts the old dialog and mounts a new one → local state resets automatically
- No need for explicit `useEffect` cleanup
- "其他..." textarea has `autoFocus` so it gets focus immediately when revealed

---

## 6. Behavior Matrix

### ApprovalDialog

| User Action | resolvePending() | AgentLoop Behavior |
|---|---|---|
| Select "同意" + submit | `{ action: 'approved' }` | Continues |
| Select "拒绝" + submit | `null` | Yields `done`, returns (stops) |
| Select "其他..." + empty input | (button disabled, can't submit) | — |
| Select "其他..." + text + submit | `{ action: 'feedback', text }` | Continues |
| Click abort button (AgentInput) | `null` (via abortStreaming fix) | Yields `done`, returns (stops) |

### AskDialog

| User Action | resolvePending() | AgentLoop Behavior |
|---|---|---|
| Select option + submit | `{ action: 'answered', selected: [value], text: '' }` | Continues |
| Select "其他..." + empty input | (button disabled, can't submit) | — |
| Select "其他..." + text + submit | `{ action: 'answered', selected: [], text }` | Continues |
| Click abort button (AgentInput) | `null` (via abortStreaming fix) | Yields `done`, returns (stops) |

---

## 7. Verification Steps

1. **ApprovalDialog: "同意"** — Select radio "同意", click submit → dialog closes, AgentLoop continues with `{ action: 'approved' }` as tool result
2. **ApprovalDialog: "拒绝"** — Select radio "拒绝", click submit → dialog closes, AgentLoop stops cleanly (yields `done`)
3. **ApprovalDialog: "其他..."** — Select radio "其他...", textarea appears with autoFocus, submit disabled while empty, type text → submit enabled, click submit → AgentLoop continues
4. **AskDialog: select option** — Pick a radio option, click submit → dialog closes, AgentLoop continues with `{ action: 'answered', selected: [value], text: '' }`
5. **AskDialog: "其他..." (when allowInput=true)** — "其他..." option appears, select it → textarea appears, submit disabled while empty, type → submit enabled
6. **TextareaAutosize** — Auto-resizes from 1 row to max 5 rows in both dialogs
7. **Submit button** — Always at bottom-right corner, disabled or enabled correctly
8. **Abort while dialog open** — Click abort button while dialog shows → dialog closes, agent stops, no hang
9. **AskDialog without allowInput** — No "其他..." option, no textarea, only tool options shown
