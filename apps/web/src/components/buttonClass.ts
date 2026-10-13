import clsx from 'clsx'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt text-black hover:bg-[#d8ff3d] disabled:bg-volt/40',
  secondary: 'bg-raised text-zinc-100 hover:bg-[#26262a] disabled:text-zinc-500',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white disabled:text-zinc-600',
  danger: 'bg-raised text-red-400 hover:bg-red-500/10 disabled:text-zinc-500',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-6 text-[15px]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
