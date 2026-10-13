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
      <div className="grid size-14 place-items-center rounded-full bg-blue/20 text-volt">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="headline mt-4 text-[26px]">{title}</p>
      {children && <p className="mt-1.5 max-w-xs text-sm text-slate-400">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
