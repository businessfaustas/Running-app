import { fromISODate } from '@pacemates/shared'
import clsx from 'clsx'
import { countOf, longDay, weekday, WORDS } from '../../lib/format'

interface DayStripProps {
  days: string[]
  today: string
  selected: string
  /** Number of (filtered) workouts per date, shown as dots. */
  counts: Record<string, number>
  onSelect: (date: string) => void
}

/** Tall day pills on the blue header; the chosen day turns volt. */
export function DayStrip({ days, today, selected, counts, onSelect }: DayStripProps) {
  return (
    <nav
      aria-label="Pasirink dieną"
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
            aria-label={`${longDay(date)}, ${countOf(count, WORDS.workout)}`}
            onClick={() => onSelect(date)}
            className={clsx(
              'flex h-[70px] w-[52px] shrink-0 snap-start flex-col items-center justify-center rounded-full transition-all duration-200 active:scale-95',
              active
                ? 'bg-volt text-black shadow-[0_10px_28px_rgb(212_255_63/0.35)]'
                : 'bg-white/[0.13] text-white hover:bg-white/20',
              !active && date === today && 'ring-2 ring-white/50',
            )}
          >
            <span className={clsx('text-[11px] font-bold', !active && 'text-white/70')}>
              {weekday(date)}
            </span>
            <span className="font-display text-[23px] leading-6 font-bold tabular">
              {fromISODate(date).getDate()}
            </span>
            <span aria-hidden className="mt-0.5 flex h-1 gap-0.5">
              {Array.from({ length: Math.min(count, 3) }, (_, i) => (
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
