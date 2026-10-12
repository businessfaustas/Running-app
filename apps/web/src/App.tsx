import { addDays, toISODate } from '@grouppace/shared'
import { lazy, Suspense, useMemo } from 'react'
import { AppHeader } from './features/header/AppHeader'
import { matchesSportFilter } from './features/slots/meta'
import { useSlots } from './features/slots/useSlots'
import { Timeline } from './features/timeline/Timeline'
import { useTimelineStore } from './store/useTimelineStore'

const MapView = lazy(() => import('./features/map/MapView'))

const DAYS_AHEAD = 7

export function App() {
  const today = toISODate(new Date())
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today],
  )

  const selectedDate = useTimelineStore((s) => s.selectedDate)
  const sportFilter = useTimelineStore((s) => s.sportFilter)
  const view = useTimelineStore((s) => s.view)
  const selectedSlotId = useTimelineStore((s) => s.selectedSlotId)
  const setSelectedDate = useTimelineStore((s) => s.setSelectedDate)
  const setSportFilter = useTimelineStore((s) => s.setSportFilter)
  const setView = useTimelineStore((s) => s.setView)
  const toggleSlot = useTimelineStore((s) => s.toggleSlot)

  const slotsQuery = useSlots(days[0]!, days.at(-1)!)

  const visibleSlots = useMemo(
    () => (slotsQuery.data ?? []).filter((slot) => matchesSportFilter(slot.sportType, sportFilter)),
    [slotsQuery.data, sportFilter],
  )
  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const slot of visibleSlots) counts[slot.date] = (counts[slot.date] ?? 0) + 1
    return counts
  }, [visibleSlots])
  const daySlots = useMemo(
    () => visibleSlots.filter((slot) => slot.date === selectedDate),
    [visibleSlots, selectedDate],
  )

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-slate-950 sm:border-x sm:border-white/5">
      <AppHeader
        days={days}
        today={today}
        selectedDate={selectedDate}
        countsByDate={countsByDate}
        onSelectDate={setSelectedDate}
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        view={view}
        onViewChange={setView}
      />

      <main className="relative min-h-0 flex-1">
        {slotsQuery.isError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-white">Couldn't load workouts</p>
              <p className="mt-1 text-xs text-slate-400">{slotsQuery.error.message}</p>
              <button
                type="button"
                onClick={() => void slotsQuery.refetch()}
                className="mt-4 rounded-full bg-volt px-4 py-2 text-xs font-semibold text-slate-950 active:scale-95"
              >
                Try again
              </button>
            </div>
          </div>
        ) : view === 'timeline' ? (
          <Timeline
            date={selectedDate}
            slots={daySlots}
            isToday={selectedDate === today}
            isLoading={slotsQuery.isPending}
            selectedSlotId={selectedSlotId}
            onSelectSlot={toggleSlot}
          />
        ) : (
          <Suspense fallback={<div className="h-full animate-pulse bg-slate-900" />}>
            <MapView
              slots={daySlots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={toggleSlot}
              onOpenInTimeline={() => setView('timeline')}
            />
          </Suspense>
        )}
      </main>
    </div>
  )
}
