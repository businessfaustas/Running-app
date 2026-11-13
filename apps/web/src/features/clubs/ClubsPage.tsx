import type { Club, CommunityClub } from '@pacemates/shared'
import { CLUBS } from '@pacemates/shared/clubs'
import clsx from 'clsx'
import {
  ArrowUpRight,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Plus,
  Search,
  UsersRound,
  X,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { useCity } from '../../data/city'
import { useCommunityClubs } from '../../data/hooks'
import { countOf, WORDS } from '../../lib/format'
import { ClubBadge, PendingBadge } from './ClubBadge'
import { CLUB_FILTERS, CLUB_TYPE_META, fold } from './meta'

const ALL = 'Visa Lietuva'

type ListedClub = Club & { status?: CommunityClub['status'] }

/** Towns that have clubs, most clubs first. */
const townsOf = (clubs: Club[]) =>
  [...new Set(clubs.map((club) => club.city))]
    .map((name) => ({ name, count: clubs.filter((club) => club.city === name).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'lt'))

/** The clubs tab: pick a town and see every club there in full. */
export function ClubsPage() {
  const city = useCity()
  const community = useCommunityClubs()
  // The listed clubs, plus the ones people added (yours show up while they wait for review).
  const clubs = useMemo<ListedClub[]>(
    () => [
      ...CLUBS,
      ...(community.data ?? []).filter((c) => !CLUBS.some((l) => l.slug === c.slug)),
    ],
    [community.data],
  )
  const towns = useMemo(() => townsOf(clubs), [clubs])
  // Start in the person's town when it has clubs.
  const [town, setTown] = useState(() =>
    townsOf(CLUBS).some((t) => t.name === city.name) ? city.name : ALL,
  )
  const [type, setType] = useState<(typeof CLUB_FILTERS)[number]['id']>('ALL')
  const [query, setQuery] = useState('')
  const search = fold(useDeferredValue(query).trim())

  const shown = useMemo(
    () =>
      clubs
        .filter((club) => town === ALL || club.city === town)
        .filter((club) => type === 'ALL' || club.types.includes(type))
        .filter(
          (club) =>
            !search || fold(`${club.name} ${club.city} ${club.description}`).includes(search),
        )
        .sort((a, b) => a.city.localeCompare(b.city, 'lt') || a.name.localeCompare(b.name, 'lt')),
    [clubs, town, search, type],
  )

  // Across the country, group by town.
  const groups = useMemo(() => {
    const byCity = new Map<string, ListedClub[]>()
    for (const club of shown) byCity.set(club.city, [...(byCity.get(club.city) ?? []), club])
    return [...byCity.entries()]
  }, [shown])

  return (
    <div className="flex h-full flex-col">
      <PageHeader eyebrow="Bėgimas · triatlonas · dviračiai" title="Klubai" />

      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--nav-space)+20px)]">
        <section aria-label="Miestas" className="pt-2">
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-5">
            {[{ name: ALL, count: clubs.length }, ...towns].map(({ name, count }) => {
              const active = town === name
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTown(name)}
                  className={clsx(
                    'flex h-[72px] min-w-[92px] shrink-0 flex-col items-start justify-center rounded-[20px] px-3.5 text-left transition-colors active:scale-[0.97]',
                    active
                      ? 'bg-volt text-black'
                      : 'border border-white/[0.08] bg-surface text-white hover:bg-raised',
                  )}
                >
                  <MapPin
                    className={clsx('size-4', active ? 'text-black' : 'text-volt')}
                    aria-hidden
                  />
                  <span className="mt-1 text-[14px] leading-tight font-extrabold whitespace-nowrap">
                    {name}
                  </span>
                  <span
                    className={clsx(
                      'text-[12px] font-semibold tabular',
                      active ? 'text-black/60' : 'text-slate-500',
                    )}
                  >
                    {countOf(count, WORDS.club)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="space-y-3 px-5 pt-4">
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
            aria-label="Sportas"
            className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5"
          >
            {CLUB_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={type === id}
                onClick={() => setType(id)}
                className={clsx(
                  'h-10 shrink-0 rounded-full px-4 text-[14px] font-bold transition-colors',
                  type === id
                    ? 'bg-white text-black'
                    : 'border border-white/[0.08] bg-surface text-slate-300 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-2">
          {shown.length === 0 ? (
            <EmptyState
              Icon={UsersRound}
              title="Klubų nerasta"
              action={
                town !== ALL ? (
                  <Button variant="secondary" onClick={() => setTown(ALL)}>
                    Rodyti visą Lietuvą
                  </Button>
                ) : (
                  <ButtonLink to="/clubs/new" variant="secondary">
                    <Plus className="size-4" aria-hidden />
                    Pridėti klubą
                  </ButtonLink>
                )
              }
            >
              Pabandyk kitą pavadinimą, sportą ar miestą – arba pridėk klubą, kurio dar nėra.
            </EmptyState>
          ) : town === ALL ? (
            groups.map(([name, clubs]) => (
              <section key={name} className="mt-6">
                <h2 className="mb-3 flex items-baseline justify-between">
                  <span className="headline text-[24px]">{name}</span>
                  <span className="text-[13px] font-bold text-slate-500 tabular">
                    {clubs.length}
                  </span>
                </h2>
                <ClubList clubs={clubs} />
              </section>
            ))
          ) : (
            <div className="mt-4">
              <h2 className="sr-only">{town}</h2>
              <ClubList clubs={shown} />
            </div>
          )}

          <div className="mt-8 flex items-center gap-3 rounded-[26px] border border-dashed border-white/15 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-raised text-volt">
              <UsersRound className="size-5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-slate-300">
              <span className="block font-bold text-white">Nerandi savo klubo?</span>
              Pridėk jį – peržiūrėję parodysime visiems.
            </p>
            <ButtonLink to="/clubs/new" size="sm">
              <Plus className="size-4" aria-hidden />
              Pridėti
            </ButtonLink>
          </div>

          <p className="mt-6 px-1 text-[12px] leading-relaxed text-slate-600">
            Sąrašas sudarytas iš klubų viešai skelbiamos informacijos. Tvarkaraščiai keičiasi –
            prieš pirmą treniruotę pasitikrink klubo puslapyje.
          </p>
        </div>
      </div>
    </div>
  )
}

function ClubList({ clubs }: { clubs: ListedClub[] }) {
  return (
    <ul className="stagger space-y-3">
      {clubs.map((club) => (
        <li key={club.slug}>
          <ClubCard club={club} />
        </li>
      ))}
    </ul>
  )
}

/** Everything about a club at a glance: what, when, where, for whom, and how to reach them. */
function ClubCard({ club }: { club: ListedClub }) {
  const links = [
    club.website && { href: club.website, label: 'Svetainė' },
    club.facebook && { href: club.facebook, label: 'Facebook' },
    club.instagram && { href: club.instagram, label: 'Instagram' },
    club.strava && { href: club.strava, label: 'Strava' },
  ].filter((link): link is { href: string; label: string } => Boolean(link))

  return (
    <article className="rounded-[26px] border border-white/[0.07] bg-surface p-4">
      <header className="flex items-start gap-3">
        <ClubBadge club={club} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-snug font-extrabold tracking-tight text-white">
            <Link to={`/clubs/${club.slug}`} className="hover:underline">
              {club.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-[12px] font-bold tracking-wider text-slate-500 uppercase">
            {club.types.map((t) => CLUB_TYPE_META[t].label).join(' · ')} · {club.city}
            {club.founded ? ` · nuo ${club.founded}` : ''}
          </p>
          {club.status === 'PENDING' && <PendingBadge />}
        </div>
      </header>

      <p className="mt-3 text-[14px] leading-relaxed text-slate-300">{club.description}</p>

      {(club.schedule.length > 0 || club.meetingPlace) && (
        <ul className="mt-3 space-y-2 rounded-[18px] bg-raised/60 p-3">
          {club.schedule.map((line) => (
            <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-slate-100">
              <Clock className="mt-px size-4 shrink-0 text-volt" aria-hidden />
              {line}
            </li>
          ))}
          {club.meetingPlace && (
            <li className="flex gap-2.5 text-[13px] leading-snug text-slate-100">
              <MapPin className="mt-px size-4 shrink-0 text-volt" aria-hidden />
              {club.meetingPlace}
            </li>
          )}
        </ul>
      )}

      {(club.level || club.membership) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {club.level && (
            <span className="rounded-full bg-volt/15 px-2.5 py-1 text-[12px] font-bold text-volt">
              {club.level}
            </span>
          )}
          {club.membership && (
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[12px] font-bold text-slate-200">
              {club.membership}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {links.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full bg-raised px-3.5 text-[13px] font-bold text-white transition hover:bg-[#2a2a2e] active:scale-95"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {label}
          </a>
        ))}
        {club.email && (
          <a
            href={`mailto:${club.email}`}
            className="flex h-9 items-center gap-1.5 rounded-full bg-raised px-3.5 text-[13px] font-bold text-white transition hover:bg-[#2a2a2e] active:scale-95"
          >
            <Mail className="size-3.5" aria-hidden />
            Laiškas
          </a>
        )}
        <Link
          to={`/clubs/${club.slug}`}
          className="ml-auto flex h-9 items-center gap-1 rounded-full bg-volt px-3.5 text-[13px] font-bold text-black transition active:scale-95"
        >
          Nuotraukos ir žemėlapis
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
