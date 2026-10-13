import { toISODate, type ChatMessage, type SlotDetail } from '@pacemates/shared'
import clsx from 'clsx'
import { ArrowUp, Lock, MessageCircle } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useMessages, useSendMessage, useSlot } from '../../data/hooks'
import { clockTime, countOf, firstName, relativeDay, WORDS } from '../../lib/format'
import { toastError } from '../../lib/toast'
import { SPORT_META } from '../slots/meta'

/** Messages from the same person within this window are grouped under one name. */
const GROUP_WINDOW_MS = 5 * 60_000

export function ChatPage() {
  const { id = '' } = useParams()
  const session = useSession()
  const slotQuery = useSlot(id)
  const slot = slotQuery.data
  const isMember = Boolean(
    slot?.participants.some((p) => p.id === session?.userId && p.status === 'ACCEPTED'),
  )

  return (
    <div className="flex h-full flex-col">
      <TopBar
        fallback={`/workouts/${id}`}
        title={
          slot ? (
            <Link to={`/workouts/${id}`} className="block min-w-0">
              <span className="block truncate">{slot.title}</span>
              <span className="block truncate text-[12px] font-medium text-slate-500">
                {relativeDay(slot.date, toISODate(new Date()))}, {slot.startTime} ·{' '}
                {countOf(slot.participantCount, WORDS.person)}
              </span>
            </Link>
          ) : (
            'Grupės pokalbis'
          )
        }
      />
      {slotQuery.isPending ? null : !slot ? (
        <EmptyState Icon={MessageCircle} title="Pokalbis nerastas" />
      ) : isMember ? (
        <Conversation slot={slot} myId={session!.userId} />
      ) : (
        <EmptyState
          Icon={Lock}
          title="Prisijunk prie treniruotės"
          action={<ButtonLink to={`/workouts/${id}`}>Žiūrėti treniruotę</ButtonLink>}
        >
          Šį pokalbį skaityti ir jame rašyti gali tik treniruotės „{slot.title}“ dalyviai.
        </EmptyState>
      )}
    </div>
  )
}

function Conversation({ slot, myId }: { slot: SlotDetail; myId: string }) {
  const messages = useMessages(slot.id, true)
  const send = useSendMessage(slot.id)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const count = messages.data?.length ?? 0

  // Stay pinned to the newest message.
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  // Grow the composer with its content, up to a few lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || send.isPending) return
    send.mutate(text, { onSuccess: () => setDraft(''), onError: toastError })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
  }

  return (
    <>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {messages.isPending ? null : count === 0 ? (
          <EmptyState Icon={MessageCircle} title="Pradėk pokalbį">
            Parašyk, kur tiksliai lauksi, arba paklausk apie maršrutą.
          </EmptyState>
        ) : (
          <MessageList
            messages={messages.data!}
            myId={myId}
            accent={SPORT_META[slot.sportType].accent}
          />
        )}
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-white/[0.06] bg-surface px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Žinutė
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rašyk grupei…"
            maxLength={2000}
            className="max-h-30 min-h-11 flex-1 resize-none rounded-[22px] border border-white/10 bg-raised px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || send.isPending}
            aria-label="Siųsti"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-black transition active:scale-95 disabled:bg-raised disabled:text-slate-600"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </form>
    </>
  )
}

function MessageList({
  messages,
  myId,
  accent,
}: {
  messages: ChatMessage[]
  myId: string
  accent: string
}) {
  const today = toISODate(new Date())
  return (
    <ol className="flex flex-col">
      {messages.map((message, i) => {
        const previous = messages[i - 1]
        const day = toISODate(new Date(message.createdAt))
        const newDay = !previous || toISODate(new Date(previous.createdAt)) !== day
        const grouped =
          !newDay &&
          previous?.sender.id === message.sender.id &&
          new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <
            GROUP_WINDOW_MS
        const mine = message.sender.id === myId

        return (
          <li key={message.id} className={clsx(grouped ? 'mt-0.5' : 'mt-3')}>
            {newDay && (
              <p className="mx-auto mb-3 w-fit rounded-full bg-raised px-3 py-1 text-center text-[12px] font-bold text-slate-400">
                {relativeDay(day, today)}
              </p>
            )}
            <div className={clsx('flex items-end gap-2', mine && 'flex-row-reverse')}>
              {!mine && (
                <span className="w-7 shrink-0">
                  {!grouped && <Avatar user={message.sender} size={28} />}
                </span>
              )}
              <div
                className={clsx('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}
              >
                {!mine && !grouped && (
                  <span className="mb-0.5 ml-1 text-[12px] font-bold" style={{ color: accent }}>
                    {firstName(message.sender.name)}
                  </span>
                )}
                <div
                  className={clsx(
                    'rounded-[20px] px-3.5 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap',
                    mine ? 'rounded-br-md bg-blue text-white' : 'rounded-bl-md bg-raised text-slate-100',
                  )}
                >
                  {message.content}
                </div>
              </div>
              <span className="mb-1 shrink-0 text-[11px] text-slate-600 tabular">
                {clockTime(message.createdAt)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
