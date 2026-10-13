import clsx from 'clsx'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

interface TopBarProps {
  title?: ReactNode
  /** Where "back" goes when there's no history to return to (e.g. a shared link). */
  fallback?: string
  actions?: ReactNode
  /** Float over content (e.g. a map) instead of taking up space. */
  overlay?: boolean
  className?: string
}

export function TopBar({
  title,
  fallback = '/',
  actions,
  overlay = false,
  className,
}: TopBarProps) {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }

  return (
    <header
      className={clsx(
        'z-20 flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)]',
        overlay
          ? 'absolute inset-x-0 top-0'
          : 'sticky top-0 border-b border-line bg-ink/90 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex h-14 w-full items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className={clsx(
            'grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95',
            overlay
              ? 'bg-black/60 text-white backdrop-blur hover:bg-black/75'
              : 'text-zinc-200 hover:bg-white/5',
          )}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
