import clsx from 'clsx'
import { SYMBOL, WORDMARK } from './brand'

interface LogoMarkProps {
  size?: number
  className?: string
  /** The head dot: volt by default (the brand accent), or the same colour as the body. */
  head?: 'volt' | 'current'
}

/** The runner-P symbol. The body takes the text colour. */
export function LogoMark({ size = 28, className, head = 'volt' }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox={SYMBOL.viewBox} aria-hidden className={className}>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={SYMBOL.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={SYMBOL.upper} />
        <path d={SYMBOL.lower} />
      </g>
      <circle
        cx={SYMBOL.head.cx}
        cy={SYMBOL.head.cy}
        r={SYMBOL.head.r}
        fill={head === 'volt' ? 'var(--color-volt)' : 'currentColor'}
      />
    </svg>
  )
}

/** The "pacemates" wordmark, sized by height. */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  return (
    <svg
      height={height}
      width={Math.round(height * WORDMARK.ratio)}
      viewBox={WORDMARK.viewBox}
      aria-hidden
      className={className}
    >
      <path fill="currentColor" fillRule="evenodd" d={WORDMARK.d} />
    </svg>
  )
}

/** Symbol + wordmark lockup. `size` is roughly the wordmark's letter height in pixels. */
export function Logo({
  className,
  size = 22,
  compact = false,
}: {
  className?: string
  size?: number
  /** Only the symbol on very narrow screens, where the header needs the room. */
  compact?: boolean
}) {
  return (
    <span
      role="img"
      aria-label="PaceMates"
      className={clsx('inline-flex items-center gap-[0.35em]', className)}
      style={{ fontSize: size }}
    >
      <LogoMark size={Math.round(size * 1.55)} />
      <Wordmark
        height={Math.round(size * 1.15)}
        className={clsx('mt-[0.12em]', compact && 'max-[359px]:hidden')}
      />
    </span>
  )
}
