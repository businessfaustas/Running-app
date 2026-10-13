import {
  addDays,
  minutesToTime,
  newSlotInputSchema,
  timeToMinutes,
  toISODate,
  type NewSlotInput,
  type SportType,
  type VibeTag,
} from '@grouppace/shared'
import clsx from 'clsx'
import { Check, LocateFixed, MapPin, Minus, Plus, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { TextArea, TextField } from '../../components/Field'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { useCreateSlot, useMe, useSlots } from '../../data/hooks'
import { formatKm, relativeDay } from '../../lib/format'
import { toast, toastError } from '../../lib/toast'
import { useDiscoverStore } from '../discover/store'
import { SPORT_META, SPORT_ORDER, VIBE_META, VIBE_ORDER } from '../slots/meta'

const STEPS = ['Sport', 'When', 'Distance', 'Vibe', 'Where', 'Details'] as const
const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240]
const DISTANCE_PRESETS: Record<SportType, number[]> = {
  RUN: [5, 8, 10, 15, 21.1, 30],
  TRACK: [5, 6, 8, 10],
  CYCLING: [40, 60, 80, 100, 120],
  GRAVEL: [30, 45, 60, 80],
}
const PACE_RE = /^\d{1,2}:[0-5]\d$/
const SPEED_RE = /^\d{1,2}(?:[.,]\d)?$/

