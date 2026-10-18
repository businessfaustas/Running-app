import type { Race } from '@pacemates/shared'
import { RACES } from '@pacemates/shared/races'
import clsx from 'clsx'
import { ChevronRight, MapPin, Search, Trophy, Users, X, Zap } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { useSession } from '../../data/auth'
import { useRaceCounts, useUserRaces } from '../../data/hooks'
import { countOf, formatKm, WORDS } from '../../lib/format'
import { countdown, monthHeading, raceWhen, todayISO, type RaceWhen } from './dates'
import { RACE_FILTERS, RACE_TYPE_META, type RaceFilter } from './meta'
import { racePhoto } from './photo'

interface Entry {
  race: Race
  when: RaceWhen
}

/** Lowercase without Lithuanian diacritics, so "kursiu" finds "Kuršių". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function RacesPage() {
  const session = useSession()
  const counts = useRaceCounts()
  const myRaces = useUserRaces(session?.userId)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RaceFilter>('ALL')
  const search = fold(useDeferredValue(query).trim())
  const today = todayISO()

  const entries = useMemo<Entry[]>(
    () =>
      RACES.map((race) => ({ race, when: raceWhen(race, today) })).sort(
        (a, b) =>
          a.when.sortDate.localeCompare(b.when.sortDate) || a.race.name.localeCompare(b.race.name),
      ),
    [today],
  )

  const mine = useMemo(
    () => new Map((myRaces.data ?? []).map((r) => [r.raceSlug, r.distanceKm])),
    [myRaces.data],
  )

  const visible = entries.filter(({ race }) => {
    if (filter === 'MINE' && !mine.has(race.slug)) return false
    const types = RACE_FILTERS.find((f) => f.id === filter)?.types
    if (types && !(types as readonly string[]).includes(race.type)) return false
    if (!search) return true
    return fold(
      `${race.name} ${race.city} ${race.region} ${RACE_TYPE_META[race.type].label}`,
    ).includes(search)
  })

  const groups = useMemo(() => {
    const byMonth = new Map<string, Entry[]>()
    for (const entry of visible) {
      const key = entry.when.sortDate.slice(0, 7)
      byMonth.set(key, [...(byMonth.get(key) ?? []), entry])
    }
    return [...byMonth.entries()]
  }, [visible])

  const browsing = filter === 'ALL' && !search
  const featured = browsing ? entries.find((e) => e.when.confirmed) : undefined
  const filters: { id: RaceFilter; label: string }[] = [
    RACE_FILTERS[0],
    ...(session
      ? [{ id: 'MINE' as const, label: `Mano${mine.size ? ` · ${mine.size}` : ''}` }]
      : []),
    ...RACE_FILTERS.slice(1),
  ]

  return (
    <div className="flex h-full flex-col">
      <PageHeader eyebrow="Lietuvos kalendorius" title="Varžybos" />

      <div className="shrink-0 space-y-3 px-5 pt-1 pb-3">
        <label className="relative block">
          <span className="sr-only">Ieškoti varžybų</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Varžybos, miestas ar regionas"
            enterKeyHint="search"
            className="h-12 w-full rounded-full border border-white/10 bg-surface pr-11 pl-11 text-[15px] text-white placeholder:text-slate-500 focus:border-blue focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Išvalyti paiešką"
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>

        <div
          role="group"
          aria-label="Varžybų tipas"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={clsx(
                'h-9 shrink-0 rounded-full px-5 text-[13px] font-bold whitespace-nowrap transition-colors',
                filter === id
                  ? 'bg-volt text-black'
                  : 'bg-surface text-slate-300 ring-1 ring-white/10 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--nav-space)+16px)]">
        {featured && <Featured entry={featured} going={counts.data?.[featured.race.slug] ?? 0} />}
        {browsing && <FuelingPromo />}

        {visible.length === 0 ? (
          filter === 'MINE' && !search ? (
            <EmptyState Icon={Trophy} title="Dar nieko nepasirinkai">
              Atidaryk varžybas ir pažymėk „Dalyvausiu“ – jos atsiras čia, o kiti dalyviai matys,
              kad ruošiesi kartu.
            </EmptyState>
          ) : (
            <EmptyState Icon={Search} title="Nieko neradome">
              Pabandyk kitą pavadinimą ar miestą, pvz., „Kuršių nerija“ arba „Vilnius“.
            </EmptyState>
          )
        ) : (
          groups.map(([key, items]) => (
            <section key={key} className="mt-6 first:mt-3">
              <h2 className="mb-2.5 flex items-baseline justify-between">
                <span className="headline text-[21px]">{monthHeading(`${key}-01`)}</span>
                <span className="text-[12px] font-bold text-slate-500">
                  {countOf(items.length, WORDS.race)}
                </span>
              </h2>
              <ul className="space-y-2.5">
                {items.map((entry) => (
                  <li key={entry.race.slug}>
                    <RaceRow
                      entry={entry}
                      going={counts.data?.[entry.race.slug] ?? 0}
                      myDistance={
                        mine.has(entry.race.slug) ? (mine.get(entry.race.slug) ?? null) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="mt-8 px-2 text-center text-[12px] leading-relaxed text-slate-600">
          Datos ir distancijos – iš organizatorių skelbimų. Prieš registraciją pasitikrink
          oficialioje svetainėje.
        </p>
      </div>
    </div>
  )
}

function DateBadge({ when }: { when: RaceWhen }) {
  const month = Number(when.sortDate.slice(5, 7))
  return (
    <span
      className={clsx(
        'flex size-14 shrink-0 flex-col items-center justify-center rounded-[16px] leading-none',
        when.confirmed ? 'bg-volt text-black' : 'bg-raised text-slate-300',
      )}
    >
      <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">
        {SHORT_MONTHS[month - 1]}
      </span>
      <span className="mt-1 font-display text-[22px] font-bold tabular">
        {when.confirmed ? Number(when.sortDate.slice(8)) : '?'}
      </span>
    </span>
  )
}

const SHORT_MONTHS = [
  'sau',
  'vas',
  'kov',
  'bal',
  'geg',
  'bir',
  'lie',
  'rgp',
  'rgs',
  'spa',
  'lap',
  'grd',
]

function RaceRow({
  entry: { race, when },
  going,
  myDistance,
}: {
  entry: Entry
  going: number
  /** Undefined when not going; null when going without picking a course. */
  myDistance: number | null | undefined
}) {
  const meta = RACE_TYPE_META[race.type]
  const soon = countdown(when.daysUntil)
  return (
    <Link
      to={`/races/${race.slug}`}
      className="flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface p-3 transition-colors hover:bg-raised active:scale-[0.99]"
    >
      <DateBadge when={when} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
          <meta.Icon className="size-3.5" style={{ color: meta.accent }} aria-hidden />
          <span style={{ color: meta.accent }}>{meta.label}</span>
          {soon && <span className="text-slate-400">· {soon}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[16px] font-bold text-white">{race.name}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-slate-400">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {race.city} · {race.distances.map(formatKm).join(' / ')} km
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {myDistance !== undefined ? (
          <span className="rounded-full bg-volt px-2 py-0.5 text-[11px] font-bold text-black">
            {myDistance ? `${formatKm(myDistance)} km` : 'Dalyvauji'}
          </span>
        ) : going > 0 ? (
          <span className="flex items-center gap-1 text-[12px] font-bold text-slate-300 tabular">
            <Users className="size-3.5 text-slate-500" aria-hidden />
            {going}
          </span>
        ) : null}
        <ChevronRight className="size-4 text-slate-600" aria-hidden />
      </span>
    </Link>
  )
}

/** The next race with a confirmed date, as a photo card. */
function Featured({ entry: { race, when }, going }: { entry: Entry; going: number }) {
  const meta = RACE_TYPE_META[race.type]
  const soon = countdown(when.daysUntil)
  return (
    <Link
      to={`/races/${race.slug}`}
      className="relative mt-1 flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[28px] p-4"
    >
      <img src={racePhoto(race)} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/0" />
      <span className="absolute top-4 left-4 rounded-full bg-volt px-3 py-1 text-[11px] font-bold tracking-wider text-black uppercase">
        {soon ? `Artimiausios · ${soon}` : 'Artimiausios'}
      </span>
      <span className="relative">
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-white/80 uppercase">
          <meta.Icon className="size-3.5" aria-hidden />
          {meta.label} · {when.label}
        </span>
        <span className="headline mt-1 block text-[34px] text-white">{race.name}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/80">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {race.city}
          </span>
          <span>{race.distances.map(formatKm).join(' / ')} km</span>
          {going > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {countOf(going, WORDS.person)}
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}

function FuelingPromo() {
  return (
    <Link
      to="/fueling"
      className="mt-3 flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-blue to-blue-deep p-4 shadow-[0_14px_30px_-16px_rgb(46_91_255/0.8)] transition active:scale-[0.99]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-black">
        <Zap className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-white">Mitybos skaičiuoklė</span>
        <span className="block text-[13px] leading-snug text-white/75">
          Kiek angliavandenių ir kada valgyti per varžybas
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-white/70" aria-hidden />
    </Link>
  )
}
