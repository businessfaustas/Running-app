import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

const CONTROL =
  'w-full rounded-2xl border border-line bg-raised px-4 text-[15px] text-white placeholder:text-slate-500' +
  'transition-colors focus:border-volt/70 focus:outline-none disabled:opacity-60'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string | null
  id: string
  children: ReactNode
}

const messageId = (id: string) => `${id}-message`

function FieldShell({ label, hint, error, id, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={messageId(id)} role="alert" className="mt-1.5 text-[13px] text-[#ff7a7a]">
          {error}
        </p>
      ) : (
        hint && (
          <div id={messageId(id)} className="mt-1.5 text-[13px] text-slate-500">
            {hint}
          </div>
        )
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
  /** A control inside the field's right edge, e.g. a show-password button. */
  trailing?: ReactNode
}

export function TextField({
  label,
  hint,
  error,
  suffix,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={inputId}>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || hint ? messageId(inputId) : undefined}
          className={clsx(
            CONTROL,
            'h-13',
            (suffix || trailing) && 'pr-14',
            error && 'border-red-400/60',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-500">
            {suffix}
          </span>
        )}
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
        )}
      </div>
    </FieldShell>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
          aria-pressed={visible}
          className="grid size-10 place-items-center rounded-full text-slate-400 transition hover:text-white"
        >
          {visible ? (
            <EyeOff className="size-5" aria-hidden />
          ) : (
            <Eye className="size-5" aria-hidden />
          )}
        </button>
      }
    />
  )
}

/** Live checklist of password rules, shown under the new-password field. */
export function PasswordChecklist({ checks }: { checks: { label: string; ok: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {checks.map((check) => (
        <li
          key={check.label}
          className={clsx(
            'flex items-center gap-1 text-[12.5px] transition-colors',
            check.ok ? 'text-volt' : 'text-slate-500',
          )}
        >
          <span aria-hidden>{check.ok ? '✓' : '•'}</span>
          {check.label}
          <span className="sr-only">{check.ok ? ' – įvykdyta' : ' – dar ne'}</span>
        </li>
      ))}
    </ul>
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
        aria-describedby={error || hint ? messageId(inputId) : undefined}
        className={clsx(
          CONTROL,
          'min-h-24 resize-none py-3',
          error && 'border-red-400/60',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
}
