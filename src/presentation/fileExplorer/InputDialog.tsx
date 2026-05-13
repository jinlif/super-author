import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useState } from 'react'

interface InputDialogProps {
  open: boolean
  title: string
  message: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InputDialog({
  open,
  title,
  message,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue)

  // 每次打开弹框时清空上次输入
  useEffect(() => {
    if (open) setValue(defaultValue)
  }, [open, defaultValue])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onCancel()
    },
    [onCancel],
  )

  const handleConfirm = useCallback(() => {
    onConfirm(value)
  }, [value, onConfirm])

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-96 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-2">{title}</Dialog.Title>
          <Dialog.Description className="text-[#9d9d9d] text-sm mb-4">{message}</Dialog.Description>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 text-sm rounded border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] outline-none focus:border-[#007acc] mb-6"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                handleConfirm()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4a4a4a] transition-colors"
              onClick={onCancel}
            >
              取消
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-white bg-[#007acc] hover:bg-[#0098ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={!value.trim()}
            >
              确定
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
