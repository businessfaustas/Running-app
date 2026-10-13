import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

export const useToasts = create<{ toasts: Toast[] }>()(() => ({ toasts: [] }))
let nextId = 1

export function toast(message: string, tone: Toast['tone'] = 'success') {
  const id = nextId++
  useToasts.setState((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
  setTimeout(
    () => useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    3200,
  )
}

/** Shows an error from a failed mutation in plain words. */
export function toastError(error: unknown) {
  toast(error instanceof Error ? error.message : 'Something went wrong', 'error')
}
