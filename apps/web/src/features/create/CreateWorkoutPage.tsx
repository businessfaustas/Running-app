import {
  addDays,
  isRunning,
  MAX_DISTANCE_KM,
  minutesToTime,
  newSlotInputSchema,
  timeToMinutes,
  type NewSlotInput,
  type SlotDetail,
  type SportType,
  type VibeTag,
} from '@pacemates/shared'
import clsx from 'clsx'
import { CalendarX2, Check, House, LocateFixed, MapPin, Minus, Plus, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { TextArea, TextField } from '../../components/Field'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { SportArt } from '../../components/SportArt'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useCity } from '../../data/city'
import {
  useCreateSlot,
  useMe,
  useSendMessage,
  useSlot,
  useSlots,
  useUpdateSlot,
} from '../../data/hooks'
import { track } from '../../lib/analytics'
import { celebrate } from '../../lib/celebrate'
import { todayISO, wallClock } from '../../lib/clock'
import { formatKm, formatMinutes, isPast, relativeDay } from '../../lib/format'
import { toast, toastError } from '../../lib/toast'
import { useDiscoverStore } from '../discover/store'
import { SPORT_META, SPORT_ORDER, VIBE_META, VIBE_ORDER } from '../slots/meta'
import { describeChanges } from './describeChanges'

const STEPS = ['Sportas', 'Laikas', 'Atstumas', 'Pobūdis', 'Vieta', 'Detalės'] as const
const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240]
/** Quick picks – any other distance can be typed into the field. */
const DISTANCE_PRESETS: Record<SportType, number[]> = {
  RUN: [5, 8, 10, 15, 21.1, 30],
  TRAIL: [8, 12, 15, 21, 30],
  TRACK: [5, 6, 8, 10],
  CYCLING: [40, 60, 80, 100, 120],
  GRAVEL: [30, 45, 60, 80],
  HIKING: [8, 12, 15, 20, 25],
  SWIMMING: [1, 1.5, 2, 3, 5],
}

/** "12,5", "12.5 km" → 12.5; anything that isn't a number → NaN. */
const parseKm = (text: string) =>
  Number(
    text
      .trim()
      .replace(/\s*km$/i, '')
      .replace(',', '.'),
  )
const PACE_RE = /^\d{1,2}:[0-5]\d$/
const MEASURE_UNIT = { pace: '/km', speed: 'km/h', swim: '/100 m' } as const
const PLACEHOLDER: Record<SportType, [string, string]> = {
  RUN: ['5:15', '5:30'],
  TRAIL: ['6:30', '7:00'],
  TRACK: ['4:30', '4:45'],
  CYCLING: ['26', '28'],
  GRAVEL: ['22', '25'],
  HIKING: ['4', '5'],
  SWIMMING: ['2:00', '2:15'],
}
const SPEED_RE = /^\d{1,2}(?:[.,]\d)?$/

interface Draft {
  sportType: SportType | null
  date: string
  startTime: string
  /** null: no end given (only for workouts that were saved without one). */
  durationMin: number | null
  distanceKm: string
  paceFrom: string
  paceTo: string
  /** When editing: the saved pace text, kept as written until the pace fields change. */
  keepPace?: string
  vibeTag: VibeTag | null
  description: string
  meetingPoint: { name: string; lat: number; lng: number } | null
  title: string
  maxParticipants: number | null
  /** The host confirms the organiser rules before publishing. */
  hostAgreed: boolean
}

/** Where to focus each sport's photo in tiles (sports without one get SportArt's colour). */
const PHOTO_POSITION: Partial<Record<SportType, string>> = {
  RUN: '50% 40%',
  TRAIL: '50% 55%',
  TRACK: '50% 60%',
  CYCLING: '50% 45%',
  GRAVEL: '20% 70%',
}

/** What the workout is, for generated names: "10 km bėgimas kompanijoje". */
const NOUN: Record<SportType, string> = {
  RUN: 'bėgimas',
  TRACK: 'treniruotė stadione',
  CYCLING: 'važiavimas plentu',
  GRAVEL: 'žvyrkelio išvyka',
  TRAIL: 'trail bėgimas',
  HIKING: 'žygis',
  SWIMMING: 'plaukimas',
}

