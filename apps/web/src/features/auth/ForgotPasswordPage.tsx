import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { backend } from '../../backend'
import { MESSAGES } from '../../backend/messages'
import { Button, ButtonLink } from '../../components/Button'
import { TextField } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { track } from '../../lib/analytics'
import { emailError } from '../../lib/validation'
import { CheckEmail } from './CheckEmail'

export function ForgotPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const error = submitted ? emailError(email) : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (emailError(email)) return
    setBusy(true)
    try {
      await backend.requestPasswordReset(email)
      track('password_reset_requested')
      setSentTo(email.trim())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : MESSAGES.unknown)
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <TopBar fallback="/signin" />
        <CheckEmail
          email={sentTo}
          resend={() => backend.requestPasswordReset(sentTo)}
          onBack={() => navigate(`/signin?email=${encodeURIComponent(sentTo)}`, { replace: true })}
          backLabel="Grįžti į prisijungimą"
        >
          Jei šiuo adresu yra paskyra, išsiuntėme nuorodą naujam slaptažodžiui sukurti.
        </CheckEmail>
        {backend.mode === 'demo' && (
          <div className="mx-6 mb-8 rounded-[22px] bg-blue p-4 text-center text-[14px] text-white">
            <p>Peržiūros režime laiškai nesiunčiami – nuorodą „atidarome“ čia.</p>
            <ButtonLink to="/reset-password" variant="light" size="sm" className="mt-3">
              Kurti naują slaptažodį
            </ButtonLink>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <TopBar fallback="/signin" />
      <form onSubmit={submit} noValidate className="mx-auto w-full max-w-sm px-5 pt-6 pb-10">
        <h1 className="headline text-[44px]">
          Pamiršai <span className="text-volt">slaptažodį?</span>
        </h1>
        <p className="mt-3 text-[15px] text-slate-400">
          Įvesk el. paštą, kuriuo registravaisi – atsiųsime nuorodą naujam slaptažodžiui.
        </p>
        {formError && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-blaze/15 px-4 py-3 text-sm font-semibold text-[#ff9466]"
          >
            {formError}
          </p>
        )}
        <div className="mt-6">
          <TextField
            label="El. paštas"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" loading={busy}>
          Siųsti nuorodą
        </Button>
      </form>
    </div>
  )
}
