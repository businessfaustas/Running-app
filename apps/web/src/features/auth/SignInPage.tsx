import clsx from 'clsx'
import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { backend } from '../../backend'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { TextField } from '../../components/Field'
import { Logo } from '../../components/Logo'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { PHOTOS } from '../../lib/photos'
import { toastError } from '../../lib/toast'
import { useSampleSignIn } from './useSampleSignIn'

type Mode = 'signin' | 'signup'

/** Only follow in-app paths after signing in. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export function SignInPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const session = useSession()
  const [signedInOnArrival] = useState(() => session !== null)
  const next = safeNext(params.get('next'))
  const sample = useSampleSignIn(next)

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  // Arrived already signed in (e.g. pressed back after signing in).
  if (signedInOnArrival) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') {
        await backend.signIn({ email, password })
        navigate(next, { replace: true })
      } else {
        const { needsEmailConfirmation } = await backend.signUp({ name, email, password })
        if (needsEmailConfirmation) setConfirmEmail(email.trim())
        else navigate('/profile/edit?welcome=1', { replace: true })
      }
    } catch (error) {
      toastError(error)
    } finally {
      setBusy(false)
    }
  }

  if (confirmEmail) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <EmptyState
          Icon={MailCheck}
          title="Patikrink paštą"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmEmail(null)
                setMode('signin')
              }}
            >
              Grįžti į prisijungimą
            </Button>
          }
        >
          Išsiuntėme nuorodą adresu {confirmEmail}. Atidaryk ją, patvirtink paskyrą ir
          prisijunk.
        </EmptyState>
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
            {mode === 'signin' ? (
              <>
                Sveiki
                <br />
                <span className="text-volt">sugrįžę</span>
              </>
            ) : (
              <>
                Bėkim
                <br />
                <span className="text-volt">kartu</span>
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
                  onClick={() => setMode(id)}
                  className={clsx(
                    'h-10 rounded-full text-[14px] font-bold transition-colors',
                    mode === id ? 'bg-white text-black' : 'text-white/70 hover:text-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3.5">
              {mode === 'signup' && (
                <TextField
                  label="Vardas ir pavardė"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <TextField
                label="El. paštas"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Slaptažodis"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                hint={mode === 'signup' ? 'Bent 8 simboliai.' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" size="lg" className="w-full" loading={busy}>
                {mode === 'signin' ? 'Prisijungti' : 'Sukurti paskyrą'}
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
                onClick={sample.signIn}
              >
                Išbandyti kaip Gabija
              </Button>
              <p className="mt-3 text-center text-[12.5px] leading-relaxed text-white/60">
                Peržiūros režimas: paskyros, treniruotės ir žinutės saugomos tik šioje
                naršyklėje.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
