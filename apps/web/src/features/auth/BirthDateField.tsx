import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { CONTROL } from '../../components/Field'
import { birthYears } from '../../lib/ageGate'

const MONTHS = [
  'Sausis',
  'Vasaris',
  'Kovas',
  'Balandis',
  'Gegužė',
  'Birželis',
  'Liepa',
  'Rugpjūtis',
  'Rugsėjis',
  'Spalis',
  'Lapkritis',
  'Gruodis',
]

/** Year and month of birth for the age check – neutral, with no hint of the minimum. */
export function BirthDateField({
  year,
  month,
  error,
  onYear,
  onMonth,
  onBlur,
}: {
  year: string
  month: string
  error: string | null
  onYear: (value: string) => void
  onMonth: (value: string) => void
  onBlur: () => void
}) {
  const select = clsx(CONTROL, 'h-13 appearance-none pr-10', error && 'border-red-400/60')
  const chevron = (
    <ChevronDown
      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400"
      aria-hidden
    />
  )
  return (
    <fieldset aria-describedby={error ? 'auth-birth-error' : undefined}>
      <legend className="mb-1.5 block text-[13px] font-medium text-slate-300">Gimimo data</legend>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="relative">
          <span className="sr-only">Metai</span>
          <select
            id="auth-birth"
            value={year}
            onChange={(e) => onYear(e.target.value)}
            onBlur={onBlur}
            aria-invalid={Boolean(error) || undefined}
            className={select}
          >
            <option value="">Metai</option>
            {birthYears().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {chevron}
        </label>
        <label className="relative">
          <span className="sr-only">Mėnuo</span>
          <select
            value={month}
            onChange={(e) => onMonth(e.target.value)}
            onBlur={onBlur}
            aria-invalid={Boolean(error) || undefined}
            className={select}
          >
            <option value="">Mėnuo</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          {chevron}
        </label>
      </div>
      {error && (
        <p id="auth-birth-error" role="alert" className="mt-1.5 text-[13px] text-[#ff7a7a]">
          {error}
        </p>
      )}
    </fieldset>
  )
}
