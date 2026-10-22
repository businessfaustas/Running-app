import clsx from 'clsx'
import { Award, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useUserSlots } from '../../data/hooks'
import { PHOTOS } from '../../lib/photos'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { BadgeCard } from './BadgeCard'
import { BADGE_CATEGORIES, computeBadges, type Badge, type BadgeKind } from './badges'
import { Medal } from './Medal'

type Tab = 'earned' | 'remaining'

export function BadgesPage() {
  const session = useSession()
  return (
    <div className="flex h-full flex-col">
      <TopBar fallback="/profile" title={<span className="block text-center">Ženkliukai</span>} />
      {session ? (
        <Collection userId={session.userId} />
      ) : (
        <SignedOutPrompt Icon={Award} title="Rink ženkliukus" photo={PHOTOS.runCoast}>
          Prisijunk ir gauk medalių už bendras treniruotes, rekordus ir ankstyvus rytus.
        </SignedOutPrompt>
      )}
    </div>
  )
}

function Collection({ userId }: { userId: string }) {
  const slots = useUserSlots(userId)
  const badges = useMemo(() => computeBadges(slots.data ?? []), [slots.data])
  const [tab, setTab] = useState<Tab>('earned')
  const [category, setCategory] = useState<BadgeKind | 'all'>('all')
  const [open, setOpen] = useState<Badge | null>(null)

  const earned = badges.filter((b) => b.earned)
  // Still to get: anything locked, and levels not yet at gold.
  const remaining = badges.filter((b) => b.next !== null)
  const shown = (tab === 'earned' ? earned : remaining).filter(
    (b) => category === 'all' || b.kind === category,
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div className="mt-4 rounded-[24px] bg-gradient-to-br from-raised to-surface p-4">
        <p className="text-[13px] font-semibold text-slate-400">Surinkta</p>
        <p className="headline mt-0.5 text-[30px]">
          {earned.length} <span className="text-slate-500">iš {badges.length}</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-volt transition-[width] duration-500"
            style={{ width: `${(earned.length / badges.length) * 100}%` }}
          />
        </div>
      </div>

      <div role="tablist" className="mt-4 grid grid-cols-2 rounded-full bg-surface p-1">
        {(
          [
            ['earned', 'Gauti', earned.length],
            ['remaining', 'Liko', remaining.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              'h-11 rounded-full text-[14px] font-bold tracking-wide uppercase transition-colors',
              tab === id ? 'bg-white text-black' : 'text-slate-400 hover:text-white',
            )}
          >
            {label} <span className="tabular opacity-50">{count}</span>
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Kategorija"
        className="scrollbar-none -mx-5 mt-4 flex gap-5 overflow-x-auto border-b border-white/[0.06] px-5"
      >
        {BADGE_CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
            className={clsx(
              '-mb-px shrink-0 border-b-2 pb-2.5 text-[13px] font-bold tracking-wider uppercase transition-colors',
              category === id
                ? 'border-volt text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {slots.isPending ? (
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-[18px] bg-surface" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-14 text-center text-[14px] text-slate-500">
          {tab === 'earned'
            ? 'Čia atsiras medaliai už įvykusias treniruotes. Prisijunk prie pirmos!'
            : 'Viskas surinkta – tikras čempionų lygis.'}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6">
          {shown.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onOpen={setOpen}
              showProgress={tab === 'remaining'}
            />
          ))}
        </div>
      )}

      <BadgeSheet badge={open} onClose={() => setOpen(null)} />
    </div>
  )
}

/** One medal up close: what it's for and how far to the next step. */
export function BadgeSheet({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (badge && !dialog.open) dialog.showModal()
    if (!badge && dialog.open) dialog.close()
  }, [badge])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/70 sm:m-auto sm:max-w-sm"
    >
      {badge && (
        <div className="relative flex flex-col items-center rounded-t-[32px] border border-line bg-surface px-6 pt-8 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-center text-white sm:rounded-[32px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Uždaryti"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-raised text-slate-300"
          >
            <X className="size-5" aria-hidden />
          </button>
          <Medal badge={badge} size={150} />
          <h2 className="headline mt-4 text-[26px]">{badge.title}</h2>
          <p className="mt-1 text-[14px] text-slate-400">{badge.description}</p>
          <span className="mt-3 rounded-full bg-white/10 px-3.5 py-1 text-[14px] font-bold tabular">
            {badge.label}
          </span>
          {badge.next && (
            <div className="mt-5 w-full">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-volt"
                  style={{ width: `${Math.round(badge.progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[13px] font-semibold text-slate-300">{badge.next}</p>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
