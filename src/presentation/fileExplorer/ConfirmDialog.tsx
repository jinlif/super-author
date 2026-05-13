import * as Dialog from '@radix-ui/react-dialog'
import { useCallback } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onCancel()
    },
    [onCancel],
  )

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-96 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-2">{title}</Dialog.Title>
          <Dialog.Description className="text-[#9d9d9d] text-sm mb-6 whitespace-pre-wrap">
            {message}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4a4a4a] transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-white bg-[#d32f2f] hover:bg-[#e53935] transition-colors"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
