import type { SportType, VibeTag } from '@pacemates/shared'
import clsx from 'clsx'
import { SPORT_META } from '../features/slots/meta'
import { photoFor } from '../lib/photos'

/**
 * A workout's header art: its photo where we have one, otherwise the sport's colour with its
 * icon drawn large. Fills its (relatively positioned) parent.
 */
export function SportArt({
  sport,
  vibe,
  position,
  className,
}: {
  sport: SportType
  vibe: VibeTag
  position?: string
  className?: string
}) {
  const src = photoFor(sport, vibe)
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={clsx('absolute inset-0 size-full object-cover', className)}
        style={position ? { objectPosition: position } : undefined}
      />
    )
  }
  const meta = SPORT_META[sport]
  return (
    <div
      aria-hidden
      className={clsx('absolute inset-0 overflow-hidden bg-surface', className)}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 85% 10%, color-mix(in srgb, ${meta.accent} 45%, transparent), transparent 65%)`,
      }}
    >
      <meta.Icon
        className="absolute -right-8 -bottom-8 size-64 opacity-30"
        style={{ color: meta.accent }}
        strokeWidth={1.2}
      />
    </div>
  )
}
