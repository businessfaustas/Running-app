import {
  buildTrainingPlan,
  dayName,
  disciplineFor,
  hasRaceAccess,
  LEVELS,
  type Level,
  type PlanWeek,
  type Race,
} from '@pacemates/shared'
import clsx from 'clsx'
import { CalendarPlus, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { PlusBadge } from '../../components/PlusBadge'
import { useEntitlements } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { todayISO } from '../../lib/clock'
import { downloadText } from '../../lib/download'
import { formatKm } from '../../lib/format'
import { toast } from '../../lib/toast'
import { UpgradeCard } from '../plus/UpgradeCard'
import { icsForPlan } from '../stats/calendar'

const PHASE_LABEL: Record<PlanWeek['phase'], string> = {
  base: 'Bazė',
  build: 'Stiprinimas',
  specific: 'Specifinis',
  taper: 'Mažinimas',
  race: 'Startas',
}
const KIND_LABEL: Record<string, string> = {
  easy: 'Lengvai',
  long: 'Ilgasis',
  tempo: 'Tempas',
  intervals: 'Intervalai',
  strides: 'Pagreitėjimai',
  race: 'STARTAS',
  rest: 'Poilsis',
}

const PREFS_KEY = 'pacemates:plan-prefs'
interface Prefs {
  level: Level
  days: number
}
function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<Prefs> | null
    const level = LEVELS.find((l) => l.id === raw?.level)?.id ?? 'regular'
    const days = raw?.days && raw.days >= 3 && raw.days <= 5 ? raw.days : 4
    return { level, days }
  } catch {
    return { level: 'regular', days: 4 }
  }
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('lt-LT', { day: 'numeric', month: 'long' }).format(
    new Date(`${iso}T12:00:00`),
  )

/**
 * A week-by-week plan for the chosen course. Week 1 is free for everyone, so the quality is
 * visible before paying; the rest of the weeks show their shape (phase and kilometres) but their
 * sessions open with Plus or a pass for this race.
 */
