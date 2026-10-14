import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { backend } from '../../backend'
import { MESSAGES } from '../../backend/messages'
import { Button, ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PasswordChecklist, PasswordField } from '../../components/Field'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { TopBar } from '../../components/TopBar'
import { finishRecovery, useAuthReady, useSession } from '../../data/auth'
import { authRedirect } from '../../lib/authRedirect'
import { toast } from '../../lib/toast'
import { confirmPasswordError, passwordChecks, passwordError } from '../../lib/validation'

/** Lands here from the password-reset email, signed in for recovery. */
export function ResetPasswordPage() {
  const ready = useAuthReady()
  const session = useSession()

  if (!ready) return <FullScreenLoader />
  // Supabase needs the session the email link created; the preview fakes the link.
  const canReset = session !== null || backend.mode === 'demo'
  if (authRedirect.error || !canReset) {
    return (
      <div className="flex h-full flex-col">
        <TopBar fallback="/signin" />
        <EmptyState
          Icon={KeyRound}
          title="Nuoroda nebegalioja"
          action={<ButtonLink to="/forgot-password">Gauti naują nuorodą</ButtonLink>}
        >
          {MESSAGES.linkExpired}
        </EmptyState>
      </div>
    )
  }
  return <NewPasswordForm />
}

function NewPasswordForm() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const errors = {
    password: passwordError(password),
    confirm: confirmPasswordError(password, confirm),
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (errors.password || errors.confirm) return
    setBusy(true)
    try {
      await backend.updatePassword(password)
      finishRecovery()
      toast('Slaptažodis pakeistas')
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : MESSAGES.unknown)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <TopBar fallback="/" />
      <form onSubmit={submit} noValidate className="mx-auto w-full max-w-sm px-5 pt-6 pb-10">
        <h1 className="headline text-[44px]">
          Naujas <span className="text-volt">slaptažodis</span>
        </h1>
        <p className="mt-3 text-[15px] text-slate-400">
          Sugalvok naują slaptažodį – išsaugojus tave iškart prijungsime.
        </p>
        {formError && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-blaze/15 px-4 py-3 text-sm font-semibold text-[#ff9466]"
          >
            {formError}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <PasswordField
            label="Naujas slaptažodis"
            autoComplete="new-password"
            autoFocus
            maxLength={72}
            value={password}
            error={submitted ? errors.password : null}
            hint={<PasswordChecklist checks={passwordChecks(password)} />}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            label="Pakartok slaptažodį"
            autoComplete="new-password"
            maxLength={72}
            value={confirm}
            error={submitted ? errors.confirm : null}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>
          Išsaugoti slaptažodį
        </Button>
      </form>
    </div>
  )
}
