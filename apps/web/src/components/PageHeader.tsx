import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  /** Small line above the title. */
  eyebrow?: ReactNode
  actions?: ReactNode
}

/** Big slanted title for the tab screens. */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-2">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[12px] font-bold tracking-[0.14em] text-slate-500 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="headline mt-1 text-[44px]">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
    </header>
  )
}