export function TrainingPlanSection({ race, distance }: { race: Race; distance: number }) {
  const { entitlements, isLoading } = useEntitlements()
  const [prefs, setPrefs] = useState(readPrefs)
  const today = todayISO()
  const unlocked = hasRaceAccess(entitlements, race.slug)
  const discipline = disciplineFor(race.type)

  const plan = useMemo(
    () =>
      buildTrainingPlan({
        raceType: race.type,
        distanceKm: distance,
        raceDate: race.date,
        today,
        level: prefs.level,
        daysPerWeek: prefs.days,
      }),
    [race.type, race.date, distance, today, prefs],
  )

  useEffect(() => {
    track('plan_viewed', { race: race.slug, unlocked })
  }, [race.slug, unlocked])

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  const exportPlan = () => {
    const ics = plan && icsForPlan(plan, race.name, race.slug)
    if (!ics) return
    downloadText(`pasiruosimas-${race.slug}.ics`, ics, 'text/calendar')
    track('calendar_exported', { what: 'plan' })
    toast('Failas paruoštas – atidaryk jį savo kalendoriuje')
  }

  const raceInPast = race.date !== null && race.date < today

  return (
    <section
      aria-label="Pasiruošimo planas"
      className="space-y-3 rounded-[24px] border border-white/[0.06] bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="headline text-[21px]">Pasiruošimo planas</h2>
          <p className="text-[13px] text-slate-400">
            {formatKm(distance)} km · savaitė po savaitės
          </p>
        </div>
        {unlocked ? <PlusBadge label={entitlements.plus ? 'Plus' : 'Leidimas'} /> : null}
      </div>

      {!discipline ? (
        <p className="text-[14px] leading-relaxed text-slate-300">
          Triatlono planų kol kas neturime – jis jungia tris sportus, o mes nenorime duoti patarimų,
          kurių nesame įsitikinę. Bėgimo ir dviračių varžyboms planai jau veikia.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <div role="group" aria-label="Tavo lygis" className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={prefs.level === l.id}
                  title={l.blurb}
                  onClick={() => update({ level: l.id })}
                  className={clsx(
                    'h-10 rounded-full px-4 text-[13px] font-bold transition-colors',
                    prefs.level === l.id
                      ? 'bg-white text-black'
                      : 'bg-raised text-slate-300 hover:text-white',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div
              role="group"
              aria-label="Treniruočių per savaitę"
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-[13px] text-slate-400">Dienų per savaitę:</span>
              {[3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={prefs.days === d}
                  onClick={() => update({ days: d })}
                  className={clsx(
                    'size-10 rounded-full text-[14px] font-bold tabular transition-colors',
                    prefs.days === d
                      ? 'bg-white text-black'
                      : 'bg-raised text-slate-300 hover:text-white',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {!plan ? (
            <p className="rounded-[16px] bg-raised p-3 text-[14px] leading-relaxed text-slate-300">
              {raceInPast
                ? 'Šių varžybų data jau praėjo. Kai bus paskelbta kita – planas atsiras čia.'
                : 'Iki starto liko per mažai laiko pilnam planui (reikia bent 4 savaičių). Dabar geriausia – ramiai palaikyti formą ir nieko naujo neišbandyti.'}
            </p>
          ) : (
            <>
              <p className="text-[14px] text-slate-300">
                <strong className="text-white">{plan.weeks.length} savaičių</strong> · didžiausia
                savaitė <strong className="text-white">{formatKm(plan.peakWeekKm)} km</strong> ·
                ilgiausia treniruotė{' '}
                <strong className="text-white">{formatKm(plan.longestKm)} km</strong>
              </p>
              {plan.gentler && (
                <p className="rounded-[16px] border border-dune/30 bg-dune/10 p-3 text-[13px] leading-relaxed text-slate-200">
                  Iki starto nedaug laiko, todėl krūvis kyla švelniau nei įprastai – saugiau, bet ir
                  mažesnis pasiruošimas. Startuok ramiau, nei svajoji.
                </p>
              )}
              {race.date === null && (
                <p className="text-[12.5px] text-slate-500">
                  Šių varžybų data dar nepaskelbta, todėl planas be datų – įprastos trukmės.
                </p>
              )}

              <ol className="space-y-2">
                {plan.weeks.map((w) => (
                  <WeekRow
                    key={w.week}
                    week={w}
                    open={w.week === 1}
                    locked={w.week > 1 && !unlocked}
                  />
                ))}
              </ol>

              {unlocked ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" onClick={exportPlan} disabled={race.date === null}>
                    <CalendarPlus className="size-4" aria-hidden />Į kalendorių (.ics)
                  </Button>
                  {race.date === null && (
                    <span className="text-[12.5px] text-slate-500">
                      Eksportas atsiras, kai bus žinoma data.
                    </span>
                  )}
                </div>
              ) : isLoading ? null : (
                <UpgradeCard
                  title="Atrakink visą planą"
                  racePass={{ raceSlug: race.slug, raceName: race.name }}
                >
                  Matai pirmą savaitę nemokamai. Su Plus – visos {plan.weeks.length} savaitės,
                  kiekviena treniruotė ir eksportas į kalendorių. Ruošiesi tik šiems startams?
                  Pakanka vienkartinio leidimo.
                </UpgradeCard>
              )}
              <p className="text-[12px] leading-relaxed text-slate-500">
                Bendro pobūdžio planas sveikam suaugusiam žmogui, ne medicininė konsultacija ar
                trenerio paslauga. Jei abejoji sveikata – pasitark su gydytoju. Jausdamas skausmą ar
                svaigulį – nustok.
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}

function WeekRow({ week, open, locked }: { week: PlanWeek; open: boolean; locked: boolean }) {
  const head = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-[13px] font-bold tabular text-white">
        {week.week}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-white">
          {PHASE_LABEL[week.phase]}
          {week.easy ? ' · lengvesnė savaitė' : ''}
        </span>
        <span className="block text-[12px] text-slate-400">
          {week.starts ? `nuo ${shortDate(week.starts)} · ` : ''}
          {formatKm(week.totalKm)} km
        </span>
      </span>
    </>
  )
  if (locked) {
    return (
      <li className="flex items-center gap-3 rounded-[16px] bg-raised/60 px-3 py-2.5">
        {head}
        <Lock
          className="size-4 shrink-0 text-slate-500"
          aria-label="Užrakinta – reikia Plus arba leidimo"
          role="img"
        />
      </li>
    )
  }
  return (
    <li>
      <details open={open} className="group rounded-[16px] bg-raised">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          {head}
        </summary>
        <div className="space-y-2 px-3 pb-3">
          <p className="text-[13px] leading-relaxed text-slate-300">{week.tip}</p>
          <ul className="divide-y divide-white/[0.06]">
            {week.sessions.map((s) => (
              <li key={s.day} className="flex gap-3 py-2 text-[13.5px]">
                <span className="w-[5.5rem] shrink-0 text-slate-400">{dayName(s.day)}</span>
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'font-bold',
                      s.kind === 'rest' ? 'text-slate-500' : 'text-white',
                    )}
                  >
                    {KIND_LABEL[s.kind]}
                    {s.km > 0 ? ` · ${formatKm(s.km)} km` : ''}
                  </span>
                  <span className="block text-slate-300">{s.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  )
}
