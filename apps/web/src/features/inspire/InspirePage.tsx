import { addDays, toISODate, type SlotSummary, type UserSummary } from '@pacemates/shared'
import clsx from 'clsx'
import {
  Calculator,
  ChevronRight,
  Lightbulb,
  Quote,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { ButtonLink } from '../../components/Button'
import { TextField } from '../../components/Field'
import { FUN_FACTS, quoteOfTheDay, TIPS } from '../../content/inspiration'
import { useSession } from '../../data/auth'
import { useSlots, useUserSlots } from '../../data/hooks'
import { countOf, formatKm, plural, WORDS } from '../../lib/format'
import { PHOTOS } from '../../lib/photos'
import { BadgeTile } from './BadgeTile'
import { computeBadges, paceFromTime, weekProgress } from './progress'

/** Workouts a week that count as "done" for the weekly challenge. */
const WEEKLY_GOAL = 3

export function InspirePage() {
  return (
    <div className="h-full overflow-y-auto pb-[calc(var(--nav-space)+20px)]">
      <QuoteHero />
      <div className="space-y-8 px-4 pt-6">
        <WeeklyChallenge />
        <FunFacts />
        <Badges />
        <PaceCalculator />
        <FuelingLink />
        <Tips />
        <TopHosts />
      </div>
    </div>
  )
}

function FuelingLink() {
  return (
    <Link
      to="/fueling"
      className="-mt-4 flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-blue to-blue-deep p-4 transition active:scale-[0.99]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-black">
        <Zap className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-white">Mitybos skaičiuoklė</span>
        <span className="block text-[13px] leading-snug text-white/75">
          Angliavandeniai, skysčiai ir druska varžyboms
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-white/70" aria-hidden />
    </Link>
  )
}

function SectionTitle({ Icon, children }: { Icon: typeof Quote; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-volt text-black">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="headline text-[26px]">{children}</span>
    </h2>
  )
}

function QuoteHero() {
  const [offset, setOffset] = useState(0)
  const quote = quoteOfTheDay(offset)
  return (
    <section className="relative flex min-h-[460px] flex-col overflow-hidden rounded-b-[32px] bg-black">
      <img
        src={PHOTOS.runCoast}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-90 motion-safe:animate-ken"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />
      <header className="relative px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <p className="text-[12px] font-bold tracking-[0.14em] text-white/70 uppercase">
          Kasdienė dozė
        </p>
        <h1 className="headline mt-1 text-[44px] text-white">Įkvėpimas</h1>
      </header>
      <div className="relative mt-auto px-5 pb-6">
        <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.14em] text-volt uppercase">
          <Quote className="size-3.5 fill-volt" aria-hidden />
          {offset === 0 ? 'Dienos mintis' : 'Dar viena mintis'}
        </p>
        <blockquote
          key={quote.text}
          className="mt-3 font-display text-[34px] leading-[1.02] font-bold text-white italic motion-safe:animate-rise"
        >
          „{quote.text}“
        </blockquote>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-white/75">
            {quote.author ? `– ${quote.author}` : '– PaceMates'}
          </p>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold text-white transition active:scale-95"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Kita mintis
          </button>
        </div>
      </div>
    </section>
  )
}

