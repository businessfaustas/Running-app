import clsx from 'clsx'
import {
  Bike,
  Footprints,
  Megaphone,
  Moon,
  Route,
  Sunrise,
  Timer,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Badge, BadgeId } from './progress'

const ICONS: Record<BadgeId, LucideIcon> = {
  first: Footprints,
  host: Megaphone,
  early: Sunrise,
  night: Moon,
  long: Route,
  ride: Bike,
  track: Timer,
  regular: UsersRound,
}

/** Round medal: volt when earned, an outline with progress when not yet. */
export function BadgeTile({ badge, compact = false }: { badge: Badge; compact?: boolean }) {
  const Icon = ICONS[badge.id]
  const progress = badge.current / badge.target
  return (
    <div
      className={clsx('flex flex-col items-center text-center', compact ? 'w-[76px]' : 'w-full')}
      title={badge.description}
    >
      <span
        className={clsx(
          'relative grid place-items-center rounded-full',
          compact ? 'size-16' : 'size-[72px]',
          badge.earned
            ? 'bg-volt text-black shadow-[0_8px_24px_rgb(212_255_63/0.25)]'
            : 'bg-raised text-slate-500',
        )}
        style={
          badge.earned
            ? undefined
            : {
                backgroundImage: `conic-gradient(var(--color-blue) ${progress * 360}deg, transparent 0)`,
              }
        }
      >
        {!badge.earned && <span className="absolute inset-[3px] rounded-full bg-raised" />}
        <Icon className="relative size-7" strokeWidth={2.2} aria-hidden />
      </span>
      <span
        className={clsx(
          'mt-2 text-[12px] leading-tight font-bold',
          badge.earned ? 'text-white' : 'text-slate-500',
        )}
      >
        {badge.title}
      </span>
      {!compact && (
        <span className="mt-0.5 text-[11px] leading-tight text-slate-500">
          {badge.earned ? 'Gauta!' : `${badge.current}/${badge.target} · ${badge.description}`}
        </span>
      )}
    </div>
  )
}
