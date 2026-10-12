import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface Option<T extends string> {
  id: T
  label: string
  Icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Show icons only (labels stay available to screen readers). */
  iconOnly?: boolean
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-full border border-white/5 bg-slate-900 p-1"
    >
      {options.map(({ id, label: optionLabel, Icon }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={iconOnly ? optionLabel : undefined}
            title={iconOnly ? optionLabel : undefined}
            onClick={() => onChange(id)}
            className={clsx(
              'flex min-h-8 items-center gap-1.5 rounded-full text-xs font-semibold transition-colors duration-200',
              iconOnly ? 'px-2.5' : 'px-3.5',
              active ? 'bg-volt text-slate-950' : 'text-slate-400 hover:text-white',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {!iconOnly && optionLabel}
          </button>
        )
      })}
    </div>
  )
}
