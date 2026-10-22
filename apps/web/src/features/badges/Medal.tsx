import clsx from 'clsx'
import {
  AlarmClock,
  Bike,
  Flag,
  Footprints,
  Megaphone,
  Milestone,
  Moon,
  Route,
  Sunrise,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useId } from 'react'
import type { Badge, BadgeId, Metal } from './badges'

export const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  team: UsersRound,
  host: Megaphone,
  distance: Route,
  ride: Bike,
  first: Footprints,
  early: Sunrise,
  night: Moon,
  track: Timer,
  half: Flag,
  longest: Milestone,
  earliest: AlarmClock,
  crowd: Users,
}

/** Rim (light → dark), face (top → bottom), engraving ink and the accent band. */
const METALS: Record<
  Metal,
  { rim: [string, string, string]; face: [string, string]; ink: string; band: string }
> = {
  bronze: {
    rim: ['#f6c09a', '#a8603a', '#5a2d16'],
    face: ['#eab48d', '#b97350'],
    ink: '#5b2b13',
    band: '#ef7a33',
  },
  silver: {
    rim: ['#ffffff', '#aab4c3', '#56606f'],
    face: ['#f7f9fc', '#c3cbd7'],
    ink: '#3a4250',
    band: '#7f95ba',
  },
  gold: {
    rim: ['#fff3b8', '#e3a62a', '#875706'],
    face: ['#ffe88f', '#efb238'],
    ink: '#6a4203',
    band: '#f07a1a',
  },
  enamel: {
    rim: ['#a9c2ff', '#2e5bff', '#11256a'],
    face: ['#ffffff', '#d8e2ff'],
    ink: '#2e5bff',
    band: '#2e5bff',
  },
  locked: {
    rim: ['#5c5c62', '#3b3b40', '#242428'],
    face: ['#34343a', '#28282d'],
    ink: '#66666e',
    band: '#3d3d42',
  },
}

// Pointy-top hexagons, centred at 50,50.
const HEX_OUTER = '50,5 88.97,27.5 88.97,72.5 50,95 11.03,72.5 11.03,27.5'
const HEX_FACE = '50,14 81.18,32 81.18,68 50,86 18.82,68 18.82,32'
const SHIELD_OUTER = 'M50 5C73 5 89 15 89 33V67L50 95L11 67V33C11 15 27 5 50 5Z'
const SHIELD_FACE = 'M50 13C68 13 81 21 81 35V63L50 86L19 63V35C19 21 32 13 50 13Z'

/**
 * A metal medal: hexagons for levels (bronze → silver → gold), round enamel for one-off
 * achievements, a gold shield for personal records. Locked badges are dark steel.
 */
export function Medal({
  badge,
  size = 88,
  className,
}: {
  badge: Badge
  size?: number
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const metal = METALS[badge.metal]
  const Icon = BADGE_ICONS[badge.id]
  const locked = badge.metal === 'locked'
  const shape = badge.kind === 'level' ? 'hex' : badge.kind === 'record' ? 'shield' : 'round'

  const outer =
    shape === 'hex' ? (
      <polygon
        points={HEX_OUTER}
        fill={`url(#rim-${id})`}
        stroke={`url(#rim-${id})`}
        strokeWidth="7"
        strokeLinejoin="round"
      />
    ) : shape === 'shield' ? (
      <path
        d={SHIELD_OUTER}
        fill={`url(#rim-${id})`}
        stroke={`url(#rim-${id})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    ) : (
      <circle cx="50" cy="50" r="46" fill={`url(#rim-${id})`} />
    )
  const face =
    shape === 'hex' ? (
      <polygon points={HEX_FACE} strokeLinejoin="round" strokeWidth="4" />
    ) : shape === 'shield' ? (
      <path d={SHIELD_FACE} />
    ) : (
      <circle cx="50" cy="50" r="35" />
    )

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={badge.title}
      className={clsx(
        'shrink-0',
        locked ? 'opacity-80' : 'drop-shadow-[0_10px_14px_rgb(0_0_0/0.55)]',
        className,
      )}
    >
      <defs>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal.rim[0]} />
          <stop offset="0.5" stopColor={metal.rim[1]} />
          <stop offset="1" stopColor={metal.rim[2]} />
        </linearGradient>
        <linearGradient id={`face-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={metal.face[0]} />
          <stop offset="1" stopColor={metal.face[1]} />
        </linearGradient>
        <clipPath id={`clip-${id}`}>{face}</clipPath>
      </defs>

      {outer}
      <g fill={`url(#face-${id})`} stroke={`url(#face-${id})`}>
        {face}
      </g>

      <g clipPath={`url(#clip-${id})`}>
        {/* A soft sheen across the top-left, and lanes or a band along the bottom. */}
        <ellipse
          cx="30"
          cy="22"
          rx="34"
          ry="16"
          fill="#fff"
          opacity={locked ? 0.04 : 0.28}
          transform="rotate(-24 30 22)"
        />
        {shape === 'hex' && (
          <>
            <path d="M10 78 L90 58 L90 64 L10 84 Z" fill="#fff" opacity={locked ? 0.05 : 0.3} />
            <path
              d="M10 86 L90 66 L90 76 L10 96 Z"
              fill={metal.band}
              opacity={locked ? 0.4 : 0.95}
            />
          </>
        )}
        {shape === 'shield' && (
          <>
            <path
              d="M24 46 Q50 24 76 46"
              fill="none"
              stroke={metal.ink}
              strokeOpacity="0.18"
              strokeWidth="2"
            />
            <path
              d="M20 53 Q50 28 80 53"
              fill="none"
              stroke={metal.ink}
              strokeOpacity="0.12"
              strokeWidth="2"
            />
            <path
              d="M0 68 L100 58 L100 100 L0 100 Z"
              fill={metal.band}
              opacity={locked ? 0.4 : 0.95}
            />
          </>
        )}
        {shape === 'round' && !locked && (
          <circle
            cx="50"
            cy="50"
            r="31"
            fill="none"
            stroke={metal.ink}
            strokeOpacity="0.15"
            strokeWidth="1.5"
          />
        )}
      </g>

      <Icon
        x={shape === 'shield' ? 31 : 30}
        y={shape === 'shield' ? 26 : shape === 'hex' ? 28 : 30}
        width={shape === 'shield' ? 38 : 40}
        height={shape === 'shield' ? 38 : 40}
        color={metal.ink}
        strokeWidth={2.3}
        aria-hidden
      />

      {shape === 'hex' && badge.level > 0 && (
        <text
          x="28"
          y="40"
          fontSize="12"
          fontWeight="800"
          fill={metal.ink}
          opacity="0.55"
          fontFamily="inherit"
        >
          {badge.level}
        </text>
      )}
    </svg>
  )
}
