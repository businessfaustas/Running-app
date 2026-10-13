import { PACE_FIT_LABEL, type PaceFit } from '@pacemates/shared'
import clsx from 'clsx'

const TONE: Record<PaceFit, string> = {
  match: 'bg-volt text-black',
  close: 'bg-white/12 text-white',
  faster: 'bg-blaze/20 text-[#ff9466]',
  easier: 'bg-ice/15 text-ice',
}

const SHORT: Record<PaceFit, string> = {
  match: 'Tavo tempas',
  close: 'Artima',
  faster: 'Greičiau',
  easier: 'Lengviau',
}

export function PaceFitBadge({ fit, short = false }: { fit: PaceFit; short?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold',
        TONE[fit],
      )}
    >
      {short ? SHORT[fit] : PACE_FIT_LABEL[fit]}
    </span>
  )
}
