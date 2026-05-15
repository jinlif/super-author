import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useId, useState } from 'react'

interface TwoFieldDialogProps {
  open: boolean
  title: string
  field1Label: string
  field1Placeholder?: string
  field1Default?: string
  field2Label: string
  field2Placeholder?: string
  field2Default?: string
  onConfirm: (field1: string, field2: string) => void
  onCancel: () => void
}

export function TwoFieldDialog({
  open,
  title,
  field1Label,
  field1Placeholder,
  field1Default = '',
  field2Label,
  field2Placeholder,
  field2Default = '',
  onConfirm,
  onCancel,
}: TwoFieldDialogProps) {
  const [value1, setValue1] = useState(field1Default)
  const [value2, setValue2] = useState(field2Default)
  const field1Id = useId()
  const field2Id = useId()

  useEffect(() => {
    if (open) {
      setValue1(field1Default)
      setValue2(field2Default)
    }
  }, [open, field1Default, field2Default])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onCancel()
    },
    [onCancel],
  )

  const handleConfirm = useCallback(() => {
    onConfirm(value1, value2)
  }, [value1, value2, onConfirm])

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] p-6 shadow-xl w-96 data-[state=open]:animate-in">
          <Dialog.Title className="text-[#cccccc] text-base font-medium mb-2">{title}</Dialog.Title>
          <div className="mb-4">
            <label htmlFor={field1Id} className="block text-[#9d9d9d] text-sm mb-1">
              {field1Label}
            </label>
            <input
              id={field1Id}
              type="text"
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              placeholder={field1Placeholder}
              className="w-full px-3 py-1.5 text-sm rounded border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] outline-none focus:border-[#007acc]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value1.trim()) {
                  handleConfirm()
                }
              }}
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label htmlFor={field2Id} className="block text-[#9d9d9d] text-sm mb-1">
              {field2Label}
            </label>
            <textarea
              id={field2Id}
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              placeholder={field2Placeholder}
              rows={3}
              className="w-full px-3 py-1.5 text-sm rounded border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] outline-none focus:border-[#007acc] resize-none"
            />
          </div>
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
              disabled={!value1.trim()}
            >
              确定
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
