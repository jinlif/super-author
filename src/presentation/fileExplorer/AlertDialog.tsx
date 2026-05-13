import * as Dialog from '@radix-ui/react-dialog'
import { useCallback } from 'react'

interface AlertDialogProps {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export function AlertDialog({ open, title, message, onClose }: AlertDialogProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose()
    },
    [onClose],
  )

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-96 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-2">{title}</Dialog.Title>
          <Dialog.Description className="text-[#9d9d9d] text-sm mb-6">{message}</Dialog.Description>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-white bg-[#007acc] hover:bg-[#0098ff] transition-colors"
              onClick={onClose}
              autoFocus
            >
              确定
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
