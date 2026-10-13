import { fromISODate } from '@grouppace/shared'
import clsx from 'clsx'
import { longDay, weekday } from '../../lib/format'

interface DayStripProps {
  days: string[]
  today: string
  selected: string
  /** Number of (filtered) workouts per date, shown as dots. */
  counts: Record<string, number>
  onSelect: (date: string) => void
}

export function DayStrip({ days, today, selected, counts, onSelect }: DayStripProps) {
  return (
    <nav
      aria-label="Choose a day"
      className="scrollbar-none flex snap-x scroll-px-4 gap-1.5 overflow-x-auto px-4"
    >
      {days.map((date) => {
        const active = date === selected
        const count = counts[date] ?? 0
        return (
          <button
            key={date}
            type="button"
            aria-pressed={active}
            aria-label={`${longDay(date)}, ${count} workout${count === 1 ? '' : 's'}`}
            onClick={() => onSelect(date)}
            className={clsx(
              'flex w-12 shrink-0 snap-start flex-col items-center rounded-xl pt-1.5 pb-2 transition-colors duration-150',
              active ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white',
            )}
          >
            <span className="text-[11px] font-medium">
              {date === today ? 'Today' : weekday(date)}
            </span>
            <span
              className={clsx(
                'font-display text-[22px] leading-6 font-bold tabular',
                !active && 'text-zinc-100',
              )}
            >
              {fromISODate(date).getDate()}
            </span>
            <span aria-hidden className="mt-1 flex h-1 gap-0.5">
              {Array.from({ length: Math.min(count, 4) }, (_, i) => (
                <span
                  key={i}
                  className={clsx('size-1 rounded-full', active ? 'bg-black/60' : 'bg-volt')}
                />
              ))}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
