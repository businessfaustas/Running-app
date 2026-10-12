import { CalendarClock, Map as MapIcon } from 'lucide-react'
import { SegmentedControl } from '../../components/SegmentedControl'
import type { ViewMode } from '../../store/useTimelineStore'
import { SPORT_FILTERS, type SportFilter } from '../slots/meta'
import { DayScroller } from './DayScroller'

const VIEW_OPTIONS = [
  { id: 'timeline', label: 'Timeline', Icon: CalendarClock },
  { id: 'map', label: 'Map', Icon: MapIcon },
] as const

interface AppHeaderProps {
  days: string[]
  today: string
  selectedDate: string
  countsByDate: Record<string, number>
  onSelectDate: (date: string) => void
  sportFilter: SportFilter
  onSportFilterChange: (filter: SportFilter) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function AppHeader({
  days,
  today,
  selectedDate,
  countsByDate,
  onSelectDate,
  sportFilter,
  onSportFilterChange,
  view,
  onViewChange,
}: AppHeaderProps) {
  const count = countsByDate[selectedDate] ?? 0

  return (
    <header className="z-30 shrink-0 border-b border-white/5 bg-slate-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />
          <h1 className="text-lg font-extrabold tracking-tight">
            Group<span className="text-volt">Pace</span>
          </h1>
        </div>
        <SegmentedControl
          label="View"
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
          iconOnly
        />
      </div>

      <DayScroller
        days={days}
        today={today}
        selected={selectedDate}
        counts={countsByDate}
        onSelect={onSelectDate}
      />

      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-3">
        <SegmentedControl
          label="Sport"
          options={SPORT_FILTERS}
          value={sportFilter}
          onChange={onSportFilterChange}
        />
        <p className="text-xs text-slate-400" aria-live="polite">
          <span className="font-semibold text-slate-100 tabular-nums">{count}</span>{' '}
          {count === 1 ? 'beacon' : 'beacons'}
        </p>
      </div>
    </header>
  )
}
