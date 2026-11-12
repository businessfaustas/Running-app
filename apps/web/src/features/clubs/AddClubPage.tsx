import { CITIES, CLUB_TYPES, newClubInputSchema, type ClubType } from '@pacemates/shared'
import clsx from 'clsx'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { CONTROL, TextArea, TextField } from '../../components/Field'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { TopBar } from '../../components/TopBar'
import { useCity } from '../../data/city'
import { useSubmitClub } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { toast, toastError } from '../../lib/toast'
import { CLUB_TYPE_META } from './meta'

const LINKS = [
  { key: 'website', label: 'Svetainė', placeholder: 'https://klubas.lt' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'strava', label: 'Strava', placeholder: 'https://strava.com/clubs/…' },
] as const
type LinkKey = (typeof LINKS)[number]['key']

/** "facebook.com/x" → "https://facebook.com/x"; empty → null. */
function toLink(text: string): string | null {
  const value = text.trim()
  if (!value) return null
  if (/^https:\/\//i.test(value)) return value
  return `https://${value.replace(/^http:\/\//i, '')}`
}

/** "Add your club": anyone signed in can suggest one; it's listed after we check it. */
export function AddClubPage() {
  const navigate = useNavigate()
  const home = useCity()
  const submit = useSubmitClub()
  const [name, setName] = useState('')
  const [types, setTypes] = useState<ClubType[]>([])
  const [city, setCity] = useState(home.name)
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState<string[]>([''])
  const [meetingPlace, setMeetingPlace] = useState('')
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [links, setLinks] = useState<Record<LinkKey, string>>({
    website: '',
    facebook: '',
    instagram: '',
    strava: '',
  })
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const town = CITIES.find((c) => c.name === city) ?? home
  const center = useMemo(() => ({ lat: town.lat, lng: town.lng }), [town])

  const input = {
    name,
    types,
    city,
    description,
    schedule: schedule.map((line) => line.trim()).filter(Boolean),
    meetingPlace: meetingPlace.trim() || null,
    website: toLink(links.website),
    facebook: toLink(links.facebook),
    instagram: toLink(links.instagram),
    strava: toLink(links.strava),
    email: email.trim() || null,
    location: point ?? { lat: NaN, lng: NaN },
  }
  const parsed = newClubInputSchema.safeParse(input)
  const issue = (field: string) =>
    parsed.success ? null : (parsed.error.issues.find((i) => i.path[0] === field)?.message ?? null)
  const errors = {
    name: issue('name'),
    types: issue('types'),
    description: issue('description'),
    schedule: issue('schedule'),
    meetingPlace: issue('meetingPlace'),
    website: issue('website'),
    facebook: issue('facebook'),
    instagram: issue('instagram'),
    strava: issue('strava'),
    email: issue('email'),
    location: point ? issue('location') : 'Pažymėk žemėlapyje, kur dažniausiai susitinkate',
    agreed: agreed ? null : 'Patvirtink, kad informacija vieša ir teisinga',
  }
  const shown = (error: string | null) => (showErrors ? error : null)

  const toggleType = (type: ClubType) =>
    setTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    )

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!parsed.success || Object.values(errors).some(Boolean)) {
      setShowErrors(true)
      // Bring the first problem into view.
      requestAnimationFrame(() =>
        document
          .querySelector('[aria-invalid="true"], [data-error]')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      )
      return
    }
    submit.mutate(parsed.data, {
      onSuccess: (club) => {
        track('club_submitted', { city: club.city })
        toast('Ačiū! Klubą peržiūrėsime ir paskelbsime.')
        navigate(`/clubs/${club.slug}`, { replace: true })
      },
      onError: toastError,
    })
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar fallback="/clubs" title="Pridėti klubą" />
      <form
        noValidate
        onSubmit={send}
        className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+32px)]"
      >
        <h1 className="headline text-[32px]">Pridėk savo klubą</h1>
        <p className="mt-2 text-[14px] leading-snug text-slate-400">
          Nerandi savo bėgimo, dviračių, plaukimo ar žygių klubo? Papasakok apie jį. Kol
          peržiūrėsime (paprastai per kelias dienas), klubą matysi tik tu.
        </p>

        <div className="mt-6 grid gap-5">
          <TextField
            label="Pavadinimas"
            placeholder="pvz., Bėgimo klubas „Vėjas“"
            maxLength={80}
            value={name}
            error={shown(errors.name)}
            onChange={(e) => setName(e.target.value)}
          />

          <fieldset {...(shown(errors.types) ? { 'data-error': '' } : {})}>
            <legend className="mb-2 text-[13px] font-medium text-slate-300">
              Sportas (iki trijų)
            </legend>
            <div className="flex flex-wrap gap-2">
              {CLUB_TYPES.map((type) => {
                const meta = CLUB_TYPE_META[type]
                const on = types.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleType(type)}
                    className={clsx(
                      'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors',
                      on ? 'bg-white text-black' : 'bg-raised text-slate-300 hover:text-white',
                    )}
                  >
                    {on ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    ) : (
                      <meta.Icon className="size-4" aria-hidden />
                    )}
                    {meta.label}
                  </button>
                )
              })}
            </div>
            {shown(errors.types) && (
              <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                {errors.types}
              </p>
            )}
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-slate-300">Miestas</span>
            <span className="relative block">
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value)
                  setPoint(null)
                }}
                className={clsx(CONTROL, 'h-13 appearance-none pr-10')}
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
            </span>
          </label>

          <TextArea
            label="Apie klubą"
            placeholder="Kas jūs, kam tinka treniruotės, ar laukiami naujokai…"
            maxLength={600}
            value={description}
            error={shown(errors.description)}
            onChange={(e) => setDescription(e.target.value)}
          />

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-slate-300">
              Treniruotės (nebūtina)
            </legend>
            <div className="grid gap-2">
              {schedule.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    aria-label={`Treniruotė ${i + 1}`}
                    value={line}
                    maxLength={120}
                    placeholder="pvz., Antradieniais 19:00 – intervalai stadione"
                    onChange={(e) =>
                      setSchedule((all) => all.map((l, j) => (j === i ? e.target.value : l)))
                    }
                    className={clsx(CONTROL, 'h-12 min-w-0 flex-1')}
                  />
                  {schedule.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Pašalinti treniruotę ${i + 1}`}
                      onClick={() => setSchedule((all) => all.filter((_, j) => j !== i))}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-slate-300"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {schedule.length < 5 && (
              <button
                type="button"
                onClick={() => setSchedule((all) => [...all, ''])}
                className="mt-2 flex items-center gap-1 text-[13px] font-bold text-volt"
              >
                <Plus className="size-4" aria-hidden />
                Dar viena treniruotė
              </button>
            )}
            {shown(errors.schedule) && (
              <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                {errors.schedule}
              </p>
            )}
          </fieldset>

          <div {...(shown(errors.location) ? { 'data-error': '' } : {})}>
            <p className="mb-1.5 text-[13px] font-medium text-slate-300">Kur susitinkate?</p>
            <div className="relative h-56 overflow-hidden rounded-[24px] border border-white/10">
              <LazyLocationMap
                key={town.id}
                point={point}
                onPick={setPoint}
                zoom={12}
                fallbackCenter={center}
              />
            </div>
            {shown(errors.location) ? (
              <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                {errors.location}
              </p>
            ) : (
              <p className="mt-1.5 text-[13px] text-slate-500">
                Bakstelk žemėlapį – vieša vieta: parkas, stadionas, klubo patalpos.
              </p>
            )}
          </div>

          <TextField
            label="Susitikimo vieta (nebūtina)"
            placeholder="pvz., Danės krantinė, prie Meridiano"
            maxLength={120}
            value={meetingPlace}
            error={shown(errors.meetingPlace)}
            onChange={(e) => setMeetingPlace(e.target.value)}
          />

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[13px] font-bold text-slate-300">
              Nuorodos (nebūtina)
            </legend>
            {LINKS.map(({ key, label, placeholder }) => (
              <TextField
                key={key}
                label={label}
                inputMode="url"
                autoCapitalize="none"
                placeholder={placeholder}
                value={links[key]}
                error={shown(errors[key])}
                onChange={(e) => setLinks((all) => ({ ...all, [key]: e.target.value }))}
              />
            ))}
            <TextField
              label="Klubo el. paštas"
              type="email"
              inputMode="email"
              hint="Tik viešas klubo adresas – ne asmeninis."
              value={email}
              error={shown(errors.email)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </fieldset>

          <div {...(shown(errors.agreed) ? { 'data-error': '' } : {})}>
            <label className="flex items-start gap-3 rounded-[22px] bg-surface p-4 text-[13px] leading-snug text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--color-volt)]"
              />
              <span>
                Patvirtinu, kad informacija teisinga ir vieša (pvz., priklausau klubui ar jį
                organizuoju), o kitų žmonių asmens duomenų neskelbiu. Daugiau –{' '}
                <Link to="/salygos" target="_blank" className="font-bold text-white underline">
                  sąlygose
                </Link>
                .
              </span>
            </label>
            {shown(errors.agreed) && (
              <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                {errors.agreed}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" loading={submit.isPending}>
            Pateikti klubą
          </Button>
        </div>
      </form>
    </div>
  )
}
