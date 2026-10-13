import { LogOut, Pencil, UserRound, UserX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { backend } from '../../backend'
import { roundButtonClass } from '../../components/buttonClass'
import { EmptyState } from '../../components/EmptyState'
import { Logo } from '../../components/Logo'
import { PageHeader } from '../../components/PageHeader'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useMe, useProfile } from '../../data/hooks'
import { PHOTOS } from '../../lib/photos'
import { toast } from '../../lib/toast'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { ProfileView } from './ProfileView'

function ProfileSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-b-[32px] bg-blue/40" />
  )
}

/** The Profile tab. */
export function MyProfilePage() {
  const session = useSession()
  const me = useMe()
  const navigate = useNavigate()

  const signOut = async () => {
    await backend.signOut()
    toast('Atsijungei. Iki greito!')
    navigate('/')
  }

  if (!session) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader eyebrow="Tavo" title="Profilis" />
        <SignedOutPrompt Icon={UserRound} title="Tavo sportininko profilis" photo={PHOTOS.runCoast}>
          Nurodyk įprastus tempus – kiti iškart matys, ar tau tiks jų grupė.
        </SignedOutPrompt>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {!me.data ? (
        <ProfileSkeleton />
      ) : (
        <ProfileView
          profile={me.data}
          isMe
          header={
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
              <Logo className="text-white" size={20} />
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Redaguoti profilį"
                  onClick={() => navigate('/profile/edit')}
                  className={roundButtonClass()}
                >
                  <Pencil className="size-[18px]" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Atsijungti"
                  onClick={signOut}
                  className={roundButtonClass()}
                >
                  <LogOut className="size-[18px]" aria-hidden />
                </button>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}

/** Someone else's profile (or yours, reached from a workout). */
export function AthletePage() {
  const { id = '' } = useParams()
  const session = useSession()
  const profile = useProfile(id)

  if (profile.isPending) return <ProfileSkeleton />
  if (!profile.data) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <EmptyState Icon={UserX} title="Sportininkas nerastas" />
      </div>
    )
  }
  return (
    <div className="h-full overflow-y-auto">
      <ProfileView
        profile={profile.data}
        isMe={profile.data.id === session?.userId}
        header={<TopBar overlay />}
      />
    </div>
  )
}
