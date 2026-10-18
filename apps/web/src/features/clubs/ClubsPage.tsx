import type { Club } from '@pacemates/shared'
import { CLUBS } from '@pacemates/shared/clubs'
import clsx from 'clsx'
import { ChevronDown, ChevronRight, MapPin, Search, UsersRound } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { CitySheet } from '../../components/CityPicker'
import { EmptyState } from '../../components/EmptyState'
import { TopBar } from '../../components/TopBar'
import { useCity } from '../../data/city'
import { CLUB_FILTERS, CLUB_TYPE_META, fold } from './meta'

type Scope = 'city' | 'country'

export function ClubsPage() {
  const city = useCity()
  const [cityOpen, setCityOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('city')
  const [type, setType] = useState<(typeof CLUB_FILTERS)[number]['id']>('ALL')
  const [query, setQuery] = useState('')
  const search = fold(useDeferredValue(query).trim())

  const shown = useMemo(
    () =>
      CLUBS.filter((club) => scope === 'country' || club.city === city.name)
        .filter((club) => type === 'ALL' || club.types.includes(type))
        .filter(
          (club) =>
            !search || fold(`${club.name} ${club.city} ${club.description}`).includes(search),
        )
        .sort((a, b) => a.city.localeCompare(b.city, 'lt') || a.name.localeCompare(b.name, 'lt')),
    [city.name, scope, search, type],
  )

  // Across the country, group by town.
  const groups = useMemo(() => {
    const byCity = new Map<string, Club[]>()
    for (const club of shown) byCity.set(club.city, [...(byCity.get(club.city) ?? []), club])
    return [...byCity.entries()]
  }, [shown])

  return (
    <div className="flex h-full flex-col">
      <TopBar fallback="/inspire" title="Klubai" />
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <header className="px-4 pt-4">
          <p className="text-[12px] font-bold tracking-[0.14em] text-slate-500 uppercase">
            Bėk ir mink su savais
          </p>
          <h1 className="headline mt-1 text-[40px]">Vietiniai klubai</h1>
          <p className="mt-1 text-[14px] leading-snug text-slate-400">
            Bėgimo, triatlono ir dviračių klubai, kurie laukia naujokų. Pasirink ir susisiek.
          </p>
        </header>

        <div className="space-y-3 px-4 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setScope('city')
                setCityOpen(true)
              }}
              aria-label={`Miestas: ${city.name}. Pakeisti`}
              className={clsx(
                'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors',
                scope === 'city' ? 'bg-white text-black' : 'bg-raised text-slate-300',
              )}
            >
              <MapPin className="size-4" aria-hidden />
              {city.name}
              <ChevronDown className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={scope === 'country'}
              onClick={() => setScope(scope === 'country' ? 'city' : 'country')}
              className={clsx(
                'h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors',
                scope === 'country' ? 'bg-white text-black' : 'bg-raised text-slate-300',
              )}
            >
              Visa Lietuva
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">Ieškoti klubo</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Klubo pavadinimas"
              className="h-12 w-full rounded-full border border-white/10 bg-surface pr-4 pl-11 text-[15px] text-white placeholder:text-slate-500 focus:border-blue focus:outline-none"
            />
          </label>

          <div
            role="group"
            aria-label="Sportas"
            className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4"
          >
            {CLUB_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={type === id}
                onClick={() => setType(id)}
                className={clsx(
                  'h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors',
                  type === id
                    ? 'bg-volt text-black'
                    : 'bg-surface text-slate-300 ring-1 ring-white/10 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-2">
          {shown.length === 0 ? (
            <EmptyState
              Icon={UsersRound}
              title="Klubų nerasta"
              action={
                scope === 'city' ? (
                  <Button variant="secondary" onClick={() => setScope('country')}>
                    Rodyti visą Lietuvą
                  </Button>
                ) : undefined
              }
            >
              {scope === 'city' && !search
                ? `${city.locative} kol kas neturime klubų sąraše. Pažiūrėk artimiausius miestus.`
                : 'Pabandyk kitą pavadinimą arba sportą.'}
            </EmptyState>
          ) : scope === 'country' ? (
            groups.map(([town, clubs]) => (
              <section key={town} className="mt-5">
                <h2 className="headline mb-2.5 text-[24px]">{town}</h2>
                <ClubList clubs={clubs} />
              </section>
            ))
          ) : (
            <div className="mt-4">
              <ClubList clubs={shown} />
            </div>
          )}

          <p className="mt-8 px-1 text-[12px] leading-relaxed text-slate-600">
            Sąrašas sudarytas iš klubų viešai skelbiamos informacijos. Tvarkaraščiai keičiasi –
            prieš pirmą treniruotę pasitikrink klubo puslapyje.
          </p>
        </div>
      </div>
      <CitySheet open={cityOpen} onClose={() => setCityOpen(false)} />
    </div>
  )
}

function ClubList({ clubs }: { clubs: Club[] }) {
  return (
    <ul className="space-y-2.5">
      {clubs.map((club) => (
        <li key={club.slug}>
          <Link
            to={`/clubs/${club.slug}`}
            className="flex gap-3 rounded-[22px] border border-white/[0.06] bg-surface p-3.5 transition-colors hover:bg-raised active:scale-[0.99]"
          >
            <span className="flex shrink-0 flex-col gap-1">
              {club.types.map((t) => {
                const meta = CLUB_TYPE_META[t]
                return (
                  <span
                    key={t}
                    className="grid size-9 place-items-center rounded-full text-black"
                    style={{ backgroundColor: meta.accent }}
                    title={meta.label}
                  >
                    <meta.Icon className="size-4" aria-hidden />
                  </span>
                )
              })}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] leading-snug font-bold text-white">
                {club.name}
              </span>
              <span className="mt-0.5 block text-[12px] font-bold tracking-wider text-slate-500 uppercase">
                {club.types.map((t) => CLUB_TYPE_META[t].label).join(' · ')} · {club.city}
              </span>
              <span className="mt-1.5 line-clamp-2 block text-[13px] leading-snug text-slate-400">
                {club.description}
              </span>
              {(club.level || club.membership) && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {[club.level, club.membership].filter(Boolean).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-bold text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <ChevronRight className="mt-2 size-5 shrink-0 text-slate-600" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}
