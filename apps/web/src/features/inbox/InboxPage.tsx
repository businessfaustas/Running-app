import { toISODate, type ChatThread } from '@grouppace/shared'
import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { useSession } from '../../data/auth'
import { useThreads } from '../../data/hooks'
import { firstName, messageTime, relativeDay } from '../../lib/format'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { SPORT_META } from '../slots/meta'

export function InboxPage() {
  const session = useSession()
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <h1 className="font-display text-[32px] leading-none font-bold tracking-wide uppercase">
          Chats
        </h1>
      </header>
      {session ? (
        <Threads myId={session.userId} />
      ) : (
        <SignedOutPrompt Icon={MessageCircle} title="Group chats">
          Every workout you join gets a group chat for sorting out the details.
        </SignedOutPrompt>
      )}
    </div>
  )
}

function Threads({ myId }: { myId: string }) {
  const threads = useThreads()
  if (threads.isPending) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    )
  }
  if (!threads.data?.length) {
    return (
      <EmptyState
        Icon={MessageCircle}
        title="No chats yet"
        action={<ButtonLink to="/">Find a workout</ButtonLink>}
      >
        Join a workout and its group chat appears here.
      </EmptyState>
    )
  }
  return (
    <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
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
      ? 'You'
      : firstName(lastMessage.sender.name)
    : null
  return (
    <li>
      <Link
        to={`/workouts/${slot.id}/chat`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: `color-mix(in oklab, ${sport.accent} 16%, transparent)` }}
        >
          <sport.Icon className="size-5" style={{ color: sport.accent }} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
              {slot.title}
            </p>
            {lastMessage && (
              <span className="shrink-0 text-[12px] text-zinc-500 tabular">
                {messageTime(lastMessage.createdAt)}
              </span>
            )}
          </div>
          <p className="truncate text-[13.5px] text-zinc-400">
            {lastMessage ? (
              <>
                <span className="text-zinc-300">{sender}:</span> {lastMessage.content}
              </>
            ) : (
              `${relativeDay(slot.date, toISODate(new Date()))} at ${slot.startTime} · no messages yet`
            )}
          </p>
        </div>
      </Link>
    </li>
  )
}
