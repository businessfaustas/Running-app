import type { UserSummary } from '@grouppace/shared'
import clsx from 'clsx'
import { useState } from 'react'

const GRADIENTS = [
  ['#6366f1', '#a855f7'],
  ['#0ea5e9', '#22d3ee'],
  ['#f43f5e', '#fb923c'],
  ['#10b981', '#84cc16'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#8b5cf6'],
  ['#14b8a6', '#0ea5e9'],
  ['#64748b', '#94a3b8'],
] as const

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

/** Photo when available, otherwise initials on a gradient derived from the user id. */
export function Avatar({ user, size = 28, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = user.avatarUrl !== null && user.avatarUrl !== failedSrc
  const [from, to] = GRADIENTS[hash(user.id) % GRADIENTS.length]!

  return (
    <span
      title={user.name}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {showImage ? (
        <img
          src={user.avatarUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedSrc(user.avatarUrl)}
        />
      ) : (
        initials(user.name)
      )}
    </span>
  )
}

export function AvatarStack({ users, size = 20 }: { users: UserSummary[]; size?: number }) {
  return (
    <span className="flex -space-x-1">
      {users.map((user) => (
        <Avatar key={user.id} user={user} size={size} className="ring-2 ring-slate-900" />
      ))}
    </span>
  )
}
