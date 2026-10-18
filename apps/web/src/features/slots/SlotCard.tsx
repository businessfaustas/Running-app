import type { SlotSummary, UserSlot } from '@pacemates/shared'
import clsx from 'clsx'
import { Ban, UsersRound } from 'lucide-react'
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
  /** The signed-in athlete's part in this workout, if any. */
  role?: Role
}

function describe(slot: SlotSummary, role?: Role): string {
  const going = slot.maxParticipants
    ? `dalyvauja ${slot.participantCount} iš ${slot.maxParticipants}`
    : `dalyvauja ${slot.participantCount}`
  return [
    slot.title,
    SPORT_META[slot.sportType].label,
    slot.endTime ? `${slot.startTime}–${slot.endTime}` : `pradžia ${slot.startTime}`,
    `${formatKm(slot.distanceKm)} km, ${slot.targetPace}`,
    `organizuoja ${slot.host.name}`,
    slot.status === 'CANCELLED' ? 'atšaukta' : slot.status === 'FULL' ? 'vietų nebėra' : going,
    role === 'HOST' ? 'tu organizuoji' : role === 'PARTICIPANT' ? 'tu dalyvauji' : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Timeline card. Fills its container and adapts to the container's width (container
 * queries), so it reads in a narrow column and in the full-width map preview alike.
 */
export function SlotCard({ slot, focused, dimmed, role }: SlotCardProps) {
  const sport = SPORT_META[slot.sportType]
  const vibe = VIBE_META[slot.vibeTag]
  const cancelled = slot.status === 'CANCELLED'

  return (
    <Link
      to={`/workouts/${slot.id}`}
      aria-label={describe(slot, role)}
      style={{ '--accent': sport.accent } as CSSProperties}
      className={clsx(
        '@container relative flex size-full overflow-hidden rounded-[22px] border text-left',
        'bg-gradient-to-br from-raised to-surface',
        'transition-transform duration-150 active:scale-[0.985]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt',
        focused ? 'border-volt ring-2 ring-volt/50' : 'border-white/[0.08]',
      )}
    >
      <span
        className={clsx(
          'flex min-w-0 flex-1 flex-col p-3 @max-[119px]:p-2',
          (dimmed || cancelled) && 'opacity-45',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded-full bg-(--accent) px-2 py-[3px] font-display text-[14px] leading-none font-bold text-black tabular">
            {slot.startTime}
          </span>
          {slot.endTime && (
            <span className="hidden font-display text-[14px] leading-none font-bold text-slate-500 tabular @min-[170px]:inline">
              –{slot.endTime}
            </span>
          )}
          <span className="truncate text-[11.5px] font-semibold text-slate-400 @min-[170px]:hidden @max-[119px]:hidden">
            {formatKm(slot.distanceKm)} km
          </span>
          <span className="hidden items-center gap-1 text-[10.5px] font-bold tracking-wider whitespace-nowrap text-(--accent) uppercase @min-[230px]:inline-flex">
            <sport.Icon className="size-3" aria-hidden />
            {sport.label}
          </span>
          {role && (
            <span className="ml-auto hidden shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold text-white @min-[150px]:inline">
              {role === 'HOST' ? 'Organizuoji' : 'Dalyvauji'}
            </span>
          )}
        </span>

        <span
          className={clsx(
            'mt-1.5 line-clamp-2 shrink-0 text-[15px] leading-tight font-extrabold tracking-tight text-white @min-[170px]:line-clamp-1',
            cancelled && 'line-through decoration-slate-500',
          )}
        >
          {slot.title}
        </span>

        <span className="mt-1 hidden min-h-0 min-w-0 items-center gap-1.5 overflow-hidden text-[12px] text-slate-400 @min-[170px]:flex">
          <Avatar user={slot.host} size={16} />
          <span className="truncate">
            {firstName(slot.host.name)} · {formatKm(slot.distanceKm)} km
            <span className="hidden @min-[240px]:inline"> · {slot.targetPace}</span>
          </span>
        </span>

        <span className="mt-auto flex shrink-0 items-center justify-between gap-2 pt-1">
          <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-slate-400 @max-[119px]:hidden">
            <vibe.Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden truncate @min-[200px]:inline">{vibe.label}</span>
          </span>
          {cancelled ? (
            <span className="shrink-0 text-[11.5px] font-bold text-blaze">
              <span className="@max-[119px]:hidden">Atšaukta</span>
              <Ban className="hidden size-3.5 @max-[119px]:block" aria-hidden />
            </span>
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
          'flex items-center gap-1 text-[12px] font-bold tabular',
          full ? 'text-blaze' : 'text-white',
        )}
      >
        <UsersRound className="size-3.5 opacity-70" aria-hidden />
        {slot.maxParticipants
          ? `${slot.participantCount}/${slot.maxParticipants}`
          : slot.participantCount}
        {full && <span className="hidden font-semibold @min-[200px]:inline"> · pilna</span>}
      </span>
    </span>
  )
}
