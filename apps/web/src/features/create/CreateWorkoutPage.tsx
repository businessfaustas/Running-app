import {
  addDays,
  minutesToTime,
  newSlotInputSchema,
  timeToMinutes,
  type NewSlotInput,
  type SportType,
  type VibeTag,
} from '@pacemates/shared'
import clsx from 'clsx'
import { todayISO, wallClock } from '../../lib/clock'
import { Check, House, LocateFixed, MapPin, Minus, Plus, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { TextArea, TextField } from '../../components/Field'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { useCity } from '../../data/city'
import { useCreateSlot, useMe, useSlots } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { celebrate } from '../../lib/celebrate'
import { formatKm, formatMinutes, relativeDay } from '../../lib/format'
import { PHOTOS } from '../../lib/photos'
import { toast, toastError } from '../../lib/toast'
import { useDiscoverStore } from '../discover/store'
import { SPORT_META, SPORT_ORDER, VIBE_META, VIBE_ORDER } from '../slots/meta'

const STEPS = ['Sportas', 'Laikas', 'Atstumas', 'Pobūdis', 'Vieta', 'Detalės'] as const
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
  /** The host confirms the organiser rules before publishing. */
  hostAgreed: boolean
}

const SPORT_PHOTO: Record<SportType, { src: string; position: string }> = {
  RUN: { src: PHOTOS.runCrew, position: '50% 40%' },
  TRACK: { src: PHOTOS.runCoast, position: '50% 60%' },
  CYCLING: { src: PHOTOS.rideGroup, position: '50% 45%' },
  GRAVEL: { src: PHOTOS.rideGroup, position: '20% 70%' },
}

/** What the workout is, for generated names: "10 km bėgimas kompanijoje". */
const NOUN: Record<SportType, string> = {
  RUN: 'bėgimas',
  TRACK: 'treniruotė stadione',
  CYCLING: 'važiavimas plentu',
  GRAVEL: 'žvyrkelio išvyka',
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
  const km = Number(draft.distanceKm.replace(',', '.'))
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
      return draft.sportType ? null : 'Pasirink sportą'
    case 1:
      if (!/^\d\d:\d\d$/.test(draft.startTime)) return 'Pasirink pradžios laiką'
      return timeToMinutes(draft.startTime) + draft.durationMin > 24 * 60
        ? 'Treniruotė turi baigtis iki vidurnakčio'
        : null
    case 2: {
      const km = Number(draft.distanceKm.replace(',', '.'))
      if (!(km > 0) || km > 400) return 'Įvesk atstumą'
      const re = measure === 'pace' ? PACE_RE : SPEED_RE
      if (!re.test(draft.paceFrom.trim())) {
        return measure === 'pace'
          ? 'Įvesk tikslinį tempą, pvz., 5:30'
          : 'Įvesk vidutinį greitį, pvz., 28'
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

export function CreateWorkoutPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = todayISO()
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
    hostAgreed: false,
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
        track('workout_created', { sport: slot.sportType, vibe: slot.vibeTag })
        showSlot(slot.id, slot.date)
        navigate('/', { replace: true })
        celebrate({ kind: 'posted', slotId: slot.id, title: slot.title })
      },
      onError: toastError,
    })
  }

  const accent = draft.sportType ? SPORT_META[draft.sportType].accent : 'var(--color-volt)'

  return (
    <div className="flex h-full flex-col" style={{ '--accent': accent } as CSSProperties}>
      <header className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center justify-between px-3">
          <button
            type="button"
            onClick={close}
            aria-label="Uždaryti"
            className="grid size-11 place-items-center rounded-full bg-raised text-white transition hover:bg-[#2a2a2e] active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
          <p className="text-center leading-tight">
            <span className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
              Nauja treniruotė
            </span>
            <span className="block text-[15px] font-bold">{STEPS[step]}</span>
          </p>
          <p className="grid size-11 place-items-center font-display text-[17px] font-bold text-slate-400 tabular">
            {step + 1}/{STEPS.length}
          </p>
        </div>
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
          {step === 5 && <DetailsStep draft={draft} update={update} today={today} />}
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
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            Atgal
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={next} loading={create.isPending}>
          {last ? 'Paskelbti treniruotę' : 'Toliau'}
        </Button>
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
          const photo = SPORT_PHOTO[sport]
          const selected = draft.sportType === sport
          return (
            <button
              key={sport}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(sport)}
              style={{ '--tile': meta.accent } as CSSProperties}
              className={clsx(
                'relative flex h-44 flex-col justify-end overflow-hidden rounded-[24px] p-4 text-left transition active:scale-[0.98]',
                selected ? 'ring-3 ring-(--tile)' : 'ring-1 ring-white/10',
              )}
            >
              <img
                src={photo.src}
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{ objectPosition: photo.position }}
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
              <span className="headline relative text-[28px] text-white">{meta.label}</span>
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
            {end ?? 'Po vidurnakčio'}
          </p>
        </div>
      </div>

      <p className="mt-6 mb-2 text-[13px] font-bold text-slate-300">Kiek maždaug truks?</p>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((minutes) => (
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
  const pace = SPORT_META[sport].measure === 'pace'
  const usualText = pace
    ? usual?.running_easy
    : sport === 'GRAVEL'
      ? (usual?.gravel_avg ?? usual?.cycling_avg)
      : usual?.cycling_avg
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
            selected={Number(draft.distanceKm.replace(',', '.')) === km}
            onClick={() => update({ distanceKm: String(km) })}
          >
            {formatKm(km)} km
          </Chip>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <TextField
          label={pace ? 'Tikslinis tempas' : 'Vidutinis greitis'}
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={pace ? '5:15' : '26'}
          suffix={pace ? '/km' : 'km/h'}
          value={draft.paceFrom}
          onChange={(e) => update({ paceFrom: e.target.value })}
        />
        <TextField
          label="Iki (nebūtina)"
          inputMode={pace ? 'text' : 'decimal'}
          placeholder={pace ? '5:30' : '28'}
          suffix={pace ? '/km' : 'km/h'}
          value={draft.paceTo}
          onChange={(e) => update({ paceTo: e.target.value })}
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
          <p className="text-[13px] text-slate-500">Įskaitant tave</p>
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
            onClick={() => update({ maxParticipants: Math.max(2, size - 1) })}
            className="grid size-10 place-items-center rounded-full bg-raised text-white disabled:opacity-40"
            disabled={size <= 2}
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
          <img
            src={SPORT_PHOTO[draft.sportType!].src}
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: SPORT_PHOTO[draft.sportType!].position }}
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
          pasikeitus planams treniruotę atšauksiu. Suprantu, kad dalyviai sportuoja savo atsakomybe,
          o PaceMates treniruočių neorganizuoja –{' '}
          <Link to="/salygos" target="_blank" className="font-bold text-white underline">
            sąlygos
          </Link>
          .
        </span>
      </label>
    </>
  )
}
