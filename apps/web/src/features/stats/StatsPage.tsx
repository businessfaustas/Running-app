import { icsForWorkouts } from './calendar'
import { TrendingUp, CalendarPlus, Flame, Route, Medal } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { CountUp } from '../../components/CountUp'
import { EmptyState } from '../../components/EmptyState'
import { PlusBadge } from '../../components/PlusBadge'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useEntitlements, useUserSlots } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { todayISO } from '../../lib/clock'
import { downloadText } from '../../lib/download'
import { formatKm, countOf, WORDS } from '../../lib/format'
import { toast } from '../../lib/toast'
import { usePageMeta } from '../../lib/usePageMeta'
import { UpgradeCard } from '../plus/UpgradeCard'
import { computeStats, type Stats } from './stats'

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('lt-LT', { day: 'numeric', month: 'long' }).format(
    new Date(`${iso}T12:00:00`),
  )

export function StatsPage() {
  usePageMeta({ title: 'Statistika', noindex: true })
  const session = useSession()!
  const { entitlements, isLoading } = useEntitlements()
  const slots = useUserSlots(session.userId)
  const today = todayISO()
  const stats = useMemo(
    () => computeStats(slots.data ?? [], today, session.userId),
    [slots.data, today, session.userId],
  )
  const upcoming = useMemo(
    () =>
      (slots.data ?? []).filter(({ slot }) => slot.status !== 'CANCELLED' && slot.date >= today),
    [slots.data, today],
  )

  const exportWorkouts = () => {
    downloadText('pacemates-treniruotes.ics', icsForWorkouts(upcoming), 'text/calendar')
    track('calendar_exported', { what: 'workouts' })
    toast('Failas paruoštas – atidaryk jį savo kalendoriuje')
  }

  const thisWeek = stats.weeks.at(-1)!
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Statistika" fallback="/profile" heading />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-4 pb-10">
        {/* Free: this week. Everything below it is Plus. */}
        <section aria-label="Šią savaitę" className="grid grid-cols-2 gap-2">
          <Stat
            label="Km šią savaitę"
            value={<CountUp value={thisWeek.km} format={formatKm} />}
            accent
          />
          <Stat label="Treniruočių" value={<CountUp value={thisWeek.workouts} />} />
        </section>

        {isLoading ? (
          <div className="h-64 skeleton rounded-[24px] bg-surface" />
        ) : entitlements.plus ? (
          <Full stats={stats} upcomingCount={upcoming.length} onExport={exportWorkouts} />
        ) : (
          <>
            <LockedPreview />
            <UpgradeCard title="Matyk visą savo pažangą">
              12 savaičių kilometrų grafikas, serija iš eilės, ilgiausia treniruotė, sportų
              pasiskirstymas ir dažniausi bendražygiai – ir visas treniruočių kalendorius telefone.
            </UpgradeCard>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="flex flex-col-reverse rounded-[20px] border border-white/[0.06] bg-surface px-3 py-3.5 text-center">
      <dt className="mt-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        {label}
      </dt>
      <dd
        className={`font-display text-[30px] leading-none font-bold tabular ${accent ? 'text-volt' : 'text-white'}`}
      >
        {value}
      </dd>
    </div>
  )
}

function Full({
  stats,
  upcomingCount,
  onExport,
}: {
  stats: Stats
  upcomingCount: number
  onExport: () => void
}) {
  const max = Math.max(1, ...stats.weeks.map((w) => w.km))
  const empty = stats.totalWorkouts === 0
  if (empty) {
    return (
      <EmptyState Icon={TrendingUp} title="Kol kas nėra ką rodyti">
        Kai dalyvausi pirmose treniruotėse, čia matysi savo kilometrus, seriją ir bendražygius.
      </EmptyState>
    )
  }
  return (
    <>
      <div className="flex items-center gap-2">
        <PlusBadge />
        <span className="text-[13px] text-slate-400">Paskutinės 12 savaičių</span>
      </div>

      <section
        aria-label="Savaičių grafikas"
        className="rounded-[24px] border border-white/[0.06] bg-surface p-4"
      >
        <h2 className="headline text-[19px]">Kilometrai per savaitę</h2>
        <div aria-hidden className="mt-4 flex h-36 items-end gap-1.5">
          {stats.weeks.map((w, i) => (
            <div
              key={w.start}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className={`w-full rounded-t-[6px] ${i === stats.weeks.length - 1 ? 'bg-volt' : 'bg-blue'}`}
                style={{
                  height: `${Math.max(w.km > 0 ? 6 : 2, (w.km / max) * 100)}%`,
                  opacity: w.km > 0 ? 1 : 0.25,
                }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-slate-500">
          <span>{shortDate(stats.weeks[0]!.start)}</span>
          <span>šią savaitę</span>
        </div>
        <table className="sr-only">
          <caption>Kilometrai kiekvieną savaitę</caption>
          <thead>
            <tr>
              <th>Savaitė nuo</th>
              <th>Km</th>
              <th>Treniruotės</th>
            </tr>
          </thead>
          <tbody>
            {stats.weeks.map((w) => (
              <tr key={w.start}>
                <td>{w.start}</td>
                <td>{formatKm(w.km)}</td>
                <td>{w.workouts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Viso km" value={formatKm(stats.totalKm)} />
        <Stat
          label={`${stats.totalWorkouts === 1 ? 'Treniruotė' : 'Treniruočių'}`}
          value={stats.totalWorkouts}
        />
        <Stat label={`Savaičių iš eilės`} value={stats.streakWeeks} accent />
        <Stat
          label="Geriausia sav., km"
          value={stats.bestWeek ? formatKm(stats.bestWeek.km) : '–'}
        />
      </dl>

      {stats.longest && (
        <section className="flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blaze text-black">
            <Route className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-wider text-slate-500 uppercase">
              Ilgiausia treniruotė
            </p>
            <p className="truncate text-[16px] font-bold text-white">
              {formatKm(stats.longest.distanceKm)} km · {stats.longest.title}
            </p>
            <p className="text-[13px] text-slate-400">{shortDate(stats.longest.date)}</p>
          </div>
        </section>
      )}

      <section
        aria-label="Sportai"
        className="rounded-[24px] border border-white/[0.06] bg-surface p-4"
      >
        <h2 className="headline text-[19px]">Pagal sportą</h2>
        <ul className="mt-3 space-y-3">
          {stats.sports.map((s) => (
            <li key={s.label}>
              <div className="flex items-baseline justify-between text-[14px]">
                <span className="font-semibold text-white">{s.label}</span>
                <span className="text-slate-400 tabular">
                  {formatKm(s.km)} km · {Math.round(s.share * 100)} %
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full origin-left animate-grow rounded-full bg-volt"
                  style={{ width: `${s.share * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {stats.partners.length > 0 && (
        <section
          aria-label="Bendražygiai"
          className="rounded-[24px] border border-white/[0.06] bg-surface p-4"
        >
          <h2 className="headline text-[19px]">Dažniausi bendražygiai</h2>
          <ul className="mt-3 space-y-2.5">
            {stats.partners.map((p) => (
              <li key={p.user.id} className="flex items-center gap-3">
                <Avatar user={p.user} size={36} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
                  {p.user.name}
                </span>
                <span className="text-[13px] text-slate-400">
                  {countOf(p.together, WORDS.workout)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-label="Kalendorius"
        className="rounded-[24px] border border-white/[0.06] bg-surface p-4"
      >
        <h2 className="headline text-[19px]">Į kalendorių</h2>
        <p className="mt-1 text-[14px] text-slate-300">
          {upcomingCount > 0
            ? `${countOf(upcomingCount, WORDS.workout)} – vienu paspaudimu į Google, Apple ar Outlook kalendorių.`
            : 'Kai prisijungsi prie būsimų treniruočių, jas galėsi išsisaugoti telefono kalendoriuje.'}
        </p>
        <Button className="mt-3" onClick={onExport} disabled={upcomingCount === 0}>
          <CalendarPlus className="size-4" aria-hidden />
          Atsisiųsti .ics failą
        </Button>
      </section>
    </>
  )
}

/** What Plus looks like, drawn from made-up numbers so nothing real sits behind the lock. */
function LockedPreview() {
  const heights = [30, 45, 38, 60, 52, 70, 48, 66, 80, 58, 90, 74]
  return (
    <section
      aria-hidden
      className="pointer-events-none relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-surface p-4"
    >
      <div className="opacity-40 blur-[3px]">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-volt" />
          <Medal className="size-4 text-blaze" />
          <span className="text-[13px] text-slate-300">
            Savaičių iš eilės · ilgiausia · bendražygiai
          </span>
        </div>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {heights.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[6px] bg-blue" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </section>
  )
}
