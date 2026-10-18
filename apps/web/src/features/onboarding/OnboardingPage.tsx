import {
  addDays,
  paceFit,
  toISODate,
  type DefaultPaces,
  type Profile,
  type SportDiscipline,
} from '@pacemates/shared'
import clsx from 'clsx'
import { Check, MapPin, MessagesSquare, Sparkles, Timer, UsersRound } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { MESSAGES } from '../../backend/messages'
import { Button, ButtonLink } from '../../components/Button'
import { CitySheet } from '../../components/CityPicker'
import { TextArea } from '../../components/Field'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { Logo } from '../../components/Logo'
import { useCity } from '../../data/city'
import { useMe, useSlots, useUpdateProfile } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { firstName } from '../../lib/format'
import { PHOTOS } from '../../lib/photos'
import { toast } from '../../lib/toast'
import { SlotRow } from '../slots/SlotRow'

const RUN_PACES = ['4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30']
const RIDE_SPEEDS = ['20', '23', '26', '29', '32', '35']
const STEPS = 4

export function OnboardingPage() {
  const me = useMe()
  if (me.isPending) return <FullScreenLoader />
  if (!me.data) return <Navigate to="/" replace />
  return <Onboarding profile={me.data} />
}

function Onboarding({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const update = useUpdateProfile()
  const [step, setStep] = useState(0)
  const [sports, setSports] = useState<SportDiscipline[]>(profile.sports)
  const [runPace, setRunPace] = useState<string | null>(
    profile.defaultPaces.running_easy?.match(/\d{1,2}:\d\d/)?.[0] ?? null,
  )
  const [rideSpeed, setRideSpeed] = useState<string | null>(
    profile.defaultPaces.cycling_avg?.match(/\d+/)?.[0] ?? null,
  )
  const [bio, setBio] = useState(profile.bio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Profile | null>(null)
  const city = useCity()
  const [cityOpen, setCityOpen] = useState(false)

  const toggleSport = (sport: SportDiscipline) => {
    setError(null)
    setSports((s) => (s.includes(sport) ? s.filter((x) => x !== sport) : [...s, sport]))
  }

  const skip = () =>
    update.mutate(
      { onboarded: true },
      {
        onSuccess: () => {
          track('onboarding_skipped')
          navigate('/', { replace: true })
        },
        onError: (e) => toast(e.message, 'error'),
      },
    )

  const finish = () => {
    const defaultPaces: DefaultPaces = { ...profile.defaultPaces }
    if (sports.includes('running') && runPace) defaultPaces.running_easy = `${runPace}/km`
    if (sports.includes('cycling') && rideSpeed) defaultPaces.cycling_avg = `${rideSpeed} km/h`
    update.mutate(
      { sports, defaultPaces, bio: bio.trim() || null, city: city.id, onboarded: true },
      {
        onSuccess: (saved) => {
          track('onboarding_completed', { sports: sports.join(',') || 'none' })
          setDone(saved)
        },
        onError: (e) => setError(e.message || MESSAGES.unknown),
      },
    )
  }

  const next = () => {
    if (step === 1 && sports.length === 0) {
      setError('Pasirink bent vieną sportą')
      return
    }
    setError(null)
    if (step === STEPS - 1) finish()
    else setStep(step + 1)
  }

  if (done) return <Done profile={done} />

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2">
        <div className="flex gap-1.5" aria-label={`${step + 1} žingsnis iš ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-8 bg-volt' : i < step ? 'w-3 bg-volt/60' : 'w-3 bg-raised',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          disabled={update.isPending}
          className="rounded-full px-3 py-2 text-[13px] font-bold text-slate-400 hover:text-white"
        >
          Praleisti
        </button>
      </header>

      <main
        key={step}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 motion-safe:animate-rise"
      >
        {step === 0 && <Intro name={firstName(profile.name)} />}
        {step === 1 && (
          <>
            <Title hint="Galėsi pakeisti bet kada profilyje.">Ką mėgsti?</Title>
            <div className="grid grid-cols-2 gap-3">
              <SportTile
                label="Bėgimas"
                photo={PHOTOS.runCoast}
                selected={sports.includes('running')}
                onClick={() => toggleSport('running')}
              />
              <SportTile
                label="Dviratis"
                photo={PHOTOS.rideGroup}
                selected={sports.includes('cycling')}
                onClick={() => toggleSport('cycling')}
              />
            </div>
            <p className="mt-6 mb-2 text-[13px] font-medium text-slate-300">
              Kur dažniausiai sportuoji?
            </p>
            <button
              type="button"
              onClick={() => setCityOpen(true)}
              className="flex h-14 w-full items-center gap-3 rounded-[18px] bg-raised px-4 text-left transition hover:bg-[#1f2440]"
            >
              <MapPin className="size-5 text-volt" aria-hidden />
              <span className="flex-1 text-[16px] font-bold text-white">{city.name}</span>
              <span className="text-[13px] font-bold text-volt">Keisti</span>
            </button>
            <CitySheet open={cityOpen} onClose={() => setCityOpen(false)} />
          </>
        )}
        {step === 2 && (
          <>
            <Title hint="Pagal tai parodysime, kurios grupės juda tavo tempu. Nežinai? Praleisk.">
              Koks tavo tempas?
            </Title>
            {sports.includes('running') && (
              <ChipGroup
                label="Lengvas bėgimas, min/km"
                options={RUN_PACES}
                value={runPace}
                onChange={setRunPace}
              />
            )}
            {sports.includes('cycling') && (
              <ChipGroup
                label="Vidutinis greitis dviračiu, km/h"
                options={RIDE_SPEEDS}
                value={rideSpeed}
                onChange={setRideSpeed}
              />
            )}
          </>
        )}
        {step === 3 && (
          <>
            <Title hint="Kiti matys tai tavo profilyje. Nebūtina.">Keli žodžiai apie tave</Title>
            <TextArea
              label="Apie tave"
              placeholder="Pvz.: Ruošiuosi pirmam pusmaratoniui, mėgstu rytinius bėgimus."
              maxLength={280}
              value={bio}
              hint={`${bio.length}/280`}
              onChange={(e) => setBio(e.target.value)}
            />
          </>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-blaze/15 px-4 py-3 text-sm font-semibold text-[#ff9466]"
          >
            {error}
          </p>
        )}
      </main>

      <footer className="flex shrink-0 gap-3 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            Atgal
          </Button>
        )}
        <Button size="lg" className="flex-1" loading={update.isPending} onClick={next}>
          {step === 0 ? 'Pradėkime' : step === STEPS - 1 ? 'Baigti' : 'Toliau'}
        </Button>
      </footer>
    </div>
  )
}

function Title({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-4 mb-6">
      <h1 className="headline text-[32px]">{children}</h1>
      {hint && <p className="mt-2 text-[14px] text-slate-400">{hint}</p>}
    </div>
  )
}

function Intro({ name }: { name: string }) {
  const points: [typeof UsersRound, string, string][] = [
    [Timer, 'Grupė tavo tempu', 'Iškart matai, ar grupė juda taip, kaip tau patinka.'],
    [UsersRound, 'Vienas paspaudimas', 'Prisijunk prie treniruotės ar sukurk savo.'],
    [MessagesSquare, 'Susitark pokalbyje', 'Kiekviena treniruotė turi grupės pokalbį.'],
  ]
  return (
    <>
      <div className="relative mt-2 h-56 overflow-hidden rounded-[28px]">
        <img src={PHOTOS.runCrew} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <Logo className="text-white" size={18} />
        </div>
      </div>
      <h1 className="headline mt-6 text-[46px]">
        Sveiki, <span className="text-volt">{name}!</span>
      </h1>
      <p className="mt-2 text-[15px] text-slate-400">
        Per minutę paruošime profilį, kad rastum savo grupę.
      </p>
      <ul className="mt-5 space-y-3">
        {points.map(([Icon, title, text]) => (
          <li key={title} className="flex gap-3 rounded-[20px] bg-surface p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue text-white">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-white">{title}</span>
              <span className="block text-[13px] text-slate-400">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function SportTile({
  label,
  photo,
  selected,
  onClick,
}: {
  label: string
  photo: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'relative flex h-56 flex-col justify-end overflow-hidden rounded-[24px] p-4 text-left transition active:scale-[0.98]',
        selected ? 'ring-3 ring-volt' : 'ring-1 ring-white/10',
      )}
    >
      <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
      <span
        className={clsx(
          'absolute top-3 left-3 grid size-9 place-items-center rounded-full',
          selected ? 'bg-volt text-black' : 'glass text-white',
        )}
      >
        {selected && <Check className="size-5" strokeWidth={3} aria-hidden />}
      </span>
      <span className="headline relative text-[30px] text-white">{label}</span>
    </button>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-2.5 text-[13px] font-bold text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? null : option)}
            className={clsx(
              'h-11 min-w-16 rounded-full px-4 font-display text-[18px] font-bold tabular transition-colors',
              value === option ? 'bg-volt text-black' : 'bg-raised text-white hover:bg-[#1f2440]',
            )}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={clsx(
            'h-11 rounded-full px-4 text-[13px] font-bold transition-colors',
            value === null ? 'bg-white text-black' : 'bg-raised text-slate-400',
          )}
        >
          Nežinau
        </button>
      </div>
    </fieldset>
  )
}

/** Finish line: a few workouts that suit the paces they just gave. */
function Done({ profile }: { profile: Profile }) {
  const today = toISODate(new Date())
  const city = useCity()
  const slots = useSlots(today, addDays(today, 13), city)
  const matches = useMemo(() => {
    const open = (slots.data ?? []).filter(
      (s) => s.status === 'OPEN' && s.date <= addDays(today, 6),
    )
    const scored = open.map((slot) => ({
      slot,
      fit: paceFit(slot.targetPace, slot.sportType, slot.vibeTag, profile.defaultPaces),
    }))
    const good = scored.filter((s) => s.fit === 'match' || s.fit === 'close')
    return (good.length > 0 ? good : scored).slice(0, 3).map((s) => s.slot)
  }, [slots.data, profile.defaultPaces, today])

  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-6">
        <span className="grid size-16 place-items-center rounded-full bg-volt text-black motion-safe:animate-pop">
          <Sparkles className="size-8" aria-hidden />
        </span>
        <h1 className="headline mt-5 text-[48px]">
          Viskas <span className="text-volt">paruošta!</span>
        </h1>
        <p className="mt-2 text-[15px] text-slate-400">
          Štai keletas artimiausių treniruočių, kurios tau gali tikti.
        </p>
        <div className="mt-5 space-y-2">
          {slots.isPending
            ? [0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[22px] bg-surface" />
              ))
            : matches.map((slot) => <SlotRow key={slot.id} slot={slot} />)}
          {!slots.isPending && matches.length === 0 && (
            <p className="rounded-[22px] bg-surface p-4 text-[14px] text-slate-400">
              Šią savaitę dar nėra atvirų treniruočių – sukurk pirmąją ir pakviesk kitus!
            </p>
          )}
        </div>
      </main>
      <footer className="flex shrink-0 flex-col gap-2 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        <ButtonLink to="/" replace size="lg">
          Į laiko juostą
        </ButtonLink>
      </footer>
    </div>
  )
}