function WeeklyChallenge() {
  const session = useSession()
  const slots = useUserSlots(session?.userId)
  const today = toISODate(new Date())
  const week = weekProgress(slots.data ?? [], today)
  const done = Math.min(week.workouts, WEEKLY_GOAL)
  const left = WEEKLY_GOAL - done
  const daysLeft = Math.max(0, 6 - ((new Date().getDay() + 6) % 7))

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-blue p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-14 -bottom-16 size-56 rounded-full bg-volt/25 blur-2xl"
      />
      <p className="relative flex items-center gap-1.5 text-[12px] font-bold tracking-[0.14em] text-white/75 uppercase">
        <Target className="size-3.5" aria-hidden />
        Savaitės iššūkis
      </p>
      <h3 className="headline relative mt-2 text-[34px] text-white">
        {WEEKLY_GOAL} treniruotės <span className="text-volt">kartu</span>
      </h3>

      {session ? (
        <>
          <div className="relative mt-4 flex gap-1.5" aria-hidden>
            {Array.from({ length: WEEKLY_GOAL }, (_, i) => (
              <span
                key={i}
                className={clsx(
                  'h-3 flex-1 rounded-full transition-colors',
                  i < done ? 'bg-volt' : 'bg-white/20',
                )}
              />
            ))}
          </div>
          <p className="relative mt-3 text-[15px] font-semibold text-white">
            {left === 0
              ? 'Iššūkis įveiktas! Puikus darbas.'
              : `Dar ${countOf(left, WORDS.workout)} iki tikslo`}
          </p>
          <p className="relative mt-0.5 text-[13px] text-white/70">
            Šią savaitę: {countOf(week.workouts, WORDS.workout)}, {formatKm(week.km)} km
            {left > 0 && daysLeft > 0
              ? ` · liko ${daysLeft} ${plural(daysLeft, { one: 'diena', few: 'dienos', other: 'dienų' })}`
              : ''}
          </p>
          {left > 0 && (
            <ButtonLink to="/" variant="light" size="sm" className="relative mt-4">
              Rasti treniruotę
            </ButtonLink>
          )}
        </>
      ) : (
        <>
          <p className="relative mt-2 text-[14px] text-white/80">
            Prisijunk ir sek, kiek treniruočių su kitais įveiki per savaitę.
          </p>
          <ButtonLink
            to="/signin?next=/inspire"
            variant="light"
            size="sm"
            className="relative mt-4"
          >
            Prisijungti
          </ButtonLink>
        </>
      )}
    </section>
  )
}

function FunFacts() {
  return (
    <section>
      <SectionTitle Icon={Lightbulb}>Ar žinojai?</SectionTitle>
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4">
        {FUN_FACTS.map((fact, i) => (
          <article
            key={fact.figure + i}
            className={clsx(
              'flex w-[78%] max-w-[300px] shrink-0 snap-start flex-col rounded-[24px] p-5',
              i % 3 === 0 ? 'bg-volt text-black' : i % 3 === 1 ? 'bg-surface' : 'bg-raised',
            )}
          >
            <span
              className={clsx('headline text-[54px]', i % 3 === 0 ? 'text-black' : 'text-volt')}
            >
              {fact.figure}
            </span>
            <p
              className={clsx(
                'mt-3 text-[14.5px] leading-snug',
                i % 3 === 0 ? 'text-black/80' : 'text-slate-300',
              )}
            >
              {fact.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Badges() {
  const session = useSession()
  const slots = useUserSlots(session?.userId)
  const badges = useMemo(() => computeBadges(slots.data ?? []), [slots.data])
  const earned = badges.filter((b) => b.earned).length

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <SectionTitle Icon={Trophy}>Ženkliukai</SectionTitle>
        {session && (
          <span className="text-[13px] font-bold text-slate-400 tabular">
            {earned} iš {badges.length}
          </span>
        )}
      </div>
      {!session && (
        <p className="-mt-1 mb-4 text-[13px] text-slate-400">
          Prisijunk ir rink ženkliukus už bendras treniruotes.
        </p>
      )}
      <div className="grid grid-cols-3 gap-x-2 gap-y-5 rounded-[24px] bg-surface p-4 min-[420px]:grid-cols-4">
        {badges.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} />
        ))}
      </div>
    </section>
  )
}

const RACE_DISTANCES = [
  { km: 5, label: '5 km' },
  { km: 10, label: '10 km' },
  { km: 21.0975, label: 'Pusmaratonis' },
  { km: 42.195, label: 'Maratonas' },
]

/** "50:00" or "1:45:30" → seconds. */
function parseClock(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null
  const [h, m, s] = parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)]
  if (m! > 59 || s! > 59) return null
  return h! * 3600 + m! * 60 + s!
}

function formatClock(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
  return h ? `${h}:${mmss}` : mmss
}

