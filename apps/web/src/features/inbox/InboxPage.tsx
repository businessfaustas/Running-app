import { toISODate, type ChatThread } from '@pacemates/shared'
import { MessageCircle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { AvatarStack } from '../../components/Avatar'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { PageHeader } from '../../components/PageHeader'
import { useSession } from '../../data/auth'
import { useThreads } from '../../data/hooks'
import { firstName, messageTime, relativeDay } from '../../lib/format'
import { PHOTOS } from '../../lib/photos'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { SPORT_META } from '../slots/meta'

export function InboxPage() {
  const session = useSession()
  return (
    <div className="flex h-full flex-col">
      <PageHeader eyebrow="Grupės" title="Pokalbiai" />
      {session ? (
        <Threads myId={session.userId} />
      ) : (
        <SignedOutPrompt Icon={MessageCircle} title="Grupės pokalbiai" photo={PHOTOS.rideGroup}>
          Kiekviena treniruotė turi savo pokalbį – susitarti dėl vietos, maršruto ir kavos po
          finišo.
        </SignedOutPrompt>
      )}
    </div>
  )
}

function Threads({ myId }: { myId: string }) {
  const threads = useThreads()
  if (threads.isError) {
    return <ErrorState error={threads.error} onRetry={() => threads.refetch()} />
  }
  if (threads.isPending) {
    return (
      <div className="space-y-2.5 px-4 pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[22px] bg-surface" />
        ))}
      </div>
    )
  }
  if (!threads.data?.length) {
    return (
      <EmptyState
        Icon={MessageCircle}
        title="Pokalbių dar nėra"
        action={<ButtonLink to="/">Rasti treniruotę</ButtonLink>}
      >
        Prisijunk prie treniruotės ir jos grupės pokalbis atsiras čia.
      </EmptyState>
    )
  }
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-[calc(var(--nav-space)+16px)]">
      {threads.data.map((thread) => (
        <ThreadRow key={thread.slot.id} thread={thread} myId={myId} />
      ))}
    </ul>
  )
}

function ThreadRow({ thread, myId }: { thread: ChatThread; myId: string }) {
  const { slot, lastMessage } = thread
  const sport = SPORT_META[slot.sportType]
  const sender = lastMessage
    ? lastMessage.sender.id === myId
      ? 'Tu'
      : firstName(lastMessage.sender.name)
    : null
  return (
    <li>
      <Link
        to={`/workouts/${slot.id}/chat`}
        style={{ '--accent': sport.accent } as CSSProperties}
        className="flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface p-3 transition active:scale-[0.99]"
      >
        <span className="relative shrink-0">
          <span className="grid size-13 place-items-center rounded-[18px] bg-(--accent) text-black">
            <sport.Icon className="size-6" aria-hidden />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{slot.title}</p>
            {lastMessage && (
              <span className="shrink-0 text-[12px] font-semibold text-slate-500 tabular">
                {messageTime(lastMessage.createdAt)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13.5px] text-slate-400">
            {lastMessage ? (
              <>
                <span className="font-semibold text-slate-200">{sender}:</span>{' '}
                {lastMessage.content}
              </>
            ) : (
              `${relativeDay(slot.date, toISODate(new Date()))}, ${slot.startTime} · žinučių dar nėra`
            )}
          </p>
        </div>
        {slot.participantPreview.length > 0 && (
          <span className="hidden shrink-0 min-[400px]:flex">
            <AvatarStack users={slot.participantPreview.slice(0, 2)} size={22} />
          </span>
        )}
      </Link>
    </li>
  )
}
