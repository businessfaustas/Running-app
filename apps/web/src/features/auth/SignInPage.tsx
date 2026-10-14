import clsx from 'clsx'
import { CircleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { backend } from '../../backend'
import { MESSAGES } from '../../backend/messages'
import { Button } from '../../components/Button'
import { PasswordChecklist, PasswordField, TextField } from '../../components/Field'
import { Logo } from '../../components/Logo'
import { TopBar } from '../../components/TopBar'
import { MIN_AGE } from '../../content/legal'
import { useSession } from '../../data/auth'
import { track } from '../../lib/analytics'
import { PHOTOS } from '../../lib/photos'
import { toast } from '../../lib/toast'
import { useCooldown } from '../../lib/useCooldown'
import { emailError, nameError, passwordChecks, passwordError } from '../../lib/validation'
import { CheckEmail } from './CheckEmail'
import { safeNext } from './safeNext'
import { useSampleSignIn } from './useSampleSignIn'

type Mode = 'signin' | 'signup'
type FieldName = 'name' | 'email' | 'password' | 'terms'

/** After this many wrong passwords in a row the form pauses (the server limits too). */
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export function SignInPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const session = useSession()
  const [signedInOnArrival] = useState(() => session !== null)
  const next = safeNext(params.get('next'))
  const sample = useSampleSignIn(next)

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [touched, setTouched] = useState<Set<FieldName>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const [failures, setFailures] = useState(0)
  const lockout = useCooldown()

  // Arrived already signed in (e.g. pressed back after signing in).
  if (signedInOnArrival) return <Navigate to={next} replace />

  const signup = mode === 'signup'
  const errors: Record<FieldName, string | null> = {
    name: signup ? nameError(name) : null,
    email: emailError(email),
    password: signup ? passwordError(password) : password ? null : 'Įvesk slaptažodį',
    terms: signup && !acceptTerms ? 'Pažymėk, kad sutinki su sąlygomis' : null,
  }
  const shown = (field: FieldName) => (submitted || touched.has(field) ? errors[field] : null)
  const touch = (field: FieldName) => setTouched((t) => new Set(t).add(field))

  const switchMode = (to: Mode) => {
    setMode(to)
    setSubmitted(false)
    setTouched(new Set())
    setFormError(null)
    setUnconfirmed(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    setUnconfirmed(null)
    const firstInvalid = (['name', 'email', 'password', 'terms'] as const).find((f) => errors[f])
    if (firstInvalid) {
      document.getElementById(`auth-${firstInvalid}`)?.focus()
      return
    }
    if (lockout.remaining > 0) return

    setBusy(true)
    try {
      if (!signup) {
        await backend.signIn({ email, password })
        track('sign_in')
        navigate(next, { replace: true })
        return
      }
      const { needsEmailConfirmation } = await backend.signUp({ name, email, password })
      track('sign_up')
      if (needsEmailConfirmation) setConfirmEmail(email.trim())
      else navigate('/onboarding', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : MESSAGES.unknown
      setFormError(message)
      if (message === MESSAGES.emailNotConfirmed) setUnconfirmed(email.trim())
      if (message === MESSAGES.wrongCredentials) {
        const count = failures + 1
        if (count >= MAX_FAILED_ATTEMPTS) {
          lockout.start(LOCKOUT_SECONDS)
          setFailures(0)
        } else {
          setFailures(count)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const resendConfirmation = async () => {
    if (!unconfirmed) return
    try {
      await backend.resendConfirmation(unconfirmed)
      setConfirmEmail(unconfirmed)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : MESSAGES.unknown)
    }
  }

  if (confirmEmail) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <TopBar />
        <CheckEmail
          email={confirmEmail}
          resend={() => backend.resendConfirmation(confirmEmail)}
          onBack={() => {
            setConfirmEmail(null)
            switchMode('signin')
          }}
          backLabel="Grįžti į prisijungimą"
        >
          Išsiuntėme patvirtinimo nuorodą. Atidaryk ją ir tavo paskyra bus paruošta.
        </CheckEmail>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-hidden bg-black">
      <img
        src={PHOTOS.runCoast}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-80 motion-safe:animate-ken"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/95" />
      <TopBar overlay />

      <div className="relative h-full overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+80px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="mx-auto max-w-sm">
          <Logo className="text-white" size={22} />
          <h1 className="headline mt-5 text-[54px] text-white">
            {signup ? (
              <>
                Bėkim
                <br />
                <span className="text-volt">kartu</span>
              </>
            ) : (
              <>
                Sveiki
                <br />
                <span className="text-volt">sugrįžę</span>
              </>
            )}
          </h1>
          <p className="mt-3 text-[15px] text-white/80">
            Rask, su kuo bėgti ar minti – bet kuriuo paros metu.
          </p>

          <div className="glass mt-6 rounded-[28px] p-4">
            <div className="grid grid-cols-2 rounded-full bg-black/30 p-1" role="tablist">
              {(
                [
                  ['signin', 'Prisijungti'],
                  ['signup', 'Registruotis'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => switchMode(id)}
                  className={clsx(
                    'h-10 rounded-full text-[14px] font-bold transition-colors',
                    mode === id ? 'bg-white text-black' : 'text-white/70 hover:text-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} noValidate className="mt-4 space-y-3.5">
              {formError && (
                <div
                  role="alert"
                  className="flex gap-2.5 rounded-2xl bg-blaze/20 px-3.5 py-3 text-[13.5px] font-semibold text-[#ffb08f]"
                >
                  <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
                  <div>
                    {formError}
                    {unconfirmed && (
                      <button
                        type="button"
                        onClick={resendConfirmation}
                        className="mt-1 block font-bold text-white underline underline-offset-2"
                      >
                        Siųsti patvirtinimo laišką dar kartą
                      </button>
                    )}
                  </div>
                </div>
              )}

              {signup && (
                <TextField
                  id="auth-name"
                  label="Vardas ir pavardė"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  error={shown('name')}
                  onBlur={() => touch('name')}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <TextField
                id="auth-email"
                label="El. paštas"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                maxLength={254}
                value={email}
                error={shown('email')}
                onBlur={() => touch('email')}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PasswordField
                id="auth-password"
                label="Slaptažodis"
                autoComplete={signup ? 'new-password' : 'current-password'}
                maxLength={72}
                value={password}
                error={shown('password')}
                hint={signup ? <PasswordChecklist checks={passwordChecks(password)} /> : undefined}
                onBlur={() => touch('password')}
                onChange={(e) => setPassword(e.target.value)}
              />

              {signup ? (
                <div>
                  <label className="flex items-start gap-3 text-[13px] leading-snug text-white/80">
                    <input
                      id="auth-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      aria-invalid={Boolean(shown('terms')) || undefined}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--color-volt)]"
                    />
                    <span>
                      Sutinku su{' '}
                      <Link
                        to="/salygos"
                        target="_blank"
                        className="font-bold text-white underline"
                      >
                        Naudojimosi sąlygomis
                      </Link>{' '}
                      ir{' '}
                      <Link
                        to="/privatumas"
                        target="_blank"
                        className="font-bold text-white underline"
                      >
                        Privatumo politika
                      </Link>
                      . Man yra bent {MIN_AGE} metų.
                    </span>
                  </label>
                  {shown('terms') && (
                    <p role="alert" className="mt-1.5 text-[13px] text-[#ff7a7a]">
                      {shown('terms')}
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  to={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
                  className="block text-right text-[13px] font-bold text-white/80 hover:text-white"
                >
                  Pamiršai slaptažodį?
                </Link>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={busy}
                disabled={lockout.remaining > 0}
              >
                {lockout.remaining > 0
                  ? `Per daug bandymų – palauk ${lockout.remaining} s`
                  : signup
                    ? 'Sukurti paskyrą'
                    : 'Prisijungti'}
              </Button>
            </form>
          </div>

          {sample && (
            <div className="mt-5">
              <Button
                variant="light"
                size="lg"
                className="w-full"
                loading={sample.busy}
                onClick={async () => {
                  await sample.signIn()
                  toast('Prisijungei kaip Gabija')
                }}
              >
                Išbandyti kaip Gabija
              </Button>
              <p className="mt-3 text-center text-[12.5px] leading-relaxed text-white/60">
                Peržiūros režimas: paskyros, treniruotės ir žinutės saugomos tik šioje naršyklėje.
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-[12px] text-white/50">
            <Link to="/privatumas" className="hover:text-white">
              Privatumo politika
            </Link>
            {' · '}
            <Link to="/salygos" className="hover:text-white">
              Naudojimosi sąlygos
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
