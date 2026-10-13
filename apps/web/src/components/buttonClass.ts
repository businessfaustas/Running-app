import clsx from 'clsx'

export type Variant = 'primary' | 'light' | 'glass' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt text-black hover:bg-[#dfff6b] disabled:bg-volt/40',
  light: 'bg-white text-black hover:bg-white/90 disabled:bg-white/50',
  glass: 'glass text-white hover:bg-white/15 disabled:text-white/50',
  secondary: 'bg-raised text-white hover:bg-[#1f2440] disabled:text-slate-500',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white disabled:text-slate-600',
  danger: 'bg-raised text-[#ff7a7a] hover:bg-red-500/10 disabled:text-slate-500',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-6 text-[15px]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap',
    'transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

/** Round icon button: frosted over photos and colour, plain on dark bars. */
export function roundButtonClass(overlay = true) {
  return clsx(
    'grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95',
    overlay ? 'glass text-white hover:bg-white/20' : 'text-white hover:bg-white/5',
  )
}
