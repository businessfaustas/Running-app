import clsx from 'clsx'
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-xl border border-line bg-raised px-3.5 text-[15px] text-white placeholder:text-zinc-500 ' +
  'transition-colors focus:border-zinc-400 focus:outline-none disabled:opacity-60'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string | null
  id: string
  children: ReactNode
}

function FieldShell({ label, hint, error, id, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-zinc-300">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-red-400">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[13px] text-zinc-500">{hint}</p>
      )}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string | null
  /** Text shown inside the field after the value, e.g. "km". */
  suffix?: string
}

export function TextField({ label, hint, error, suffix, className, id, ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={inputId}>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          className={clsx(
            CONTROL,
            'h-12',
            suffix && 'pr-14',
            error && 'border-red-400/60',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  error?: string | null
}

export function TextArea({ label, hint, error, className, id, ...props }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={inputId}>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        className={clsx(CONTROL, 'min-h-24 resize-none py-3', className)}
        {...props}
      />
    </FieldShell>
  )
}
