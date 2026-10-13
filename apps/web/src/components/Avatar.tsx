import type { UserSummary } from '@pacemates/shared'
import clsx from 'clsx'
import { useState } from 'react'

// Muted, flat fills for athletes without a photo.
const FILLS = [
  '#3f5a8a',
  '#2f6f6a',
  '#7a4b8c',
  '#8a5a2f',
  '#3d6b3a',
  '#8a3f4f',
  '#4f4f8a',
  '#5f6670',
]

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

interface AvatarProps {
  user: UserSummary
  size?: number
  className?: string
}

/** Photo when available, otherwise initials on a colour derived from the user id. */
export function Avatar({ user, size = 32, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = user.avatarUrl !== null && user.avatarUrl !== failedSrc

  return (
    <span
      className={clsx(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white/90',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        backgroundColor: FILLS[hash(user.id) % FILLS.length],
      }}
      aria-hidden
    >
      {showImage ? (
        <img
          src={user.avatarUrl!}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedSrc(user.avatarUrl)}
        />
      ) : (
        initials(user.name)
      )}
    </span>
  )
}

export function AvatarStack({
  users,
  size = 22,
  ring = 'ring-surface',
}: {
  users: UserSummary[]
  size?: number
  /** Ring colour matching the background, so overlapping faces stay separated. */
  ring?: string
}) {
  return (
    <span className="flex -space-x-1.5">
      {users.map((user) => (
        <Avatar key={user.id} user={user} size={size} className={clsx('ring-2', ring)} />
      ))}
    </span>
  )
}
