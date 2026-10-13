import { addDays, toISODate } from '@grouppace/shared'
import clsx from 'clsx'
import { CalendarClock, Map as MapIcon, RotateCw } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { useSession } from '../../data/auth'
import { useMe, useSlots, useUserSlots } from '../../data/hooks'
import { longDay } from '../../lib/format'
import { matchesSportFilter, SPORT_FILTERS } from '../slots/meta'
import { DayStrip } from './DayStrip'
import { useDiscoverStore, type DiscoverView } from './store'
import { Timeline } from './Timeline'

const DiscoverMap = lazy(() => import('./DiscoverMap'))

const DAYS_AHEAD = 14

export function DiscoverPage() {
  const today = toISODate(new Date())
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today],
  )

  const { selectedDate, sportFilter, view, focusedSlotId } = useDiscoverStore()
  const { setSelectedDate, setSportFilter, setView, focusSlot } = useDiscoverStore()

  const session = useSession()
  const slotsQuery = useSlots(days[0]!, days.at(-1)!)
  const mySlots = useUserSlots(session?.userId)

  const roles = useMemo(
    () => new Map((mySlots.data ?? []).map(({ slot, role }) => [slot.id, role])),
    [mySlots.data],
  )
  const daySlots = useMemo(
    () => (slotsQuery.data ?? []).filter((slot) => slot.date === selectedDate),
    [slotsQuery.data, selectedDate],
  )
  const visibleSlots = useMemo(
    () => daySlots.filter((slot) => matchesSportFilter(slot.sportType, sportFilter)),
    [daySlots, sportFilter],
  )
  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const slot of slotsQuery.data ?? []) {
      if (matchesSportFilter(slot.sportType, sportFilter)) {
        counts[slot.date] = (counts[slot.date] ?? 0) + 1
      }
    }
    return counts
  }, [slotsQuery.data, sportFilter])

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
          <Link to="/" className="flex items-center gap-2" aria-label="GroupPace home">
            <img src="/icon.svg" alt="" className="size-7 rounded-lg" />
            <span className="text-[17px] font-bold tracking-tight">GroupPace</span>
          </Link>
          <AccountButton />
        </div>

        <DayStrip
          days={days}
          today={today}
          selected={selectedDate}
          counts={countsByDate}
          onSelect={setSelectedDate}
        />

        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-3">
          <div role="group" aria-label="Sport" className="flex gap-1.5">
            {SPORT_FILTERS.map((filter) => {
              const active = filter.id === sportFilter
              const count = daySlots.filter((s) =>
                matchesSportFilter(s.sportType, filter.id),
              ).length
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSportFilter(filter.id)}
                  className={clsx(
                    'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                    active
                      ? 'border-zinc-100 bg-zinc-100 text-black'
                      : 'border-line text-zinc-300 hover:border-zinc-600',
                  )}
                >
                  {filter.label}
                  <span className={clsx('tabular', active ? 'text-black/50' : 'text-zinc-500')}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </header>

      <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
        <h1 className="font-display text-xl font-bold tracking-wide uppercase">
          {longDay(selectedDate)}
        </h1>
        <span className="text-[13px] text-zinc-500 tabular">
          {visibleSlots.length} {visibleSlots.length === 1 ? 'workout' : 'workouts'}
        </span>
      </div>

      <main className="relative min-h-0 flex-1">
        {slotsQuery.isError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-white">Couldn't load workouts</p>
              <p className="mt-1 text-[13px] text-zinc-400">{slotsQuery.error.message}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => slotsQuery.refetch()}
              >
                <RotateCw className="size-4" aria-hidden />
                Try again
              </Button>
            </div>
          </div>
        ) : view === 'timeline' ? (
          <Timeline
            date={selectedDate}
            slots={visibleSlots}
            isToday={selectedDate === today}
            isLoading={slotsQuery.isPending}
            focusedSlotId={focusedSlotId}
            roles={roles}
          />
        ) : (
          <Suspense fallback={<div className="h-full animate-pulse bg-surface" />}>
            <DiscoverMap
              slots={visibleSlots}
              focusedSlotId={focusedSlotId}
              onFocusSlot={focusSlot}
              roles={roles}
            />
          </Suspense>
        )}
      </main>
    </div>
  )
}

function AccountButton() {
  const session = useSession()
  const me = useMe()
  if (!session) {
    return (
      <Link
        to="/signin"
        className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:border-zinc-500"
      >
        Sign in
      </Link>
    )
  }
  return (
    <Link to="/profile" aria-label="Your profile" className="rounded-full">
      {me.data ? (
        <Avatar user={me.data} size={32} />
      ) : (
        <span className="block size-8 rounded-full bg-raised" />
      )}
    </Link>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: DiscoverView
  onChange: (v: DiscoverView) => void
}) {
  const options = [
    { id: 'timeline' as const, label: 'Timeline', Icon: CalendarClock },
    { id: 'map' as const, label: 'Map', Icon: MapIcon },
  ]
  return (
    <div role="group" aria-label="View" className="flex rounded-full border border-line p-0.5">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={clsx(
            'grid h-7 w-9 place-items-center rounded-full transition-colors',
            view === id ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:text-white',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}
