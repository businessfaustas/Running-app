import { Sparkles } from 'lucide-react'
import clsx from 'clsx'

/** The small "Plus" mark shown next to members' names and on paid-only features. */
export function PlusBadge({ className, label = 'Plus' }: { className?: string; label?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-volt to-[#9dff5c] px-2 py-0.5 text-[10.5px] leading-none font-extrabold tracking-wide text-black uppercase',
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {label}
    </span>
  )
}
