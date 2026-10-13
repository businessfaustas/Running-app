import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  Icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-raised text-zinc-400">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-[15px] font-semibold text-white">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm text-zinc-400">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
