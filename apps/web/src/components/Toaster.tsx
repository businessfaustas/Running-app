import clsx from 'clsx'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useToasts } from '../lib/toast'

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={clsx(
            'flex max-w-sm items-center gap-2 rounded-full border border-white/10 bg-raised/95 py-2.5 pr-4 pl-3 backdrop-blur text-sm font-medium text-white shadow-xl shadow-black/50 motion-safe:animate-rise',
          )}
        >
          {t.tone === 'success' ? (
            <CircleCheck className="size-4 shrink-0 text-volt" aria-hidden />
          ) : (
            <CircleAlert className="size-4 shrink-0 text-red-400" aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
