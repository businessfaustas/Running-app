import { addDays, fromISODate } from '@grouppace/shared'
import clsx from 'clsx'

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const fullDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, 1)) return 'Tomorrow'
  return weekday.format(fromISODate(date))
}

interface DayScrollerProps {
  days: string[]
  today: string
  selected: string
  /** Number of (filtered) workouts per date, shown as dots. */
  counts: Record<string, number>
  onSelect: (date: string) => void
}

export function DayScroller({ days, today, selected, counts, onSelect }: DayScrollerProps) {
  return (
    <nav
      aria-label="Choose a day"
      className="scrollbar-none flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4"
    >
      {days.map((date) => {
        const active = date === selected
        const count = counts[date] ?? 0
        return (
          <button
            key={date}
            type="button"
            aria-pressed={active}
            aria-label={`${fullDate.format(fromISODate(date))}, ${count} workout${count === 1 ? '' : 's'}`}
            onClick={() => onSelect(date)}
            className={clsx(
              'flex min-w-15 shrink-0 snap-start flex-col items-center rounded-2xl border px-3 pt-1.5 pb-2 transition duration-200 active:scale-95',
              active
                ? 'border-volt bg-volt text-slate-950 shadow-[0_0_20px_rgb(204_255_0/0.25)]'
                : 'border-white/5 bg-slate-900 text-slate-300 hover:border-white/15 hover:text-white',
            )}
          >
            <span className="text-[10px] font-semibold tracking-wider uppercase opacity-80">
              {dayLabel(date, today)}
            </span>
            <span className="text-lg leading-6 font-bold tabular-nums">
              {fromISODate(date).getDate()}
            </span>
            <span aria-hidden className="mt-0.5 flex h-1 gap-0.5">
              {Array.from({ length: Math.min(count, 4) }, (_, i) => (
                <span
                  key={i}
                  className={clsx('size-1 rounded-full', active ? 'bg-slate-950/70' : 'bg-volt/80')}
                />
              ))}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
