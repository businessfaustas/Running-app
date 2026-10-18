import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  /** E.g. until the person has typed a confirmation word. */
  confirmDisabled?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Bottom sheet on phones, centred card on larger screens. Uses the native <dialog>. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Grįžti',
  destructive = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/60 sm:m-auto sm:max-w-sm"
    >
      <div className="rounded-t-[28px] border border-line bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white sm:rounded-[28px] sm:pb-6">
        <h2 className="headline text-[24px]">{title}</h2>
        {children && <div className="mt-1.5 text-sm text-slate-400">{children}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            loading={busy}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
