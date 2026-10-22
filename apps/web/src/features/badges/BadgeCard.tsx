import clsx from 'clsx'
import type { Badge } from './badges'
import { Medal } from './Medal'

/** A medal standing on a dark plinth with its name and level, value or count. */
export function BadgeCard({
  badge,
  onOpen,
  compact = false,
  showProgress = false,
}: {
  badge: Badge
  onOpen?: (badge: Badge) => void
  compact?: boolean
  /** A bar towards the next step, for the "still to get" list. */
  showProgress?: boolean
}) {
  const locked = badge.metal === 'locked'
  return (
    <button
      type="button"
      onClick={() => onOpen?.(badge)}
      className={clsx(
        'group flex flex-col items-center text-center transition active:scale-[0.97]',
        compact ? 'w-[92px] shrink-0' : 'w-full',
      )}
    >
      <Medal badge={badge} size={compact ? 70 : 86} className="relative z-10 -mb-6" />
      <span
        className={clsx(
          'flex w-full flex-col items-center rounded-[18px] bg-gradient-to-b from-raised to-surface px-1.5 pb-2.5',
          compact ? 'pt-7' : 'pt-8',
        )}
      >
        <span
          className={clsx(
            'flex min-h-[2.5em] items-center text-[12px] leading-tight font-semibold',
            locked ? 'text-slate-500' : 'text-slate-200',
          )}
        >
          {badge.title}
        </span>
        <span
          className={clsx(
            'mt-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular',
            locked ? 'bg-white/5 text-slate-500' : 'bg-white/10 text-white',
          )}
        >
          {badge.label}
        </span>
        {showProgress && badge.next && (
          <span className="mt-2 h-1 w-3/4 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <span
              className="block h-full rounded-full bg-volt"
              style={{ width: `${Math.round(badge.progress * 100)}%` }}
            />
          </span>
        )}
      </span>
    </button>
  )
}
