import * as Dialog from '@radix-ui/react-dialog'

interface ConfirmSaveDialogProps {
  open: boolean
  fileName: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function ConfirmSaveDialog({
  open,
  fileName,
  onSave,
  onDiscard,
  onCancel,
}: ConfirmSaveDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-96 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-2">
            未保存的更改
          </Dialog.Title>
          <Dialog.Description className="text-[#9d9d9d] text-sm mb-6">
            &ldquo;{fileName}&rdquo; 有未保存的更改，要保存吗？
          </Dialog.Description>
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
              className="px-4 py-1.5 text-sm rounded text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4a4a4a] transition-colors"
              onClick={onDiscard}
            >
              不保存
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded text-white bg-[#007acc] hover:bg-[#0098ff] transition-colors"
              onClick={onSave}
            >
              保存
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
