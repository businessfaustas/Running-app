import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { useAuthReady, useSession } from '../../data/auth'

const signInPath = (next: string) => `/signin?next=${encodeURIComponent(next)}`

/** Full-screen routes that only make sense signed in: send visitors to sign in first. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const ready = useAuthReady()
  const session = useSession()
  const location = useLocation()
  if (!ready) return null
  if (!session) return <Navigate to={signInPath(location.pathname + location.search)} replace />
  return children
}

/** For tabs: explain what's behind the sign-in instead of bouncing away. */
export function SignedOutPrompt({
  Icon,
  title,
  children,
}: {
  Icon: LucideIcon
  title: string
  children: ReactNode
}) {
  const location = useLocation()
  return (
    <EmptyState
      Icon={Icon}
      title={title}
      action={<ButtonLink to={signInPath(location.pathname)}>Sign in</ButtonLink>}
    >
      {children}
    </EmptyState>
  )
}
