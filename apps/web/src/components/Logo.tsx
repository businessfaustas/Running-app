import clsx from 'clsx'

/** Two slanted strides side by side: pace, together. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <path d="M8 27 L15.5 5" stroke="var(--color-volt)" strokeWidth="5" strokeLinecap="round" />
      <path d="M16.5 27 L24 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <LogoMark size={size + 6} />
      <span className="headline" style={{ fontSize: size }}>
        Pace<span className="text-volt">Mates</span>
      </span>
    </span>
  )
}
