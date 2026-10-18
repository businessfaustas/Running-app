import { toISODate } from '@pacemates/shared'
import clsx from 'clsx'
import { Crown, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useCity } from '../../data/city'
import { useLeaderboard } from '../../data/hooks'
import { countOf, firstName, WORDS } from '../../lib/format'
import {
  formatValue,
  METRICS,
  PERIODS,
  periodRange,
  rank,
  type Metric,
  type Period,
  type Ranked,
} from './ranking'

type Scope = 'city' | 'country'

export function LeaderboardPage() {
  const session = useSession()
  const city = useCity()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('run')
  const [scope, setScope] = useState<Scope>('city')
  const range = periodRange(period, toISODate(new Date()))
  const area = scope === 'city' ? city : null
  const board = useLeaderboard(range.from, range.to, area)

  const ranked = useMemo(() => rank(board.data ?? [], metric), [board.data, metric])
  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const mine = ranked.find((r) => r.entry.user.id === session?.userId)
  const metricInfo = METRICS.find((m) => m.id === metric)!

  return (
    <div className="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <section className="relative overflow-hidden rounded-b-[32px] bg-blue pb-5 shadow-[0_18px_40px_-18px_rgb(46_91_255/0.7)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <TopBar overlay fallback="/inspire" />
        <div className="relative px-5 pt-20">
          <p className="text-[12px] font-bold tracking-[0.14em] text-white/70 uppercase">
            {scope === 'city' ? city.name : 'Visa Lietuva'} · {range.label}
          </p>
          <h1 className="headline mt-1 text-[40px] text-white">{metricInfo.title}</h1>
        </div>

        <div className="relative mt-5 px-5">
          {board.isPending ? (
            <div className="h-44 animate-pulse rounded-[24px] bg-white/10" />
          ) : podium.length > 0 ? (
            <Podium podium={podium} metric={metric} myId={session?.userId} />
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="Laikotarpis"
          className="glass relative mx-5 mt-5 grid grid-cols-3 rounded-full p-1"
        >
          {PERIODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              onClick={() => setPeriod(id)}
              className={clsx(
                'h-10 rounded-full text-[13px] font-bold transition-colors',
                period === id ? 'bg-white text-black' : 'text-white/80 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="px-5 pt-5">
        <div
          role="group"
          aria-label="Kategorija"
          className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5"
        >
          {METRICS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={metric === id}
              onClick={() => setMetric(id)}
              className={clsx(
                'h-9 shrink-0 rounded-full px-5 text-[13px] font-bold whitespace-nowrap transition-colors',
                metric === id
                  ? 'bg-volt text-black'
                  : 'bg-surface text-slate-300 ring-1 ring-white/10 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Kur" className="mt-3 flex gap-2">
          {(
            [
              ['city', city.name],
              ['country', 'Visa Lietuva'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
              className={clsx(
                'h-8 rounded-full px-3.5 text-[12px] font-bold transition-colors',
                scope === id ? 'bg-white text-black' : 'bg-raised text-slate-400 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {board.isError ? (
          <ErrorState error={board.error} onRetry={() => board.refetch()} />
        ) : board.isPending ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[20px] bg-surface" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <EmptyState
            Icon={Trophy}
            title="Lentelė dar tuščia"
            action={<ButtonLink to="/">Rasti treniruotę</ButtonLink>}
          >
            {scope === 'city' ? city.locative : 'Lietuvoje'} šiuo laikotarpiu dar nėra įvykusių
            treniruočių šioje kategorijoje. Prisijunk prie grupės – ir būsi lentelėje.
          </EmptyState>
        ) : (
          <>
            {rest.length > 0 && (
              <ol className="mt-5 space-y-2.5">
                {rest.map((r) => (
                  <li key={r.entry.user.id}>
                    <Row ranked={r} metric={metric} mine={r.entry.user.id === session?.userId} />
                  </li>
                ))}
              </ol>
            )}
            {session && !mine && (
              <p className="mt-4 rounded-[20px] border border-dashed border-white/15 p-4 text-[13px] text-slate-400">
                Tavęs šioje lentelėje dar nėra. Kilometrai ir treniruotės įsiskaičiuoja, kai
                dalyvauji PaceMates treniruotėje ir ji įvyksta.
              </p>
            )}
          </>
        )}

        <p className="mt-6 px-1 text-[12px] leading-relaxed text-slate-600">
          Skaičiuojamos įvykusios PaceMates grupinės treniruotės, kuriose dalyvavai: jų distancija,
          kiek kartų sportavai ir kiek organizavai. Atšauktos neįsiskaičiuoja.
        </p>
      </div>
    </div>
  )
}

const MEDALS = ['#d4ff3f', '#cfd6e6', '#ffbe3d'] // first, second, third

function Podium({
  podium,
  metric,
  myId,
}: {
  podium: Ranked[]
  metric: Metric
  myId: string | undefined
}) {
  // Second, first, third – the classic shape.
  const order = [podium[1], podium[0], podium[2]]
  return (
    <ol className="grid grid-cols-3 items-end gap-2">
      {order.map((r, i) =>
        r ? (
          <li key={r.entry.user.id}>
            <Link
              to={`/athletes/${r.entry.user.id}`}
              className="flex flex-col items-center text-center"
            >
              <span className="relative">
                {r.rank === 1 && (
                  <Crown
                    className="absolute -top-6 left-1/2 size-6 -translate-x-1/2 fill-volt text-volt"
                    aria-hidden
                  />
                )}
                <span
                  className="block rounded-full p-[3px]"
                  style={{ backgroundColor: MEDALS[r.rank - 1] ?? MEDALS[1] }}
                >
                  <Avatar user={r.entry.user} size={r.rank === 1 ? 72 : 56} />
                </span>
                <span
                  className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full font-display text-[15px] font-bold text-black ring-2 ring-blue"
                  style={{ backgroundColor: MEDALS[r.rank - 1] ?? MEDALS[1] }}
                >
                  {r.rank}
                </span>
              </span>
              <span className="mt-2 w-full truncate text-[14px] font-bold text-white">
                {firstName(r.entry.user.name)}
                {r.entry.user.id === myId && <span className="text-volt"> (tu)</span>}
              </span>
              <span
                className={clsx(
                  'mt-1 w-full rounded-t-[16px] bg-white/12 pt-2 font-display font-bold text-white tabular',
                  r.rank === 1
                    ? 'h-20 text-[28px]'
                    : r.rank === 2
                      ? 'h-14 text-[22px]'
                      : 'h-11 text-[20px]',
                )}
              >
                <ValueText ranked={r} metric={metric} />
              </span>
            </Link>
          </li>
        ) : (
          <li key={i} aria-hidden />
        ),
      )}
    </ol>
  )
}

function ValueText({ ranked, metric }: { ranked: Ranked; metric: Metric }) {
  const { number, unit } = formatValue(ranked.value, metric)
  return (
    <>
      {number}
      {unit && <span className="ml-0.5 text-[0.55em] opacity-80">{unit}</span>}
    </>
  )
}

function Row({ ranked, metric, mine }: { ranked: Ranked; metric: Metric; mine: boolean }) {
  const { entry } = ranked
  return (
    <Link
      to={`/athletes/${entry.user.id}`}
      className={clsx(
        'flex items-center gap-3 rounded-[26px] p-3 pr-4 transition-colors',
        mine
          ? 'bg-lilac text-black'
          : 'border border-white/[0.07] bg-surface text-white hover:bg-raised',
      )}
    >
      <span
        className={clsx(
          'w-6 shrink-0 text-center font-display text-[16px] font-extrabold tabular',
          mine ? 'text-black/50' : 'text-slate-500',
        )}
      >
        {ranked.rank}
      </span>
      <Avatar user={entry.user} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-extrabold tracking-tight">
          {entry.user.name}
          {mine && ' (tu)'}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              mine ? 'bg-black text-volt' : 'bg-volt text-black',
            )}
          >
            {countOf(entry.workouts, WORDS.workout)}
          </span>
          {entry.hosted > 0 && (
            <span className={clsx('text-[12px]', mine ? 'text-black/60' : 'text-slate-500')}>
              organizavo {entry.hosted}
            </span>
          )}
        </span>
      </span>
      <span className="shrink-0 font-display text-[22px] font-extrabold tracking-tight tabular">
        <ValueText ranked={ranked} metric={metric} />
      </span>
    </Link>
  )
}
