import { addDays, toISODate } from '@pacemates/shared'
import clsx from 'clsx'
import {
  CalendarClock,
  ChevronDown,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Plus,
  RotateCw,
} from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { CitySheet } from '../../components/CityPicker'
import { Logo } from '../../components/Logo'
import { useSession } from '../../data/auth'
import { useMe, useSlots, useUserSlots } from '../../data/hooks'
import { useCity } from '../../data/city'
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
  const city = useCity()
  const [cityOpen, setCityOpen] = useState(false)
  const slotsQuery = useSlots(days[0]!, days.at(-1)!, city)
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
    <div className="relative flex h-full flex-col">
      <header className="relative z-10 shrink-0 pt-[env(safe-area-inset-top)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-24 size-80 rounded-full bg-blue/25 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
          <Greeting />
          <div className="flex items-center gap-2">
            {session ? (
              <Link
                to="/inbox"
                aria-label="Pokalbiai"
                className="grid size-11 place-items-center rounded-full border border-white/[0.08] bg-surface text-white transition hover:bg-raised active:scale-95"
              >
                <MessageCircle className="size-5" aria-hidden />
              </Link>
            ) : (
              <Link
                to="/signin"
                className="rounded-full bg-white px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-black transition active:scale-95 max-[359px]:px-3"
              >
                Prisijungti
              </Link>
            )}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="relative px-5 pt-6 [@media(max-height:560px)]:pt-3">
          <div className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => setCityOpen(true)}
              aria-label={`Miestas: ${city.name}. Pakeisti`}
              className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface pr-2.5 pl-2 font-bold text-white transition hover:bg-raised active:scale-95"
            >
              <MapPin className="size-4 text-volt" aria-hidden />
              {city.name}
              <ChevronDown className="size-4 text-slate-400" aria-hidden />
            </button>
            {dayMonth(selectedDate)}
          </div>
          <h1 className="headline mt-3 text-[34px] [@media(max-height:560px)]:text-[26px]">
            {whenHeadline(selectedDate, today)}
            <span className="block text-volt">
              {visibleSlots.length} {plural(visibleSlots.length, WORDS.workout)}
            </span>
          </h1>
        </div>

        <div className="relative pt-5 pb-1 [@media(max-height:560px)]:pt-3">
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
        className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-5 pt-4 pb-3"
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
                'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-colors',
                active
                  ? 'bg-volt text-black'
                  : 'border border-white/[0.08] bg-surface text-slate-300 hover:text-white',
              )}
            >
              {filter.label}
              <span
                className={clsx(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular',
                  active ? 'bg-black/85 text-volt' : 'bg-white/10 text-slate-400',
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
              <p className="headline text-[21px]">Nepavyko įkelti</p>
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
            cityLocative={city.locative}
          />
        ) : (
          <Suspense fallback={<div className="h-full animate-pulse bg-surface" />}>
            <DiscoverMap
              slots={visibleSlots}
              focusedSlotId={focusedSlotId}
              onFocusSlot={focusSlot}
              roles={roles}
              center={city}
            />
          </Suspense>
        )}
      </main>

      {view === 'timeline' && (
        <Link
          to={`/workouts/new?date=${selectedDate}`}
          aria-label="Sukurti treniruotę"
          className="absolute right-5 bottom-[calc(var(--nav-space)+14px)] z-30 grid size-15 place-items-center rounded-full bg-volt text-black shadow-[0_12px_30px_rgb(212_255_63/0.35)] transition active:scale-95 motion-safe:animate-pop"
        >
          <Plus className="size-7" strokeWidth={2.6} aria-hidden />
        </Link>
      )}
      <CitySheet open={cityOpen} onClose={() => setCityOpen(false)} />
    </div>
  )
}

function Greeting() {
  const session = useSession()
  const me = useMe()
  if (!session) return <Logo className="text-white" size={22} compact />
  return (
    <Link to="/profile" aria-label="Tavo profilis" className="flex min-w-0 items-center gap-2.5">
      {me.data ? (
        <Avatar user={me.data} size={44} className="ring-2 ring-volt/70" />
      ) : (
        <span className="block size-11 rounded-full bg-raised" />
      )}
      <span className="min-w-0 leading-tight">
        <span className="block text-[12px] font-medium text-slate-400">{greeting()},</span>
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
    <div
      role="group"
      aria-label="Rodinys"
      className="flex rounded-full border border-white/[0.08] bg-surface p-1"
    >
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
            view === id ? 'bg-volt text-black' : 'text-slate-400 hover:text-white',
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </button>
      ))}
    </div>
  )
}
