import type { SlotSummary, UserSlot } from '@grouppace/shared'
import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Avatar, AvatarStack } from '../../components/Avatar'
import { firstName, formatKm } from '../../lib/format'
import { SPORT_META, VIBE_META } from './meta'

type Role = UserSlot['role']

interface SlotCardProps {
  slot: SlotSummary
  focused?: boolean
  /** Fade the card, e.g. for workouts that already finished today. */
  dimmed?: boolean
  /** Share of the card's height the real duration covers (drives the accent bar). */
  durationRatio?: number
  /** The signed-in athlete's part in this workout, if any. */
  role?: Role
}

function describe(slot: SlotSummary, role?: Role): string {
  const going = slot.maxParticipants
    ? `${slot.participantCount} of ${slot.maxParticipants} going`
    : `${slot.participantCount} going`
  return [
    slot.title,
    SPORT_META[slot.sportType].label,
    slot.endTime ? `${slot.startTime} to ${slot.endTime}` : `starts ${slot.startTime}`,
    `${formatKm(slot.distanceKm)} km at ${slot.targetPace}`,
    `hosted by ${slot.host.name}`,
    slot.status === 'CANCELLED' ? 'cancelled' : slot.status === 'FULL' ? 'full' : going,
    role === 'HOST' ? 'you are hosting' : role === 'PARTICIPANT' ? 'you are going' : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Timeline card. Fills its container and adapts to the container's width (container
 * queries), so it reads in a narrow column and in the full-width map preview alike.
 */
export function SlotCard({ slot, focused, dimmed, durationRatio = 1, role }: SlotCardProps) {
  const sport = SPORT_META[slot.sportType]
  const vibe = VIBE_META[slot.vibeTag]
  const cancelled = slot.status === 'CANCELLED'

  return (
    <Link
      to={`/workouts/${slot.id}`}
      aria-label={describe(slot, role)}
      style={{ '--accent': sport.accent } as CSSProperties}
      className={clsx(
        '@container relative flex size-full overflow-hidden rounded-xl border bg-surface text-left',
        'transition-[background-color,transform] duration-150 hover:bg-[#1a1a1d] active:scale-[0.985]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)',
        focused ? 'border-(--accent) ring-1 ring-(--accent)' : 'border-line',
      )}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 w-[3px] bg-(--accent)"
        style={{ height: `${Math.min(1, Math.max(0, durationRatio)) * 100}%` }}
      />

      <span
        className={clsx(
          'flex min-w-0 flex-1 flex-col py-2 pr-2.5 pl-3',
          (dimmed || cancelled) && 'opacity-45',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="font-display text-[15px] leading-none font-bold tracking-wide whitespace-nowrap text-white tabular">
            {slot.startTime}
            {slot.endTime && (
              <span className="hidden text-zinc-500 @min-[170px]:inline">–{slot.endTime}</span>
            )}
            <span className="font-sans text-[12px] font-medium tracking-normal text-zinc-400 @min-[170px]:hidden">
              {' '}
              · {formatKm(slot.distanceKm)} km
            </span>
          </span>
          <span className="hidden items-center gap-1 text-[10.5px] font-semibold tracking-wider whitespace-nowrap text-(--accent) uppercase @min-[210px]:inline-flex">
            <sport.Icon className="size-3" aria-hidden />
            {sport.label}
          </span>
          {role && (
            <span className="ml-auto hidden shrink-0 rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-white @min-[150px]:inline">
              {role === 'HOST' ? 'Hosting' : 'Going'}
            </span>
          )}
        </span>

        <span
          className={clsx(
            'mt-1 line-clamp-2 text-[13px] leading-snug font-semibold text-white @min-[170px]:line-clamp-1',
            cancelled && 'line-through decoration-zinc-500',
          )}
        >
          {slot.title}
        </span>

        <span className="mt-0.5 hidden min-w-0 items-center gap-1.5 text-[12px] text-zinc-400 @min-[170px]:flex">
          <Avatar user={slot.host} size={16} />
          <span className="truncate">
            {firstName(slot.host.name)} · {formatKm(slot.distanceKm)} km
            <span className="hidden @min-[240px]:inline"> · {slot.targetPace}</span>
          </span>
        </span>

        <span className="flex items-center justify-between gap-2 pt-1.5">
          <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-zinc-400">
            <vibe.Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden truncate @min-[200px]:inline">{vibe.label}</span>
          </span>
          {cancelled ? (
            <span className="shrink-0 text-[11.5px] font-semibold text-blaze">Cancelled</span>
          ) : (
            <Attendance slot={slot} />
          )}
        </span>
      </span>
    </Link>
  )
}

function Attendance({ slot }: { slot: SlotSummary }) {
  const full = slot.status === 'FULL'
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {slot.participantPreview.length > 0 && (
        <span className="hidden @min-[240px]:flex">
          <AvatarStack users={slot.participantPreview} size={18} />
        </span>
      )}
      <span
        className={clsx(
          'text-[11.5px] font-semibold tabular',
          full ? 'text-blaze' : 'text-zinc-200',
        )}
      >
        {slot.maxParticipants
          ? `${slot.participantCount}/${slot.maxParticipants}`
          : slot.participantCount}
        <span className="hidden font-normal text-zinc-500 @min-[200px]:inline">
          {full ? ' full' : ' going'}
        </span>
      </span>
    </span>
  )
}