function defaultStart(date: string, today: string): string {
  if (date !== today) return '08:00'
  const now = wallClock()
  const next = Math.min((now.getHours() + 1) * 60, 22 * 60)
  return minutesToTime(next)
}

function suggestTitle(draft: Draft): string {
  if (!draft.sportType || !draft.vibeTag) return ''
  const noun = NOUN[draft.sportType]
  const km = parseKm(draft.distanceKm)
  const distance = km > 0 ? `${formatKm(km)} km ` : ''
  const title = {
    ZONE_2_COFFEE: `${distance}lengvai + kava`,
    SOCIAL_CHAT: `${distance}${noun} kompanijoje`,
    LONG_RUN: `Ilgoji: ${distance}${noun}`,
    PACE_PUSH: `Tempas: ${distance}${noun}`,
    INTERVALS: draft.sportType === 'TRACK' ? 'Intervalai stadione' : 'Intervalų treniruotė',
  }[draft.vibeTag]
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function targetPace(draft: Draft): string {
  if (draft.keepPace) return draft.keepPace
  const from = draft.paceFrom.trim().replace(',', '.')
  const to = draft.paceTo.trim().replace(',', '.')
  const range = to && to !== from ? `${from}–${to}` : from
  const measure = draft.sportType ? SPORT_META[draft.sportType].measure : 'pace'
  return `${range} ${MEASURE_UNIT[measure]}`
}

function endTime(draft: Draft): string | null {
  if (draft.durationMin === null) return null
  const end = timeToMinutes(draft.startTime) + draft.durationMin
  return end < 24 * 60 ? minutesToTime(end) : null
}

function toInput(draft: Draft): NewSlotInput {
  return {
    title: draft.title.trim() || suggestTitle(draft),
    sportType: draft.sportType!,
    date: draft.date,
    startTime: draft.startTime,
    endTime: endTime(draft),
    distanceKm: parseKm(draft.distanceKm),
    targetPace: targetPace(draft),
    vibeTag: draft.vibeTag!,
    description: draft.description.trim() || null,
    meetingPoint: draft.meetingPoint!,
    maxParticipants: draft.maxParticipants,
  }
}

/** The form, filled in from a saved workout. */
function draftFromSlot(slot: SlotDetail): Draft {
  const [, paceFrom = '', paceTo = ''] =
    /^\s*([\d:.,]+)(?:\s*[–-]\s*([\d:.,]+))?/.exec(slot.targetPace) ?? []
  return {
    sportType: slot.sportType,
    date: slot.date,
    startTime: slot.startTime,
    durationMin: slot.endTime ? timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime) : null,
    distanceKm: String(slot.distanceKm).replace('.', ','),
    paceFrom,
    paceTo,
    keepPace: slot.targetPace,
    vibeTag: slot.vibeTag,
    description: slot.description ?? '',
    meetingPoint: { ...slot.meetingPoint },
    title: slot.title,
    maxParticipants: slot.maxParticipants,
    hostAgreed: true,
  }
}

/** The first problem with the current step, or null when it's complete. */
function stepError(step: number, draft: Draft): string | null {
  const measure = draft.sportType ? SPORT_META[draft.sportType].measure : 'pace'
  switch (step) {
    case 0:
      return draft.sportType ? null : 'Pasirink sportą'
    case 1:
      if (!/^\d\d:\d\d$/.test(draft.startTime)) return 'Pasirink pradžios laiką'
      return timeToMinutes(draft.startTime) + (draft.durationMin ?? 0) > 24 * 60
        ? 'Treniruotė turi baigtis iki vidurnakčio'
        : null
    case 2: {
      if (!draft.distanceKm.trim()) return 'Įvesk atstumą'
      const km = parseKm(draft.distanceKm)
      if (Number.isNaN(km)) return 'Atstumą įvesk skaičiumi, pvz., 12 arba 12,5'
      if (!(km > 0)) return 'Atstumas turi būti didesnis nei 0'
      if (km > MAX_DISTANCE_KM) return `Atstumas per didelis – daugiausia ${MAX_DISTANCE_KM} km`
      if (draft.keepPace) return null
      const re = measure === 'speed' ? SPEED_RE : PACE_RE
      if (!re.test(draft.paceFrom.trim())) {
        return {
          pace: 'Įvesk tikslinį tempą, pvz., 5:30',
          swim: 'Įvesk tempą 100 m, pvz., 2:00',
          speed: 'Įvesk vidutinį greitį, pvz., 28',
        }[measure]
      }
      if (draft.paceTo.trim() && !re.test(draft.paceTo.trim())) return 'Patikrink antrą reikšmę'
      return null
    }
    case 3:
      return draft.vibeTag ? null : 'Pasirink pobūdį'
    case 4:
      if (!draft.meetingPoint) return 'Bakstelk žemėlapį ir pažymėk vietą'
      return draft.meetingPoint.name.trim().length >= 2 ? null : 'Įvardyk susitikimo vietą'
    default: {
      const parsed = newSlotInputSchema.safeParse(toInput(draft))
      if (!parsed.success) return parsed.error.issues[0]!.message
      return draft.hostAgreed ? null : 'Pažymėk, kad sutinki su organizatoriaus taisyklėmis'
    }
  }
}

