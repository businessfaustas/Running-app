import { LogOut, Pencil, UserRound, UserX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { backend } from '../../backend'
import { Button, ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useMe, useProfile } from '../../data/hooks'
import { toast } from '../../lib/toast'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { ProfileView } from './ProfileView'

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4">
      <div className="size-21 animate-pulse rounded-full bg-surface" />
      <div className="h-8 w-40 animate-pulse rounded bg-surface" />
    </div>
  )
}

/** The Profile tab. */
export function MyProfilePage() {
  const session = useSession()
  const me = useMe()
  const navigate = useNavigate()

  const signOut = async () => {
    await backend.signOut()
    toast('Signed out')
    navigate('/')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {!session ? (
          <SignedOutPrompt Icon={UserRound} title="Your athlete profile">
            Sign in to set your usual paces, so others can see if you'll fit their group.
          </SignedOutPrompt>
        ) : !me.data ? (
          <ProfileSkeleton />
        ) : (
          <ProfileView
            profile={me.data}
            isMe
            actions={
              <>
                <ButtonLink to="/profile/edit" variant="secondary" size="sm">
                  <Pencil className="size-3.5" aria-hidden />
                  Edit profile
                </ButtonLink>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="size-3.5" aria-hidden />
                  Sign out
                </Button>
              </>
            }
          />
        )}
      </div>
    </div>
  )
}

/** Someone else's profile (or yours, reached from a workout). */
export function AthletePage() {
  const { id = '' } = useParams()
  const session = useSession()
  const profile = useProfile(id)

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {profile.isPending ? (
          <ProfileSkeleton />
        ) : !profile.data ? (
          <EmptyState Icon={UserX} title="Athlete not found" />
        ) : (
          <ProfileView profile={profile.data} isMe={profile.data.id === session?.userId} />
        )}
      </div>
    </div>
  )
}
