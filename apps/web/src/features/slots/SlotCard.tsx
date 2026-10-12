import type { SlotSummary } from '@grouppace/shared'
import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { Avatar, AvatarStack } from '../../components/Avatar'
import { SPORT_META, VIBE_META } from './meta'

interface SlotCardProps {
  slot: SlotSummary
  selected?: boolean
  /** Fade the card, e.g. for workouts that already finished today. */
  dimmed?: boolean
  /** Share of the card's height the real duration covers (drives the accent bar). */
  durationRatio?: number
  onSelect?: (slotId: string) => void
}

const formatKm = (km: number) => (Number.isInteger(km) ? String(km) : km.toFixed(1))
const firstName = (name: string) => name.split(' ')[0]

function describeSlot(slot: SlotSummary): string {
  const capacity = slot.maxParticipants
    ? `${slot.participantCount} of ${slot.maxParticipants} joined`
    : `${slot.participantCount} joined`
  return [
    slot.title,
    SPORT_META[slot.sportType].label,
    slot.endTime ? `${slot.startTime} to ${slot.endTime}` : `starts ${slot.startTime}`,
    `${formatKm(slot.distanceKm)} km at ${slot.targetPace}`,
    VIBE_META[slot.vibeTag].label,
    `hosted by ${slot.host.name}`,
    slot.status === 'CANCELLED' ? 'cancelled' : slot.status === 'FULL' ? 'full' : capacity,
  ].join(', ')
}

/**
 * Workout card. Fills its container and adapts to the container's width (container queries),
 * so the same card works in a narrow timeline column and in the full-width map preview.
 */
export function SlotCard({ slot, selected, dimmed, durationRatio = 1, onSelect }: SlotCardProps) {
  const sport = SPORT_META[slot.sportType]
  const vibe = VIBE_META[slot.vibeTag]
  const cancelled = slot.status === 'CANCELLED'

  return (
    <button
      type="button"
      onClick={() => onSelect?.(slot.id)}
      aria-pressed={selected}
      aria-label={describeSlot(slot)}
      style={{ '--accent': sport.accent } as CSSProperties}
      className={clsx(
        '@container group relative flex size-full overflow-hidden rounded-2xl border bg-slate-900 text-left',
        'shadow-lg shadow-black/30 transition duration-200 ease-out',
        'hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)',
        selected ? 'z-10 border-(--accent) ring-1 ring-(--accent)' : 'border-white/[0.06]',
      )}
    >
      {/* Faded content on an opaque card, so grid lines don't show through. */}
      <span
        className={clsx(
          'flex min-w-0 flex-1 transition-opacity duration-200',
          (dimmed || cancelled) && 'opacity-50 group-hover:opacity-90',
        )}
      >
        <span
          aria-hidden
          className="absolute top-0 left-0 w-1 rounded-r-full bg-(--accent)"
          style={{ height: `${Math.min(1, Math.max(0, durationRatio)) * 100}%` }}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1.5 py-2 pr-2 pl-3">
          <span className="flex items-start gap-2">
            <span className="hidden @min-[170px]:flex">
              <Avatar user={slot.host} size={28} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={clsx(
                  'line-clamp-2 text-xs leading-tight font-semibold text-white',
                  '@min-[170px]:line-clamp-1 @min-[170px]:text-[13px]',
                  cancelled && 'line-through decoration-slate-400',
                )}
              >
                {slot.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-400 tabular-nums">
                {slot.startTime}
                {slot.endTime && (
                  <span className="hidden @min-[170px]:inline">–{slot.endTime}</span>
                )}
                <span className="@min-[170px]:hidden"> · {formatKm(slot.distanceKm)} km</span>
                <span className="hidden @min-[240px]:inline">
                  {' '}
                  · with {firstName(slot.host.name)}
                </span>
              </span>
            </span>
            <span className="hidden size-6 shrink-0 place-items-center rounded-lg bg-(--accent)/15 text-(--accent) @min-[170px]:grid">
              <sport.Icon className="size-3.5" aria-hidden />
            </span>
          </span>

          <span className="hidden min-w-0 @min-[170px]:flex">
            <span className="truncate rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-slate-300 tabular-nums">
              <span className="text-(--accent)">{formatKm(slot.distanceKm)} km</span> ·{' '}
              {slot.targetPace}
            </span>
          </span>

          <span className="flex min-w-0 items-center justify-between gap-1.5">
            <span className="min-w-0 truncate rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300">
              {vibe.emoji}
              <span className="hidden @min-[200px]:inline"> {vibe.label}</span>
            </span>
            {cancelled ? (
              <span className="shrink-0 text-[11px] font-semibold text-blaze">Cancelled</span>
            ) : (
              <Attendance slot={slot} />
            )}
          </span>
        </span>
      </span>
    </button>
  )
}

function Attendance({ slot }: { slot: SlotSummary }) {
  const full = slot.status === 'FULL'
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums">
      {slot.participantPreview.length > 0 && (
        <span className="hidden @min-[240px]:flex">
          <AvatarStack users={slot.participantPreview} />
        </span>
      )}
      <span className={clsx('font-semibold', full ? 'text-blaze' : 'text-slate-100')}>
        {slot.maxParticipants
          ? `${slot.participantCount}/${slot.maxParticipants}`
          : slot.participantCount}
        <span className="hidden font-normal text-slate-400 @min-[200px]:inline">
          {full ? ' · full' : ' joined'}
        </span>
      </span>
    </span>
  )
}