interface Draft {
  sportType: SportType | null
  date: string
  startTime: string
  durationMin: number
  distanceKm: string
  paceFrom: string
  paceTo: string
  vibeTag: VibeTag | null
  description: string
  meetingPoint: { name: string; lat: number; lng: number } | null
  title: string
  maxParticipants: number | null
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m}`
}

function defaultStart(date: string, today: string): string {
  if (date !== today) return '08:00'
  const now = new Date()
  const next = Math.min((now.getHours() + 1) * 60, 22 * 60)
  return minutesToTime(next)
}

function suggestTitle(draft: Draft): string {
  if (!draft.sportType || !draft.vibeTag) return ''
  const noun = SPORT_META[draft.sportType].noun
  const km = Number(draft.distanceKm.replace(',', '.'))
  const distance = km > 0 ? `${formatKm(km)} km ` : ''
  const ride = SPORT_META[draft.sportType].measure === 'speed'
  const title = {
    ZONE_2_COFFEE: `${distance}easy ${noun} + coffee`,
    SOCIAL_CHAT: `Social ${distance}${noun}`,
    LONG_RUN: `${distance}long ${noun}`,
    PACE_PUSH: `${distance}${ride ? 'fast' : 'tempo'} ${noun}`,
    INTERVALS: `${noun === 'track session' ? 'Track' : 'Interval'} session`,
  }[draft.vibeTag]
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function targetPace(draft: Draft): string {
  const from = draft.paceFrom.trim().replace(',', '.')
  const to = draft.paceTo.trim().replace(',', '.')
  const range = to && to !== from ? `${from}–${to}` : from
  return draft.sportType && SPORT_META[draft.sportType].measure === 'speed'
    ? `${range} km/h`
    : `${range} /km`
}

function endTime(draft: Draft): string | null {
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
    distanceKm: Number(draft.distanceKm.replace(',', '.')),
    targetPace: targetPace(draft),
    vibeTag: draft.vibeTag!,
    description: draft.description.trim() || null,
    meetingPoint: draft.meetingPoint!,
    maxParticipants: draft.maxParticipants,
  }
}

/** The first problem with the current step, or null when it's complete. */
function stepError(step: number, draft: Draft): string | null {
  const measure = draft.sportType ? SPORT_META[draft.sportType].measure : 'pace'
  switch (step) {
    case 0:
      return draft.sportType ? null : 'Pick a sport'
    case 1:
      if (!/^\d\d:\d\d$/.test(draft.startTime)) return 'Pick a start time'
      return timeToMinutes(draft.startTime) + draft.durationMin > 24 * 60
        ? 'It has to finish by midnight'
        : null
    case 2: {
      const km = Number(draft.distanceKm.replace(',', '.'))
      if (!(km > 0) || km > 400) return 'Enter a distance'
      const re = measure === 'pace' ? PACE_RE : SPEED_RE
      const example = measure === 'pace' ? 'like 5:30' : 'like 28'
      if (!re.test(draft.paceFrom.trim())) return `Enter a target ${measure}, ${example}`
      if (draft.paceTo.trim() && !re.test(draft.paceTo.trim())) return `Check the second ${measure}`
      return null
    }
    case 3:
      return draft.vibeTag ? null : 'Pick a vibe'
    case 4:
      if (!draft.meetingPoint) return 'Tap the map to drop a pin'
      return draft.meetingPoint.name.trim().length >= 2 ? null : 'Name the meeting point'
    default: {
      const parsed = newSlotInputSchema.safeParse(toInput(draft))
      return parsed.success ? null : parsed.error.issues[0]!.message
    }
  }
}

export function CreateWorkoutPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = toISODate(new Date())
  const me = useMe()
  const create = useCreateSlot()
  const showSlot = useDiscoverStore((s) => s.showSlot)

  const initialDate = params.get('date') ?? today
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => ({
    sportType: null,
    date: initialDate >= today ? initialDate : today,
    startTime: params.get('time') ?? defaultStart(initialDate, today),
    durationMin: 60,
    distanceKm: '',
    paceFrom: '',
    paceTo: '',
    vibeTag: null,
    description: '',
    meetingPoint: null,
    title: '',
    maxParticipants: 6,
  }))

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const error = stepError(step, draft)
  const last = step === STEPS.length - 1

  const close = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))

  const chooseSport = (sportType: SportType) => {
    // Prefill the athlete's usual pace for this sport.
    const paces = me.data?.defaultPaces ?? {}
    const usual =
      sportType === 'RUN' || sportType === 'TRACK'
        ? paces.running_easy
        : sportType === 'GRAVEL'
          ? (paces.gravel_avg ?? paces.cycling_avg)
          : paces.cycling_avg
    const sameMeasure =
      draft.sportType && SPORT_META[draft.sportType].measure === SPORT_META[sportType].measure
    update({
      sportType,
      ...(sameMeasure
        ? {}
        : { paceFrom: usual?.match(/[\d:.,]+/)?.[0] ?? '', paceTo: '', distanceKm: '' }),
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
    create.mutate(toInput(draft), {
      onSuccess: (slot) => {
        showSlot(slot.id, slot.date)
        toast('Workout posted')
        navigate('/', { replace: true })
      },
      onError: toastError,
    })
  }

  const accent = draft.sportType ? SPORT_META[draft.sportType].accent : 'var(--color-volt)'

  return (
    <div className="flex h-full flex-col" style={{ '--accent': accent } as CSSProperties}>
      <header className="shrink-0 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between px-2">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full text-zinc-300 hover:bg-white/5"
          >
            <X className="size-5" aria-hidden />
          </button>
          <p className="text-[15px] font-semibold">New workout</p>
          <p className="w-10 text-center text-[13px] text-zinc-500 tabular">
            {step + 1}/{STEPS.length}
          </p>
        </div>
        <div className="flex gap-1 px-4 pb-3" aria-hidden>
          {STEPS.map((name, i) => (
            <span
              key={name}
              className={clsx(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                i <= step ? 'bg-(--accent)' : 'bg-raised',
              )}
            />
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-8" key={step}>
        <div className="motion-safe:animate-rise">
          {step === 0 && <SportStep draft={draft} onChoose={chooseSport} />}
          {step === 1 && <WhenStep draft={draft} update={update} today={today} />}
          {step === 2 && (
            <DistanceStep draft={draft} update={update} usual={me.data?.defaultPaces} />
          )}
          {step === 3 && <VibeStep draft={draft} update={update} />}
          {step === 4 && <WhereStep draft={draft} update={update} today={today} />}
          {step === 5 && <DetailsStep draft={draft} update={update} today={today} />}
        </div>
        {showErrors && error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-400">
            {error}
          </p>
        )}
      </main>

      <footer className="flex shrink-0 gap-3 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={next} loading={create.isPending}>
          {last ? 'Post workout' : 'Next'}
        </Button>
      </footer>
    </div>
  )
}

function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-[28px] leading-tight font-bold tracking-wide uppercase">
        {title}
      </h1>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
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
        'rounded-xl border text-left transition-colors duration-150 active:scale-[0.98]',
        selected
          ? 'border-(--accent) bg-(--accent)/10 text-white'
          : 'border-line bg-surface text-zinc-200 hover:border-zinc-600',
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
        'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium tabular transition-colors',
        selected
          ? 'border-zinc-100 bg-zinc-100 text-black'
          : 'border-line text-zinc-300 hover:border-zinc-600',
      )}
    >
      {children}
    </button>
  )
}

function SportStep({ draft, onChoose }: { draft: Draft; onChoose: (s: SportType) => void }) {
  return (
    <>
      <Question title="What are you doing?" />
      <div className="grid grid-cols-2 gap-3">
        {SPORT_ORDER.map((sport) => {
          const meta = SPORT_META[sport]
          return (
            <Choice
              key={sport}
              selected={draft.sportType === sport}
              onClick={() => onChoose(sport)}
              className="flex h-28 flex-col justify-between p-4"
            >
              <meta.Icon className="size-6" style={{ color: meta.accent }} aria-hidden />
              <span className="text-[15px] font-semibold">{meta.label}</span>
            </Choice>
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
  const end = endTime(draft)
  return (
    <>
      <Question title="When?" />
      <p className="mb-2 text-[13px] font-medium text-zinc-300">Day</p>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {days.map((date) => (
          <Chip key={date} selected={draft.date === date} onClick={() => update({ date })}>
            {relativeDay(date, today)}
          </Chip>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <TextField
          label="Start"
          type="time"
          step={300}
          value={draft.startTime}
          onChange={(e) => update({ startTime: e.target.value })}
          className="tabular"
        />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-zinc-300">Finish</p>
          <p className="flex h-12 items-center rounded-xl border border-dashed border-line px-3.5 text-[15px] text-zinc-400 tabular">
            {end ?? 'After midnight'}
          </p>
        </div>
      </div>

      <p className="mt-6 mb-2 text-[13px] font-medium text-zinc-300">How long, roughly?</p>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((minutes) => (
          <Chip
            key={minutes}
            selected={draft.durationMin === minutes}
            onClick={() => update({ durationMin: minutes })}
          >
            {formatDuration(minutes)}
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
  const pace = SPORT_META[sport].measure === 'pace'
  const usualText = pace
    ? usual?.running_easy
    : sport === 'GRAVEL'
      ? (usual?.gravel_avg ?? usual?.cycling_avg)
      : usual?.cycling_avg
  return (
    <>
      <Question title="How far, how fast?" />
      <TextField
        label="Distance"
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
            selected={Number(draft.distanceKm.replace(',', '.')) === km}
            onClick={() => update({ distanceKm: String(km) })}
          >
            {formatKm(km)} km
          </Chip>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <TextField
          label={pace ? 'Target pace' : 'Average speed'}
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={pace ? '5:15' : '26'}
          suffix={pace ? '/km' : 'km/h'}
          value={draft.paceFrom}
          onChange={(e) => update({ paceFrom: e.target.value })}
        />
        <TextField
          label="Up to (optional)"
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={pace ? '5:30' : '28'}
          suffix={pace ? '/km' : 'km/h'}
          value={draft.paceTo}
          onChange={(e) => update({ paceTo: e.target.value })}
        />
      </div>
      <p className="mt-2 text-[13px] text-zinc-500">
        {usualText
          ? `Your usual is ${usualText}. A range helps people see if they'll fit in.`
          : 'A range helps people see if they will fit in.'}
      </p>
    </>
  )
}