function PaceCalculator() {
  const [distance, setDistance] = useState('10')
  const [time, setTime] = useState('55:00')
  const km = Number(distance.replace(',', '.'))
  const seconds = parseClock(time)
  const result = seconds ? paceFromTime(km, seconds) : null
  const timeError = time.trim() && seconds === null ? 'Rašyk mm:ss arba h:mm:ss' : null

  return (
    <section>
      <SectionTitle Icon={Calculator}>Tempo skaičiuoklė</SectionTitle>
      <div className="rounded-[24px] bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Atstumas"
            inputMode="decimal"
            suffix="km"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <TextField
            label="Laikas"
            inputMode="numeric"
            placeholder="55:00"
            value={time}
            error={timeError}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {RACE_DISTANCES.map((race) => (
            <button
              key={race.label}
              type="button"
              onClick={() => setDistance(formatKm(Math.round(race.km * 1000) / 1000))}
              className={clsx(
                'h-8 rounded-full px-3 text-[12px] font-bold transition-colors',
                Math.abs(km - race.km) < 0.001
                  ? 'bg-white text-black'
                  : 'bg-raised text-slate-300 hover:text-white',
              )}
            >
              {race.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Result label="Tempas" value={result?.pace ?? '–'} unit="/km" highlight />
          <Result label="Greitis" value={result?.speed ?? '–'} unit="km/h" />
        </div>

        {result && seconds && (
          <div className="mt-4">
            <p className="text-[12px] font-bold tracking-[0.12em] text-slate-500 uppercase">
              Tokiu tempu įveiktum
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
              {RACE_DISTANCES.map((race) => (
                <div key={race.label} className="flex justify-between gap-2">
                  <dt className="text-slate-400">{race.label}</dt>
                  <dd className="font-bold text-white tabular">
                    {formatClock((seconds / km) * race.km)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}

function Result({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string
  value: string
  unit: string
  highlight?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-[20px] px-4 py-3',
        highlight ? 'bg-volt text-black' : 'bg-raised text-white',
      )}
    >
      <p
        className={clsx(
          'text-[11px] font-bold tracking-wider uppercase',
          highlight ? 'text-black/60' : 'text-slate-500',
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 font-display text-[32px] leading-none font-bold italic tabular">
        {value}
        <span className="ml-1 text-[14px] not-italic opacity-60">{unit}</span>
      </p>
    </div>
  )
}

function Tips() {
  return (
    <section>
      <SectionTitle Icon={Lightbulb}>Patarimai grupėje</SectionTitle>
      <ol className="space-y-2">
        {TIPS.map((tip, i) => (
          <li key={tip.title} className="flex gap-3.5 rounded-[22px] bg-surface p-4">
            <span className="font-display text-[34px] leading-none font-bold text-blue italic tabular">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-[15px] font-bold text-white">{tip.title}</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-slate-400">
                {tip.text}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function TopHosts() {
  const today = toISODate(new Date())
  const slots = useSlots(today, addDays(today, 13))
  const hosts = useMemo(() => rankHosts(slots.data ?? []), [slots.data])
  if (hosts.length === 0) return null

  return (
    <section>
      <SectionTitle Icon={Trophy}>Aktyviausi organizatoriai</SectionTitle>
      <p className="-mt-1 mb-3 text-[13px] text-slate-400">
        Daugiausiai treniruočių per artimiausias dvi savaites.
      </p>
      <ol className="space-y-2">
        {hosts.map(({ host, count, people }, i) => (
          <li key={host.id}>
            <Link
              to={`/athletes/${host.id}`}
              className="flex items-center gap-3 rounded-[22px] bg-surface p-3 pr-4 transition active:scale-[0.99]"
            >
              <span
                className={clsx(
                  'grid size-8 shrink-0 place-items-center rounded-full font-display text-[17px] font-bold italic',
                  i === 0 ? 'bg-volt text-black' : 'bg-raised text-white',
                )}
              >
                {i + 1}
              </span>
              <Avatar user={host} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-white">{host.name}</span>
                <span className="block text-[12.5px] text-slate-400">
                  {countOf(count, WORDS.workout)} · {countOf(people, WORDS.person)}
                </span>
              </span>
              <ChevronRight className="size-5 text-slate-600" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function rankHosts(slots: SlotSummary[]) {
  const byHost = new Map<string, { host: UserSummary; count: number; people: number }>()
  for (const slot of slots) {
    if (slot.status === 'CANCELLED') continue
    const entry = byHost.get(slot.host.id) ?? { host: slot.host, count: 0, people: 0 }
    entry.count += 1
    entry.people += slot.participantCount
    byHost.set(slot.host.id, entry)
  }
  return [...byHost.values()].sort((a, b) => b.count - a.count || b.people - a.people).slice(0, 3)
}
