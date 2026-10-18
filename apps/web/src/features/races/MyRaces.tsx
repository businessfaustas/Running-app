import { raceBySlug } from '@pacemates/shared/races'
import { Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { useUserRaces } from '../../data/hooks'
import { formatKm } from '../../lib/format'
import { countdown, raceWhen, todayISO } from './dates'
import { RACE_TYPE_META } from './meta'

/** The races someone has said they're going to, soonest first – a strip for the Plans tab. */
export function MyRaces({ userId }: { userId: string }) {
  const races = useUserRaces(userId)
  const today = todayISO()
  const items = (races.data ?? [])
    .flatMap(({ raceSlug, distanceKm }) => {
      const race = raceBySlug(raceSlug)
      return race ? [{ race, distanceKm, when: raceWhen(race, today) }] : []
    })
    .sort((a, b) => a.when.sortDate.localeCompare(b.when.sortDate))

  if (items.length === 0) return null

  return (
    <section className="mt-5">
      <h2 className="mb-2.5 flex items-baseline justify-between">
        <span className="headline text-[21px]">Tavo varžybos</span>
        <Link to="/races" className="text-[13px] font-bold text-volt">
          Kalendorius
        </Link>
      </h2>
      <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {items.map(({ race, distanceKm, when }) => {
          const meta = RACE_TYPE_META[race.type]
          const soon = countdown(when.daysUntil)
          return (
            <li key={race.slug} className="w-[230px] shrink-0">
              <Link
                to={`/races/${race.slug}`}
                className="flex h-full flex-col rounded-[22px] border border-white/[0.06] bg-surface p-3.5 transition active:scale-[0.98]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className="grid size-8 place-items-center rounded-full text-black"
                    style={{ backgroundColor: meta.accent }}
                  >
                    <meta.Icon className="size-4" aria-hidden />
                  </span>
                  {soon && (
                    <span className="rounded-full bg-volt px-2 py-0.5 text-[11px] font-bold text-black">
                      {soon}
                    </span>
                  )}
                </span>
                <span className="mt-2.5 line-clamp-2 text-[15px] leading-snug font-bold text-white">
                  {race.name}
                </span>
                <span className="mt-auto pt-1.5 text-[13px] text-slate-400">
                  {when.label}
                  {distanceKm ? ` · ${formatKm(distanceKm)} km` : ''}
                </span>
              </Link>
            </li>
          )
        })}
        <li className="w-[120px] shrink-0">
          <Link
            to="/races"
            className="flex h-full flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-white/15 p-3 text-center text-[13px] font-bold text-slate-400 hover:text-white"
          >
            <Trophy className="size-5 text-volt" aria-hidden />
            Daugiau varžybų
          </Link>
        </li>
      </ul>
    </section>
  )
}
