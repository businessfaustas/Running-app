import { PACE_FIT_LABEL, type PaceFit } from '@grouppace/shared'
import clsx from 'clsx'

const TONE: Record<PaceFit, string> = {
  match: 'bg-volt/15 text-volt',
  close: 'bg-white/10 text-zinc-200',
  faster: 'bg-blaze/15 text-[#ff8a5c]',
  easier: 'bg-ice/15 text-ice',
}

export function PaceFitBadge({ fit, short = false }: { fit: PaceFit; short?: boolean }) {
  const label = short
    ? { match: 'Same pace', close: 'Close', faster: 'Faster', easier: 'Easier' }[fit]
    : PACE_FIT_LABEL[fit]
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
        TONE[fit],
      )}
    >
      {label}
    </span>
  )
}