function VibeStep({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  return (
    <>
      <Question title="What's the vibe?" />
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
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised">
                <meta.Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{meta.label}</span>
                <span className="block text-[13px] text-zinc-400">{meta.blurb}</span>
              </span>
              {selected && <Check className="size-5 text-(--accent)" aria-hidden />}
            </Choice>
          )
        })}
      </div>
      <div className="mt-6">
        <TextArea
          label="Notes (optional)"
          placeholder="Route, where exactly to wait, what to bring…"
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
  const slots = useSlots(today, addDays(today, 13))
  const [locating, setLocating] = useState(false)
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
      toast("This browser can't share your location", 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        pick({ lng: pos.coords.longitude, lat: pos.coords.latitude })
      },
      () => {
        setLocating(false)
        toast("Couldn't get your location", 'error')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <>
      <Question
        title="Where do you meet?"
        hint="Tap the map to drop a pin, or pick a known spot."
      />
      <div className="relative h-56 overflow-hidden rounded-xl border border-line">
        <LazyLocationMap
          point={lngLat}
          onPick={pick}
          accent={draft.sportType ? SPORT_META[draft.sportType].accent : undefined}
          zoom={13}
        />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-ink/90 px-3 py-1.5 text-[13px] font-medium text-white shadow-lg backdrop-blur disabled:opacity-60"
        >
          <LocateFixed className={clsx('size-4', locating && 'animate-pulse')} aria-hidden />
          Use my location
        </button>
      </div>

      {popular.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[13px] font-medium text-zinc-300">Popular spots</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((spot) => (
              <Chip
                key={spot.name}
                selected={point?.name === spot.name && point.lat === spot.lat}
                onClick={() => update({ meetingPoint: { ...spot } })}
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
          label="Meeting point name"
          placeholder="e.g. Vondelpark, by the tea house"
          value={point?.name ?? ''}
          disabled={!point}
          hint={point ? 'What people will look for when they arrive.' : 'Drop a pin first.'}
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
}: {
  draft: Draft
  update: (p: Partial<Draft>) => void
  today: string
}) {
  const sport = SPORT_META[draft.sportType!]
  const vibe = VIBE_META[draft.vibeTag!]
  const limited = draft.maxParticipants !== null
  const size = draft.maxParticipants ?? 6
  return (
    <>
      <Question title="Last details" />
      <TextField
        label="Name"
        placeholder={suggestTitle(draft)}
        maxLength={120}
        value={draft.title}
        hint="Leave it empty to use the suggestion."
        onChange={(e) => update({ title: e.target.value })}
      />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-medium text-white">Limit group size</p>
          <p className="text-[13px] text-zinc-500">Including you</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={limited}
          aria-label="Limit group size"
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
        <div className="mt-3 flex items-center justify-center gap-6 rounded-xl border border-line bg-surface py-3">
          <button
            type="button"
            aria-label="Fewer people"
            onClick={() => update({ maxParticipants: Math.max(2, size - 1) })}
            className="grid size-10 place-items-center rounded-full bg-raised text-white disabled:opacity-40"
            disabled={size <= 2}
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-16 text-center font-display text-3xl font-bold tabular">{size}</span>
          <button
            type="button"
            aria-label="More people"
            onClick={() => update({ maxParticipants: Math.min(50, size + 1) })}
            className="grid size-10 place-items-center rounded-full bg-raised text-white disabled:opacity-40"
            disabled={size >= 50}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="mt-7 rounded-xl border border-line bg-surface p-4">
        <p className="text-[12px] font-semibold tracking-wider text-(--accent) uppercase">
          {sport.label} · {relativeDay(draft.date, today)}
        </p>
        <p className="mt-1 text-[17px] font-semibold text-white">
          {draft.title.trim() || suggestTitle(draft)}
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className="text-zinc-500">Time</dt>
          <dd className="text-zinc-200 tabular">
            {draft.startTime}
            {endTime(draft) && `–${endTime(draft)}`}
          </dd>
          <dt className="text-zinc-500">Distance</dt>
          <dd className="text-zinc-200">
            {formatKm(Number(draft.distanceKm.replace(',', '.')))} km at {targetPace(draft)}
          </dd>
          <dt className="text-zinc-500">Vibe</dt>
          <dd className="text-zinc-200">{vibe.label}</dd>
          <dt className="text-zinc-500">Meet</dt>
          <dd className="truncate text-zinc-200">{draft.meetingPoint?.name}</dd>
          <dt className="text-zinc-500">Group</dt>
          <dd className="text-zinc-200">{limited ? `Up to ${size}` : 'No limit'}</dd>
        </dl>
      </div>
    </>
  )
}
