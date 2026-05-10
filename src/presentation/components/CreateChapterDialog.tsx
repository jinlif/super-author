import * as Dialog from '@radix-ui/react-dialog'
import { type KeyboardEvent, useState } from 'react'

interface CreateChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string) => void
}

export function CreateChapterDialog({ open, onOpenChange, onSubmit }: CreateChapterDialogProps) {
  const [title, setTitle] = useState('')

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setTitle('')
    onOpenChange(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleSubmit()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-80 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-4">
            新建章节
          </Dialog.Title>
          <input
            autoFocus
            className="w-full px-3 py-2 rounded bg-[#3c3c3c] border border-[#5a5a5a] text-[#cccccc] text-sm outline-none focus:border-[#007acc] placeholder:text-[#6e6e6e]"
            placeholder="输入章节名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4a4a4a] transition-colors"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-white bg-[#007acc] hover:bg-[#0098ff] disabled:opacity-40 transition-colors"
              disabled={!title.trim()}
              onClick={handleSubmit}
            >
              创建
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
