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

/** Day tiles: weekday over a big date; the chosen day turns volt. */
export function DayStrip({ days, today, selected, counts, onSelect }: DayStripProps) {
  return (
    <nav
      aria-label="Pasirink dieną"
      className="scrollbar-none flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5"
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
              'flex h-[76px] w-[58px] shrink-0 snap-start flex-col items-center justify-center rounded-[20px] transition-all duration-200 active:scale-95',
              active
                ? 'bg-volt text-black shadow-[0_10px_28px_rgb(212_255_63/0.25)]'
                : 'border border-white/[0.08] bg-surface text-white hover:bg-raised',
              !active && date === today && 'border-volt/50',
            )}
          >
            <span className={clsx('text-[12px] font-semibold', !active && 'text-slate-400')}>
              {weekday(date)}
            </span>
            <span className="mt-0.5 font-display text-[22px] leading-6 font-extrabold tracking-tight tabular">
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
