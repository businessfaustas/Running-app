import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { FullScreenLoader } from '../../components/FullScreenLoader'
import { useAuthReady, useSession } from '../../data/auth'
import { PHOTOS } from '../../lib/photos'
import { useSampleSignIn } from './useSampleSignIn'

const signInPath = (next: string) => `/signin?next=${encodeURIComponent(next)}`

/** Full-screen routes that only make sense signed in: send visitors to sign in first. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const ready = useAuthReady()
  const session = useSession()
  const location = useLocation()
  if (!ready) return <FullScreenLoader />
  if (!session) return <Navigate to={signInPath(location.pathname + location.search)} replace />
  return children
}

/** For tabs: show what's behind the sign-in instead of bouncing away. */
export function SignedOutPrompt({
  Icon,
  title,
  children,
  photo = PHOTOS.runCrew,
}: {
  Icon: LucideIcon
  title: string
  children: ReactNode
  photo?: string
}) {
  const location = useLocation()
  const sample = useSampleSignIn(location.pathname)
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-[calc(var(--nav-space)+12px)]">
      <div className="relative flex min-h-[460px] flex-col justify-end overflow-hidden rounded-[28px] p-5">
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="relative">
          <span className="grid size-12 place-items-center rounded-full bg-volt text-black">
            <Icon className="size-6" aria-hidden />
          </span>
          <h2 className="headline mt-4 text-[40px] text-white">{title}</h2>
          <p className="mt-2 max-w-xs text-[15px] leading-snug text-white/80">{children}</p>
          <div className="mt-6 flex flex-col gap-2.5">
            <ButtonLink to={signInPath(location.pathname)} variant="light" size="lg">
              Prisijungti
            </ButtonLink>
            {sample && (
              <Button variant="glass" size="lg" loading={sample.busy} onClick={sample.signIn}>
                Išbandyti kaip Gabija
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
