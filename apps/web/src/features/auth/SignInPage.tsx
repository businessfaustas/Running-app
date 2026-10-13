import clsx from 'clsx'
import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { backend } from '../../backend'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { TextField } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { toastError } from '../../lib/toast'

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

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'form' | 'sample' | null>(null)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  // Arrived already signed in (e.g. pressed back after signing in).
  if (signedInOnArrival) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy('form')
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
      setBusy(null)
    }
  }

  const trySample = async () => {
    setBusy('sample')
    try {
      await backend.signInAsSample?.()
      navigate(next, { replace: true })
    } catch (error) {
      toastError(error)
    } finally {
      setBusy(null)
    }
  }

  if (confirmEmail) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <EmptyState
          Icon={MailCheck}
          title="Check your inbox"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmEmail(null)
                setMode('signin')
              }}
            >
              Back to sign in
            </Button>
          }
        >
          We sent a link to {confirmEmail}. Open it to confirm your account, then sign in.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-10">
        <div className="mx-auto max-w-sm">
          <img src="/icon.svg" alt="" className="size-12 rounded-xl" />
          <h1 className="mt-5 font-display text-[34px] leading-none font-bold tracking-wide uppercase">
            {mode === 'signin' ? 'Welcome back' : 'Join GroupPace'}
          </h1>
          <p className="mt-2 text-[15px] text-zinc-400">
            Find people to run and ride with, any time of day.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-full border border-line p-1" role="tablist">
            {(
              [
                ['signin', 'Sign in'],
                ['signup', 'Create account'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={clsx(
                  'h-9 rounded-full text-[14px] font-semibold transition-colors',
                  mode === id ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <TextField
                label="Name"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {backend.mode === 'demo' && (
            <div className="mt-8 border-t border-line pt-6">
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                loading={busy === 'sample'}
                onClick={trySample}
              >
                Look around as Maya, a sample athlete
              </Button>
              <p className="mt-3 text-center text-[12.5px] leading-relaxed text-zinc-500">
                Preview mode: accounts, workouts and messages are saved in this browser only.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