/** Back to where the person came from, or `fallback` when they arrived on this page directly. */
function useClose(fallback: string) {
  const navigate = useNavigate()
  return () =>
    window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback, { replace: true })
}

export function CreateWorkoutPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = todayISO()
  const create = useCreateSlot()
  const showSlot = useDiscoverStore((s) => s.showSlot)
  const close = useClose('/')

  const [initial] = useState<Draft>(() => {
    const date = params.get('date') ?? today
    return {
      sportType: null,
      date: date >= today ? date : today,
      startTime: params.get('time') ?? defaultStart(date, today),
      durationMin: 60,
      distanceKm: '',
      paceFrom: '',
      paceTo: '',
      vibeTag: null,
      description: '',
      meetingPoint: null,
      title: '',
      maxParticipants: 6,
      hostAgreed: false,
    }
  })

  return (
    <WorkoutWizard
      initial={initial}
      pending={create.isPending}
      onClose={close}
      onSubmit={(input) =>
        create.mutate(input, {
          onSuccess: (slot) => {
            track('workout_created', { sport: slot.sportType, vibe: slot.vibeTag })
            showSlot(slot.id, slot.date)
            navigate('/', { replace: true })
            celebrate({ kind: 'posted', slotId: slot.id, title: slot.title })
          },
          onError: toastError,
        })
      }
    />
  )
}

/** The host changes a workout they posted: same steps as creating it, filled in. */
export function EditWorkoutPage() {
  const { id = '' } = useParams()
  const session = useSession()
  const slotQuery = useSlot(id)
  const close = useClose(`/workouts/${id}`)

  if (slotQuery.isPending) return <FullScreenLoader />
  if (slotQuery.isError) {
    return (
      <div className="flex h-full flex-col">
        <TopBar fallback={`/workouts/${id}`} />
        <ErrorState error={slotQuery.error} onRetry={() => slotQuery.refetch()} />
      </div>
    )
  }
  const slot = slotQuery.data
  const reason = !slot
    ? 'Galbūt ji ištrinta arba nuoroda neteisinga.'
    : slot.host.id !== session?.userId
      ? 'Redaguoti gali tik treniruotės organizatorius.'
      : slot.status === 'CANCELLED'
        ? 'Ši treniruotė atšaukta.'
        : slot.status === 'COMPLETED' || isPast(slot.date, slot.startTime, slot.endTime)
          ? 'Ši treniruotė jau pasibaigė.'
          : null
  if (!slot || reason) {
    return (
      <div className="flex h-full flex-col">
        <TopBar fallback={`/workouts/${id}`} />
        <EmptyState Icon={CalendarX2} title="Redaguoti negalima">
          {reason}
        </EmptyState>
      </div>
    )
  }
  return <EditWorkout slot={slot} onClose={close} />
}

