import clsx from 'clsx'
import { Flag } from 'lucide-react'
import { reportHref } from '../lib/report'

/** "Pranešti" – opens an email draft reporting this content (see lib/report.ts). */
export function ReportLink({
  what,
  path,
  id,
  label = 'Pranešti',
  className,
}: {
  what: string
  path: string
  id?: string
  label?: string
  className?: string
}) {
  return (
    <a
      href={reportHref(what, path, id)}
      className={clsx('inline-flex items-center gap-1 font-bold hover:text-white', className)}
    >
      <Flag className="size-3.5" aria-hidden />
      {label}
    </a>
  )
}
