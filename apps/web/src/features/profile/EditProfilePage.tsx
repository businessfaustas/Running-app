import type { DefaultPaces, Profile, SportDiscipline } from '@pacemates/shared'
import clsx from 'clsx'
import { Bike, Footprints } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { TextArea, TextField } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useMe, useUpdateProfile } from '../../data/hooks'
import { toast, toastError } from '../../lib/toast'

const PACE_RE = /^\d{1,2}:[0-5]\d$/
const SPEED_RE = /^\d{1,2}(?:[.,]\d)?$/

type PaceKey = keyof DefaultPaces
const PACE_FIELDS: { key: PaceKey; label: string; kind: 'pace' | 'speed'; placeholder: string }[] =
  [
    { key: 'running_easy', label: 'Lengvas bėgimas', kind: 'pace', placeholder: '5:45' },
    { key: 'running_tempo', label: 'Tempinis bėgimas', kind: 'pace', placeholder: '4:50' },
    { key: 'cycling_avg', label: 'Plentas', kind: 'speed', placeholder: '28' },
    { key: 'gravel_avg', label: 'Žvyrkelis', kind: 'speed', placeholder: '23' },
  ]

/** "5:30/km" → "5:30", "28 km/h" → "28" for editing. */
const stripUnit = (value?: string) => value?.match(/[\d:.,]+/)?.[0] ?? ''

export function EditProfilePage() {
  const me = useMe()
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Redaguoti profilį" fallback="/profile" />
      {me.data ? <ProfileForm profile={me.data} /> : null}
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const welcome = params.has('welcome')
  const update = useUpdateProfile()

  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [sports, setSports] = useState<SportDiscipline[]>(profile.sports)
  const [stravaId, setStravaId] = useState(profile.stravaId ?? '')
  const [paces, setPaces] = useState<Record<PaceKey, string>>(() => ({
    running_easy: stripUnit(profile.defaultPaces.running_easy),
    running_tempo: stripUnit(profile.defaultPaces.running_tempo),
    cycling_avg: stripUnit(profile.defaultPaces.cycling_avg),
    gravel_avg: stripUnit(profile.defaultPaces.gravel_avg),
  }))
  const [submitted, setSubmitted] = useState(false)

  const paceError = (key: PaceKey, kind: 'pace' | 'speed') => {
    const value = paces[key].trim()
    if (!value) return null
    if (kind === 'pace' && !PACE_RE.test(value)) return 'Rašyk min:sek, pvz., 5:30'
    if (kind === 'speed' && !SPEED_RE.test(value)) return 'Rašyk skaičių, pvz., 28'
    return null
  }
  const nameError = name.trim().length < 2 ? 'Įvesk savo vardą' : null
  const hasErrors = Boolean(nameError) || PACE_FIELDS.some((f) => paceError(f.key, f.kind))

  const toggleSport = (sport: SportDiscipline) =>
    setSports((current) =>
      current.includes(sport) ? current.filter((s) => s !== sport) : [...current, sport],
    )

  const save = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors) return
    const defaultPaces: DefaultPaces = {}
    for (const { key, kind } of PACE_FIELDS) {
      const value = paces[key].trim().replace(',', '.')
      if (value) defaultPaces[key] = kind === 'pace' ? `${value}/km` : `${value} km/h`
    }
    update.mutate(
      {
        name: name.trim(),
        bio: bio.trim() || null,
        sports,
        defaultPaces,
        stravaId: stravaId.trim() || null,
      },
      {
        onSuccess: () => {
          toast('Profilis išsaugotas')
          navigate('/profile', { replace: true })
        },
        onError: toastError,
      },
    )
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-5 pb-8">
        {welcome && (
          <div className="rounded-[22px] bg-blue px-4 py-4 text-sm text-white/90">
            <p className="headline text-[26px] text-white">
              Sveiki atvykę į Pace<span className="text-volt">Mates</span>
            </p>
            <p className="mt-1">
              Nurodyk savo įprastus tempus – organizatoriai ir kiti matys, ar tau tiks jų grupė.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Avatar user={{ ...profile, name: name || profile.name }} size={64} />
          <p className="text-[13px] text-slate-500">
            {profile.avatarUrl ? 'Profilio nuotrauka' : 'Kol neturi nuotraukos, rodomi tavo inicialai.'}
          </p>
        </div>

        <TextField
          label="Vardas ir pavardė"
          value={name}
          maxLength={80}
          autoComplete="name"
          error={submitted ? nameError : null}
          onChange={(e) => setName(e.target.value)}
        />
        <TextArea
          label="Apie tave"
          placeholder="Kam ruošiesi, kas tau patinka grupėje…"
          maxLength={280}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-300">Sportas</p>
          <div className="flex gap-2">
            {(
              [
                ['running', 'Bėgimas', Footprints],
                ['cycling', 'Dviratis', Bike],
              ] as const
            ).map(([id, label, Icon]) => {
              const active = sports.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSport(id)}
                  className={clsx(
                    'flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-bold transition-colors',
                    active ? 'bg-volt text-black' : 'bg-raised text-slate-300 hover:text-white',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-medium text-slate-300">Įprasti tempai</p>
          <p className="mb-3 text-[13px] text-slate-500">
            Pagal juos rodome, ar grupė bėga tavo tempu. Ko nedarai – palik tuščią.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PACE_FIELDS.map(({ key, label, kind, placeholder }) => (
              <TextField
                key={key}
                label={label}
                placeholder={placeholder}
                inputMode={kind === 'pace' ? 'text' : 'decimal'}
                suffix={kind === 'pace' ? '/km' : 'km/h'}
                value={paces[key]}
                error={paceError(key, kind)}
                onChange={(e) => setPaces((p) => ({ ...p, [key]: e.target.value }))}
              />
            ))}
          </div>
        </div>

        <TextField
          label="Strava ID (nebūtina)"
          placeholder="12345678"
          inputMode="numeric"
          value={stravaId}
          hint="Skaičius tavo Strava profilio nuorodos gale."
          onChange={(e) => setStravaId(e.target.value)}
        />
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="w-full" loading={update.isPending}>
          Išsaugoti
        </Button>
      </div>
    </form>
  )
}
