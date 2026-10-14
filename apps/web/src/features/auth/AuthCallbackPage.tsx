import { MailCheck, MailX } from 'lucide-react'
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { MESSAGES } from '../../backend/messages'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { useAuthReady, useSession } from '../../data/auth'
import { authRedirect } from '../../lib/authRedirect'

/**
 * Where links in auth emails land (Supabase "Redirect URL"). The Supabase client has already
 * read the session from the URL; this page says what happened and moves on.
 */
export function AuthCallbackPage() {
  const ready = useAuthReady()
  const session = useSession()
  const navigate = useNavigate()
  const confirmed = ready && session !== null && authRedirect.type !== 'recovery'

  useEffect(() => {
    if (!confirmed) return
    const id = setTimeout(() => navigate('/onboarding', { replace: true }), 1800)
    return () => clearTimeout(id)
  }, [confirmed, navigate])

  if (authRedirect.error) {
    const expired = /expired|invalid/i.test(`${authRedirect.errorCode} ${authRedirect.error}`)
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          Icon={MailX}
          title={expired ? 'Nuoroda nebegalioja' : 'Nepavyko patvirtinti'}
          action={
            <div className="flex flex-col gap-2">
              <ButtonLink to="/signin">Prisijungti</ButtonLink>
              <ButtonLink to="/forgot-password" variant="ghost">
                Atkurti slaptažodį
              </ButtonLink>
            </div>
          }
        >
          {expired
            ? `${MESSAGES.linkExpired} Prisijunk – jei el. paštas dar nepatvirtintas, galėsi gauti naują laišką.`
            : MESSAGES.unknown}
        </EmptyState>
      </div>
    )
  }
  if (authRedirect.type === 'recovery') return <Navigate to="/reset-password" replace />
  if (!ready) return <FullScreenLoader label="Tikriname nuorodą…" />
  if (!session) return <Navigate to="/signin" replace />

  return (
    <div className="grid h-full place-items-center">
      <EmptyState
        Icon={MailCheck}
        title="El. paštas patvirtintas!"
        action={<ButtonLink to="/onboarding">Tęsti</ButtonLink>}
      >
        Tavo paskyra paruošta. Dar keli klausimai ir galėsi ieškoti grupės.
      </EmptyState>
    </div>
  )
}
