import type { UserSlot } from '@grouppace/shared'
import clsx from 'clsx'
import { CalendarCheck2, CalendarPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { useSession } from '../../data/auth'
import { useUserSlots } from '../../data/hooks'
import { isPast } from '../../lib/format'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { SlotDayList } from '../slots/SlotDayList'

type Tab = 'upcoming' | 'past'

export function PlansPage() {
  const session = useSession()
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <h1 className="font-display text-[32px] leading-none font-bold tracking-wide uppercase">
          Plans
        </h1>
      </header>
      {session ? (
        <Plans userId={session.userId} />
      ) : (
        <SignedOutPrompt Icon={CalendarCheck2} title="Your week, in one place">
          Sign in to keep track of the workouts you're hosting and joining.
        </SignedOutPrompt>
      )}
    </div>
  )
}

function Plans({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const slots = useUserSlots(userId)
  const { upcoming, past } = useMemo(() => {
    const all = slots.data ?? []
    const isDone = ({ slot }: UserSlot) => isPast(slot.date, slot.startTime, slot.endTime)
    return {
      upcoming: all.filter((s) => !isDone(s)),
      past: all.filter(isDone).reverse(),
    }
  }, [slots.data])

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <>
      <div className="flex gap-5 border-b border-line px-4 pt-4" role="tablist">
        {(['upcoming', 'past'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px border-b-2 pb-2.5 text-[15px] font-semibold capitalize transition-colors',
              tab === id
                ? 'border-volt text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}
          >
            {id}
            <span className="ml-1.5 text-zinc-500 tabular">
              {(id === 'upcoming' ? upcoming : past).length}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {slots.isPending ? (
          <div className="space-y-3 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : list.length === 0 ? (
          tab === 'upcoming' ? (
            <EmptyState
              Icon={CalendarPlus}
              title="Nothing planned"
              action={<ButtonLink to="/">Find a workout</ButtonLink>}
            >
              Join a group session or post your own, and it shows up here.
            </EmptyState>
          ) : (
            <EmptyState Icon={CalendarCheck2} title="No past workouts yet" />
          )
        ) : (
          <SlotDayList items={list} dimmed={tab === 'past'} stickyHeadings />
        )}
      </div>
    </>
  )
}
