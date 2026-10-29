import type { Club } from '@pacemates/shared'
import clsx from 'clsx'
import { CLUB_TYPE_META } from './meta'

/** The club's own logo when we have it, otherwise its sports as coloured icons. */
export function ClubBadge({ club, size = 'md' }: { club: Club; size?: 'md' | 'lg' }) {
  if (club.logo) {
    return (
      <img
        src={club.logo}
        alt=""
        width={size === 'lg' ? 80 : 52}
        height={size === 'lg' ? 80 : 52}
        loading="lazy"
        className={clsx(
          'shrink-0 bg-white object-cover ring-1 ring-white/15',
          size === 'lg' ? 'size-20 rounded-[22px]' : 'size-13 rounded-[16px]',
        )}
      />
    )
  }
  return (
    <span className="flex shrink-0 -space-x-2">
      {club.types.map((t) => {
        const meta = CLUB_TYPE_META[t]
        return (
          <span
            key={t}
            className="grid size-11 place-items-center rounded-full text-black ring-4 ring-surface"
            style={{ backgroundColor: meta.accent }}
            title={meta.label}
          >
            <meta.Icon className="size-5" aria-hidden />
          </span>
        )
      })}
    </span>
  )
}
