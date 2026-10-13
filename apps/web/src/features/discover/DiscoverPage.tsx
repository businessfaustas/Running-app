import { addDays, toISODate } from '@pacemates/shared'
import clsx from 'clsx'
import { CalendarClock, Map as MapIcon, MapPin, Plus, Quote, RotateCw } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { quoteOfTheDay } from '../../content/inspiration'
import { useSession } from '../../data/auth'
import { useMe, useSlots, useUserSlots } from '../../data/hooks'
import { CITY } from '../../lib/city'
import { dayMonth, firstName, greeting, plural, whenHeadline, WORDS } from '../../lib/format'
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

  const quote = quoteOfTheDay()

  return (
    <div className="relative flex h-full flex-col">
      <header className="relative z-10 shrink-0 overflow-hidden rounded-b-[32px] bg-blue pt-[env(safe-area-inset-top)] shadow-[0_18px_40px_-18px_rgb(46_91_255/0.7)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex items-center justify-between gap-3 px-4 pt-3">
          <Greeting />
          <div className="flex items-center gap-2">
            {!session && (
              <Link
                to="/signin"
                className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-black transition active:scale-95"
              >
                Prisijungti
              </Link>
            )}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="relative px-4 pt-4">
          <p className="flex items-center gap-1 text-[12px] font-bold tracking-[0.14em] text-white/70 uppercase">
            <MapPin className="size-3.5" aria-hidden />
            {CITY.name} · {dayMonth(selectedDate)}
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="headline text-[46px] text-white">
              {whenHeadline(selectedDate, today)}
            </h1>
            <p className="pb-1 text-right leading-none">
              <span className="font-display text-[34px] font-bold text-volt italic tabular">
                {visibleSlots.length}
              </span>
              <span className="block text-[11px] font-bold tracking-wider text-white/70 uppercase">
                {plural(visibleSlots.length, WORDS.workout)}
              </span>
            </p>
          </div>
          <Link
            to="/inspire"
            className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] text-white/80 [@media(max-height:680px)]:hidden"
          >
            <Quote className="size-3.5 shrink-0 fill-volt text-volt" aria-hidden />
            <span className="truncate italic">{quote.text}</span>
          </Link>
        </div>

        <div className="relative pt-4 pb-5">
          <DayStrip
            days={days}
            today={today}
            selected={selectedDate}
            counts={countsByDate}
            onSelect={setSelectedDate}
          />
        </div>
      </header>

      <div
        role="group"
        aria-label="Sportas"
        className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-4 pt-3.5 pb-2"
      >
        {SPORT_FILTERS.map((filter) => {
          const active = filter.id === sportFilter
          const count = daySlots.filter((s) => matchesSportFilter(s.sportType, filter.id)).length
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSportFilter(filter.id)}
              className={clsx(
                'flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-colors',
                active ? 'bg-white text-black' : 'bg-raised text-slate-300 hover:text-white',
              )}
            >
              {filter.label}
              <span
                className={clsx(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular',
                  active ? 'bg-black text-volt' : 'bg-white/10 text-slate-400',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <main className="relative min-h-0 flex-1">
        {slotsQuery.isError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="headline text-[24px]">Nepavyko įkelti</p>
              <p className="mt-1 text-[13px] text-slate-400">{slotsQuery.error.message}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => slotsQuery.refetch()}
              >
                <RotateCw className="size-4" aria-hidden />
                Bandyti dar kartą
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

      {view === 'timeline' && (
        <Link
          to={`/workouts/new?date=${selectedDate}`}
          aria-label="Sukurti treniruotę"
          className="absolute right-4 bottom-[calc(var(--nav-space)+12px)] z-30 grid size-15 place-items-center rounded-full bg-volt text-black shadow-[0_12px_30px_rgb(212_255_63/0.35)] transition active:scale-95 motion-safe:animate-pop"
        >
          <Plus className="size-7" strokeWidth={2.6} aria-hidden />
        </Link>
      )}
    </div>
  )
}

function Greeting() {
  const session = useSession()
  const me = useMe()
  if (!session) return <Logo className="text-white" size={22} />
  return (
    <Link to="/profile" aria-label="Tavo profilis" className="flex min-w-0 items-center gap-2.5">
      {me.data ? (
        <Avatar user={me.data} size={42} className="ring-2 ring-white/40" />
      ) : (
        <span className="block size-[42px] rounded-full bg-white/20" />
      )}
      <span className="min-w-0 leading-tight">
        <span className="block text-[12px] font-medium text-white/75">{greeting()},</span>
        <span className="block truncate text-[16px] font-bold text-white">
          {me.data ? firstName(me.data.name) : '…'}
        </span>
      </span>
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
    { id: 'timeline' as const, label: 'Laiko juosta', Icon: CalendarClock },
    { id: 'map' as const, label: 'Žemėlapis', Icon: MapIcon },
  ]
  return (
    <div role="group" aria-label="Rodinys" className="glass flex rounded-full p-1">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={clsx(
            'grid size-9 place-items-center rounded-full transition-colors',
            view === id ? 'bg-white text-blue' : 'text-white/80 hover:text-white',
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </button>
      ))}
    </div>
  )
}