function EditWorkout({ slot, onClose }: { slot: SlotDetail; onClose: () => void }) {
  const save = useUpdateSlot(slot.id)
  const send = useSendMessage(slot.id)
  const [initial] = useState(() => draftFromSlot(slot))

  return (
    <WorkoutWizard
      initial={initial}
      editing={{ going: slot.participantCount }}
      pending={save.isPending}
      onClose={onClose}
      onSubmit={(input) => {
        const changes = describeChanges(slot, input)
        if (changes.length === 0) {
          toast('Nieko nepakeitei')
          onClose()
          return
        }
        save.mutate(input, {
          onSuccess: () => {
            track('workout_edited', { sport: input.sportType })
            // Everyone who's going hears about it in the group chat.
            if (slot.participantCount > 1) {
              const text = changes.join('; ')
              send.mutate(`Atnaujinau treniruotę – ${text}${text.endsWith('.') ? '' : '.'}`, {
                onError: () =>
                  toast('Pakeitimai išsaugoti, bet žinutės grupei išsiųsti nepavyko', 'error'),
              })
            }
            toast('Pakeitimai išsaugoti')
            onClose()
          },
          onError: toastError,
        })
      }}
    />
  )
}

interface WizardProps {
  initial: Draft
  /** Set when changing a saved workout; `going` counts the host too. */
  editing?: { going: number }
  pending: boolean
  onClose: () => void
  onSubmit: (input: NewSlotInput) => void
}

function WorkoutWizard({ initial, editing, pending, onClose, onSubmit }: WizardProps) {
  const today = todayISO()
  const me = useMe()
  const [step, setStep] = useState(editing ? 1 : 0)
  const [showErrors, setShowErrors] = useState(false)
  const [draft, setDraft] = useState<Draft>(initial)

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const error = stepError(step, draft)
  const last = step === STEPS.length - 1

  const chooseSport = (sportType: SportType) => {
    // Prefill the athlete's usual pace for this sport.
    const paces = me.data?.defaultPaces ?? {}
    const usual = isRunning(sportType)
      ? paces.running_easy
      : sportType === 'GRAVEL'
        ? (paces.gravel_avg ?? paces.cycling_avg)
        : sportType === 'CYCLING'
          ? paces.cycling_avg
          : undefined
    const sameMeasure =
      draft.sportType && SPORT_META[draft.sportType].measure === SPORT_META[sportType].measure
    update({
      sportType,
      ...(sameMeasure
        ? {}
        : {
            paceFrom: usual?.match(/[\d:.,]+/)?.[0] ?? '',
            paceTo: '',
            keepPace: undefined,
            distanceKm: '',
          }),
    })
  }

  const next = () => {
    if (error) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    if (!last) {
      setStep(step + 1)
      return
    }
    onSubmit(toInput(draft))
  }

  /** Editing: save from any step, after checking all of them. */
  const saveEdits = () => {
    const broken = STEPS.findIndex((_, i) => stepError(i, draft) !== null)
    if (broken !== -1) {
      setStep(broken)
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    onSubmit(toInput(draft))
  }

  const goTo = (target: number) => {
    setShowErrors(false)
    setStep(target)
  }

  const accent = draft.sportType ? SPORT_META[draft.sportType].accent : 'var(--color-volt)'

  return (
    <div className="flex h-full flex-col" style={{ '--accent': accent } as CSSProperties}>
      <header className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center justify-between px-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Uždaryti"
            className="grid size-11 place-items-center rounded-full bg-raised text-white transition hover:bg-[#2a2a2e] active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
          <p className="text-center leading-tight">
            <span className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
              {editing ? 'Redaguoti treniruotę' : 'Nauja treniruotė'}
            </span>
            <span className="block text-[15px] font-bold">{STEPS[step]}</span>
          </p>
          <p className="grid size-11 place-items-center font-display text-[17px] font-bold text-slate-400 tabular">
            {step + 1}/{STEPS.length}
          </p>
        </div>
        {editing ? (
          <nav
            aria-label="Ką keisti"
            className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3"
          >
            {STEPS.map((name, i) => (
              <button
                key={name}
                type="button"
                aria-current={i === step ? 'step' : undefined}
                onClick={() => goTo(i)}
                className={clsx(
                  'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition-colors',
                  i === step ? 'bg-(--accent) text-black' : 'bg-raised text-slate-300',
                )}
              >
                {name}
              </button>
            ))}
          </nav>
        ) : (
          <div className="flex gap-1.5 px-4 pb-3" aria-hidden>
            {STEPS.map((name, i) => (
              <span
                key={name}
                className={clsx(
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  i <= step ? 'bg-(--accent)' : 'bg-raised',
                )}
              />
            ))}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-8" key={step}>
        <div className="motion-safe:animate-rise">
          {step === 0 && <SportStep draft={draft} onChoose={chooseSport} />}
          {step === 1 && <WhenStep draft={draft} update={update} today={today} />}
          {step === 2 && (
            <DistanceStep draft={draft} update={update} usual={me.data?.defaultPaces} />
          )}
          {step === 3 && <VibeStep draft={draft} update={update} />}
          {step === 4 && <WhereStep draft={draft} update={update} today={today} />}
          {step === 5 && (
            <DetailsStep draft={draft} update={update} today={today} going={editing?.going} />
          )}
        </div>
        {showErrors && error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-blaze/15 px-4 py-3 text-sm font-semibold text-[#ff9466]"
          >
            {error}
          </p>
        )}
      </div>

      <footer className="flex shrink-0 gap-3 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        {editing ? (
          <>
            {!last && (
              <Button variant="secondary" size="lg" onClick={() => goTo(step + 1)}>
                Toliau
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={saveEdits} loading={pending}>
              Išsaugoti pakeitimus
            </Button>
          </>
        ) : (
          <>
            {step > 0 && (
              <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
                Atgal
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={next} loading={pending}>
              {last ? 'Paskelbti treniruotę' : 'Toliau'}
            </Button>
          </>
        )}
      </footer>
    </div>
  )
}

function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h1 className="headline text-[32px]">{title}</h1>
      {hint && <p className="mt-2 text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

function Choice({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'rounded-[22px] border-2 text-left transition-colors duration-150 active:scale-[0.98]',
        selected
          ? 'border-(--accent) bg-(--accent)/10 text-white'
          : 'border-transparent bg-surface text-slate-200 hover:bg-raised',
        className,
      )}
    >
      {children}
    </button>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'h-10 shrink-0 rounded-full px-4 text-[13px] font-bold tabular transition-colors',
        selected ? 'bg-white text-black' : 'bg-raised text-slate-300 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function SportStep({ draft, onChoose }: { draft: Draft; onChoose: (s: SportType) => void }) {
  return (
    <>
      <Question title="Ką veiksi?" hint="Pasirink sportą – nuo jo priklausys tempas ir atstumai." />
      <div className="grid grid-cols-2 gap-3">
        {SPORT_ORDER.map((sport) => {
          const meta = SPORT_META[sport]
          const selected = draft.sportType === sport
          return (
            <button
              key={sport}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(sport)}
              style={{ '--tile': meta.accent } as CSSProperties}
              className={clsx(
                'relative flex h-32 flex-col justify-end overflow-hidden rounded-[24px] p-4 text-left transition active:scale-[0.98]',
                selected ? 'ring-3 ring-(--tile)' : 'ring-1 ring-white/10',
              )}
            >
              <SportArt
                sport={sport}
                vibe={sport === 'TRACK' ? 'INTERVALS' : 'SOCIAL_CHAT'}
                position={PHOTO_POSITION[sport]}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
              <span
                className={clsx(
                  'absolute top-3 left-3 grid size-9 place-items-center rounded-full',
                  selected ? 'bg-(--tile) text-black' : 'glass text-white',
                )}
              >
                {selected ? (
                  <Check className="size-5" strokeWidth={3} aria-hidden />
                ) : (
                  <meta.Icon className="size-[18px]" aria-hidden />
                )}
              </span>
              <span className="headline relative text-[24px] text-white">{meta.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function WhenStep({
  draft,
  update,
  today,
}: {
  draft: Draft
  update: (p: Partial<Draft>) => void
  today: string
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  // A saved workout's day or length may fall outside the usual choices.
  if (!days.includes(draft.date)) days.push(draft.date)
  const durations =
    draft.durationMin === null || DURATIONS.includes(draft.durationMin)
      ? DURATIONS
      : [...DURATIONS, draft.durationMin].sort((a, b) => a - b)
  const end = endTime(draft)
  return (
    <>
      <Question title="Kada?" />
      <p className="mb-2 text-[13px] font-bold text-slate-300">Diena</p>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {days.map((date) => (
          <Chip key={date} selected={draft.date === date} onClick={() => update({ date })}>
            {relativeDay(date, today)}
          </Chip>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <TextField
          label="Pradžia"
          type="time"
          step={300}
          value={draft.startTime}
          onChange={(e) => update({ startTime: e.target.value })}
          className="tabular"
        />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-slate-300">Pabaiga</p>
          <p className="flex h-13 items-center rounded-2xl border border-dashed border-white/15 px-4 text-[15px] text-slate-400 tabular">
            {end ?? (draft.durationMin === null ? 'Nenurodyta' : 'Po vidurnakčio')}
          </p>
        </div>
      </div>

      <p className="mt-6 mb-2 text-[13px] font-bold text-slate-300">Kiek maždaug truks?</p>
      <div className="flex flex-wrap gap-2">
        {durations.map((minutes) => (
          <Chip
            key={minutes}
            selected={draft.durationMin === minutes}
            onClick={() => update({ durationMin: minutes })}
          >
            {formatMinutes(minutes)}
          </Chip>
        ))}
      </div>
    </>
  )
}

function DistanceStep({
  draft,
  update,
  usual,
}: {
  draft: Draft
  update: (p: Partial<Draft>) => void
  usual?: Record<string, string | undefined>
}) {
  const sport = draft.sportType!
  const measure = SPORT_META[sport].measure
  const pace = measure !== 'speed'
  const usualText = isRunning(sport)
    ? usual?.running_easy
    : sport === 'GRAVEL'
      ? (usual?.gravel_avg ?? usual?.cycling_avg)
      : sport === 'CYCLING'
        ? usual?.cycling_avg
        : undefined
  return (
    <>
      <Question title="Kiek ir kaip greitai?" />
      <TextField
        label="Atstumas"
        inputMode="decimal"
        placeholder="10"
        suffix="km"
        value={draft.distanceKm}
        onChange={(e) => update({ distanceKm: e.target.value })}
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        {DISTANCE_PRESETS[sport].map((km) => (
          <Chip
            key={km}
            selected={parseKm(draft.distanceKm) === km}
            onClick={() => update({ distanceKm: String(km) })}
          >
            {formatKm(km)} km
          </Chip>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <TextField
          label={
            measure === 'swim' ? 'Tempas 100 m' : pace ? 'Tikslinis tempas' : 'Vidutinis greitis'
          }
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={PLACEHOLDER[sport][0]}
          suffix={MEASURE_UNIT[measure]}
          value={draft.paceFrom}
          onChange={(e) => update({ paceFrom: e.target.value, keepPace: undefined })}
        />
        <TextField
          label="Iki (nebūtina)"
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={PLACEHOLDER[sport][1]}
          suffix={MEASURE_UNIT[measure]}
          value={draft.paceTo}
          onChange={(e) => update({ paceTo: e.target.value, keepPace: undefined })}
        />
      </div>
      <p className="mt-2 text-[13px] text-slate-500">
        {usualText
          ? `Tavo įprastas: ${usualText}. Intervalas padeda kitiems suprasti, ar jiems tiks.`
          : 'Intervalas padeda kitiems suprasti, ar jiems tiks.'}
      </p>
    </>
  )
}

function VibeStep({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  return (
    <>
      <Question title="Koks pobūdis?" />
      <div className="flex flex-col gap-2">
        {VIBE_ORDER.map((vibe) => {
          const meta = VIBE_META[vibe]
          const selected = draft.vibeTag === vibe
          return (
            <Choice
              key={vibe}
              selected={selected}
              onClick={() => update({ vibeTag: vibe })}
              className="flex items-center gap-3 p-3.5"
            >
              <span
                className={clsx(
                  'grid size-11 shrink-0 place-items-center rounded-full',
                  selected ? 'bg-(--accent) text-black' : 'bg-raised text-white',
                )}
              >
                <meta.Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{meta.label}</span>
                <span className="block text-[13px] text-slate-400">{meta.blurb}</span>
              </span>
              {selected && <Check className="size-5 text-(--accent)" aria-hidden />}
            </Choice>
          )
        })}
      </div>
      <div className="mt-6">
        <TextArea
          label="Pastabos (nebūtina)"
          placeholder="Maršrutas, kur tiksliai laukti, ką pasiimti…"
          maxLength={1000}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
    </>
  )
}

function WhereStep({
  draft,
  update,
  today,
}: {
  draft: Draft
  update: (p: Partial<Draft>) => void
  today: string
}) {
  const city = useCity()
  const area = useMemo(() => ({ lat: city.lat, lng: city.lng, radiusKm: city.radiusKm }), [city])
  // Places people already meet at in this town.
  const slots = useSlots(addDays(today, -30), addDays(today, 13), area)
  const [locating, setLocating] = useState(false)
  // The meeting point is public; a pin dropped from the phone's location may be someone's home.
  const [fromMyLocation, setFromMyLocation] = useState(false)
  const point = draft.meetingPoint
  const lngLat = useMemo(() => (point ? { lng: point.lng, lat: point.lat } : null), [point])

  const popular = useMemo(() => {
    const seen = new Map<string, { name: string; lat: number; lng: number }>()
    for (const slot of slots.data ?? []) seen.set(slot.meetingPoint.name, slot.meetingPoint)
    return [...seen.values()].slice(0, 8)
  }, [slots.data])

  const pick = (spot: { lng: number; lat: number }) =>
    update({ meetingPoint: { name: point?.name ?? '', ...spot } })

  const locate = () => {
    if (!navigator.geolocation) {
      toast('Ši naršyklė negali nustatyti tavo vietos', 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        pick({ lng: pos.coords.longitude, lat: pos.coords.latitude })
        setFromMyLocation(true)
      },
      () => {
        setLocating(false)
        toast('Nepavyko nustatyti tavo vietos', 'error')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <>
      <Question
        title="Kur susitinkate?"
        hint={`Bakstelk žemėlapį arba pasirink populiarią vietą ${city.locative}. Rinkis viešą vietą – ne namų adresą: ją matys visi.`}
      />
      <div className="relative h-60 overflow-hidden rounded-[24px] border border-white/10">
        <LazyLocationMap
          point={lngLat}
          onPick={(spot) => {
            pick(spot)
            setFromMyLocation(false)
          }}
          accent={draft.sportType ? SPORT_META[draft.sportType].accent : undefined}
          zoom={13}
          fallbackCenter={city}
        />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-black shadow-lg disabled:opacity-60"
        >
          <LocateFixed className={clsx('size-4', locating && 'animate-pulse')} aria-hidden />
          Mano vieta
        </button>
      </div>
      {fromMyLocation && (
        <p
          role="status"
          className="mt-3 flex items-start gap-2.5 rounded-[18px] bg-dune/15 px-4 py-3 text-[13px] leading-snug text-dune"
        >
          <House className="mt-0.5 size-4 shrink-0" aria-hidden />
          Tai tavo dabartinė vieta. Jei esi namie, pasirink viešą vietą netoliese – parką, stadioną
          ar kavinę: susitikimo taškas matomas visiems.
        </p>
      )}

      {popular.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[13px] font-bold text-slate-300">Populiarios vietos</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((spot) => (
              <Chip
                key={spot.name}
                selected={point?.name === spot.name && point.lat === spot.lat}
                onClick={() => {
                  update({ meetingPoint: { ...spot } })
                  setFromMyLocation(false)
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {spot.name}
                </span>
              </Chip>
            ))}
          </div>
        </>
      )}

      <div className="mt-5">
        <TextField
          label="Susitikimo vietos pavadinimas"
          placeholder="pvz., Vingio parkas, prie estrados"
          value={point?.name ?? ''}
          disabled={!point}
          hint={point ? 'Ko žmonės ieškos atvykę.' : 'Pirmiausia pažymėk vietą žemėlapyje.'}
          onChange={(e) => point && update({ meetingPoint: { ...point, name: e.target.value } })}
        />
      </div>
    </>
  )
}

function DetailsStep({
  draft,
  update,
  today,
  going,
}: {
  draft: Draft
  update: (p: Partial<Draft>) => void
  today: string
  /** Editing: how many are going already (host included) – the group can't be smaller. */
  going?: number
}) {
  const sport = SPORT_META[draft.sportType!]
  const vibe = VIBE_META[draft.vibeTag!]
  const limited = draft.maxParticipants !== null
  const min = Math.max(2, going ?? 0)
  const size = Math.max(draft.maxParticipants ?? 6, min)
  return (
    <>
      <Question title="Paskutinės detalės" />
      <TextField
        label="Pavadinimas"
        placeholder={suggestTitle(draft)}
        maxLength={120}
        value={draft.title}
        hint="Palik tuščią – naudosime pasiūlymą."
        onChange={(e) => update({ title: e.target.value })}
      />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold text-white">Riboti grupės dydį</p>
          <p className="text-[13px] text-slate-500">
            {going && going > 1 ? `Įskaitant tave; jau dalyvauja ${going}` : 'Įskaitant tave'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={limited}
          aria-label="Riboti grupės dydį"
          onClick={() => update({ maxParticipants: limited ? null : size })}
          className={clsx(
            'relative h-7 w-12 rounded-full transition-colors',
            limited ? 'bg-(--accent)' : 'bg-raised',
          )}
        >
          <span
            className={clsx(
              'absolute top-1 size-5 rounded-full bg-white transition-[left] duration-200',
              limited ? 'left-6' : 'left-1',
            )}
          />
        </button>
      </div>
      {limited && (
        <div className="mt-3 flex items-center justify-center gap-6 rounded-[22px] bg-surface py-3">
          <button
            type="button"
            aria-label="Mažiau žmonių"
            onClick={() => update({ maxParticipants: Math.max(min, size - 1) })}
            className="grid size-10 place-items-center rounded-full bg-raised text-white disabled:opacity-40"
            disabled={size <= min}
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-16 text-center font-display text-4xl font-bold tabular">{size}</span>
          <button
            type="button"
            aria-label="Daugiau žmonių"
            onClick={() => update({ maxParticipants: Math.min(50, size + 1) })}
            className="grid size-10 place-items-center rounded-full bg-raised text-white disabled:opacity-40"
            disabled={size >= 50}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <p className="mt-8 mb-2 text-[13px] font-bold text-slate-300">Taip atrodys kitiems</p>
      <div className="overflow-hidden rounded-[24px] bg-surface">
        <div className="relative h-32">
          <SportArt
            sport={draft.sportType!}
            vibe={draft.vibeTag ?? 'SOCIAL_CHAT'}
            position={PHOTO_POSITION[draft.sportType!]}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <span className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-(--accent) px-3 py-1 text-[12px] font-bold text-black">
            <sport.Icon className="size-3.5" aria-hidden />
            {sport.label} · {relativeDay(draft.date, today)}
          </span>
        </div>
        <div className="p-4 pt-2">
          <p className="headline text-[24px] text-white">
            {draft.title.trim() || suggestTitle(draft)}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
            <dt className="text-slate-500">Laikas</dt>
            <dd className="text-slate-200 tabular">
              {draft.startTime}
              {endTime(draft) && `–${endTime(draft)}`}
            </dd>
            <dt className="text-slate-500">Atstumas</dt>
            <dd className="text-slate-200">
              {formatKm(Number(draft.distanceKm.replace(',', '.')))} km, {targetPace(draft)}
            </dd>
            <dt className="text-slate-500">Pobūdis</dt>
            <dd className="text-slate-200">{vibe.label}</dd>
            <dt className="text-slate-500">Vieta</dt>
            <dd className="truncate text-slate-200">{draft.meetingPoint?.name}</dd>
            <dt className="text-slate-500">Grupė</dt>
            <dd className="text-slate-200">{limited ? `Iki ${size} žm.` : 'Be apribojimų'}</dd>
          </dl>
        </div>
      </div>

      {going === undefined && (
        <label className="mt-6 flex items-start gap-3 rounded-[22px] bg-surface p-4 text-[13px] leading-snug text-slate-300">
          <input
            id="host-agreed"
            type="checkbox"
            checked={draft.hostAgreed}
            onChange={(e) => update({ hostAgreed: e.target.checked })}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-volt)]"
          />
          <span>
            Patvirtinu: susitikimo vieta vieša (ne namų adresas), aprašymas ir tempas teisingi, o
            pasikeitus planams treniruotę atšauksiu. Suprantu, kad dalyviai sportuoja savo
            atsakomybe, o PaceMates treniruočių neorganizuoja –{' '}
            <Link to="/salygos" target="_blank" className="font-bold text-white underline">
              sąlygos
            </Link>
            .
          </span>
        </label>
      )}
    </>
  )
}
