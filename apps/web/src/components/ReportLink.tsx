import { newReportSchema, type ReportReason } from '@pacemates/shared'
import clsx from 'clsx'
import { CircleCheck, Flag, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { OPERATOR } from '../content/legal'
import { useSession } from '../data/auth'
import { useReportContent } from '../data/hooks'
import { track } from '../lib/analytics'
import { reportHref } from '../lib/report'
import { toastError } from '../lib/toast'
import { Button } from './Button'
import { TextArea, TextField } from './Field'

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'ABUSE', label: 'Įžeidimai, patyčios ar priekabiavimas' },
  { id: 'DANGER', label: 'Pavojinga ar nesaugu' },
  { id: 'PRIVACY', label: 'Asmens duomenys ar nuotrauka be sutikimo' },
  { id: 'SPAM', label: 'Šlamštas ar reklama' },
  { id: 'COPYRIGHT', label: 'Autorių teisių pažeidimas' },
  { id: 'ILLEGAL', label: 'Kitas neteisėtas turinys' },
  { id: 'OTHER', label: 'Kita' },
]

/** "Pranešti" – opens a form that sends a notice about this content to the operator. */
export function ReportLink({
  what,
  path,
  id,
  label = 'Pranešti',
  className,
}: {
  /** What is reported, in words: "treniruotė „15 km lengvai + kava“". */
  what: string
  /** Where it is, e.g. /workouts/<id>. */
  path: string
  id?: string
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx('inline-flex items-center gap-1 font-bold hover:text-white', className)}
      >
        <Flag className="size-3.5" aria-hidden />
        {label}
      </button>
      {open &&
        createPortal(
          <ReportDialog what={what} path={path} id={id} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  )
}

/*
 * A notice under the EU Digital Services Act (Art. 16): what and where (filled in), why it's a
 * problem, who is reporting (the account, or a name and email for visitors) and a good-faith
 * statement. It lands in the content_reports table; the operator reviews it there.
 */
function ReportDialog({
  what,
  path,
  id,
  onClose,
}: {
  what: string
  path: string
  id?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const session = useSession()
  const send = useReportContent()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const report = {
    subject: what,
    path,
    targetId: id ?? null,
    reason: reason as ReportReason,
    details,
    reporterName: session ? null : name.trim() || null,
    reporterEmail: session ? null : email.trim() || null,
  }
  const parsed = newReportSchema.safeParse(report)
  const issue = (field: string) =>
    parsed.success ? null : (parsed.error.issues.find((i) => i.path[0] === field)?.message ?? null)
  const errors = {
    reason: reason ? null : 'Pasirink, kas negerai',
    details: issue('details'),
    name: session ? null : name.trim() ? issue('reporterName') : 'Įvesk vardą',
    email: session ? null : email.trim() ? issue('reporterEmail') : 'Įvesk el. paštą',
    agreed: agreed ? null : 'Patvirtink, kad informacija teisinga',
  }
  const valid = Object.values(errors).every((e) => e === null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || !parsed.success) {
      setShowErrors(true)
      return
    }
    send.mutate(parsed.data, {
      onSuccess: () => {
        track('content_reported', { reason: parsed.data.reason })
        setSent(true)
      },
      onError: toastError,
    })
  }

  const shown = (error: string | null) => (showErrors ? error : null)

  return (
    <dialog
      ref={ref}
      // React passes a nested dialog's close up to its parents (e.g. the photo viewer).
      onClose={(e) => {
        e.stopPropagation()
        onClose()
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-labelledby="report-title"
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/70 sm:m-auto sm:max-w-md"
    >
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-white sm:rounded-[28px] sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="report-title" className="headline text-[24px]">
            {sent ? 'Ačiū!' : 'Pranešti apie turinį'}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Uždaryti"
            className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full bg-raised text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {sent ? (
          <div className="mt-3">
            <p className="flex items-start gap-2.5 text-[15px] leading-snug text-slate-200">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-volt" aria-hidden />
              Pranešimą gavome. Jį peržiūrės žmogus, ne automatinė sistema
              {session ? '' : ', o atsakymą gausi nurodytu el. paštu'}.
            </p>
            <Button className="mt-5 w-full" onClick={() => ref.current?.close()}>
              Uždaryti
            </Button>
          </div>
        ) : (
          <form noValidate onSubmit={submit} className="mt-1">
            <p className="text-[13px] leading-snug text-slate-400">
              Apie: <span className="text-slate-200">{what}</span>
            </p>
            <p className="mt-2 rounded-[16px] bg-blaze/15 px-3.5 py-2.5 text-[13px] leading-snug text-[#ff9466]">
              Jei kam nors gresia pavojus dabar – skambink <strong>112</strong>.
            </p>

            <fieldset className="mt-4">
              <legend className="mb-2 text-[13px] font-bold text-slate-300">Kas negerai?</legend>
              <div className="flex flex-col gap-1.5">
                {REASONS.map((option) => (
                  <label
                    key={option.id}
                    className={clsx(
                      'flex cursor-pointer items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-[14px] transition-colors',
                      reason === option.id
                        ? 'bg-volt/15 text-white ring-1 ring-volt'
                        : 'bg-raised text-slate-200',
                    )}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={option.id}
                      checked={reason === option.id}
                      onChange={() => setReason(option.id)}
                      className="size-4 shrink-0 accent-[var(--color-volt)]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {shown(errors.reason) && (
                <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                  {errors.reason}
                </p>
              )}
            </fieldset>

            <div className="mt-4">
              <TextArea
                label="Kodėl tai neteisėta ar pažeidžia taisykles?"
                placeholder="Kas tiksliai negerai ir kur tai matyti"
                maxLength={2000}
                value={details}
                error={shown(errors.details)}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {session ? (
              <p className="mt-3 text-[13px] leading-snug text-slate-400">
                Pranešimą siųsi iš savo paskyros – jei reikės, susisieksime paskyros el. paštu.
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                <TextField
                  label="Tavo vardas"
                  autoComplete="name"
                  value={name}
                  error={shown(errors.name)}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="El. paštas atsakymui"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  error={shown(errors.email)}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <label className="mt-4 flex items-start gap-3 text-[13px] leading-snug text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--color-volt)]"
              />
              Patvirtinu, kad šiame pranešime pateikta informacija ir teiginiai yra tikslūs ir
              išsamūs, ir pranešu sąžiningai.
            </label>
            {shown(errors.agreed) && (
              <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-300">
                {errors.agreed}
              </p>
            )}

            <Button type="submit" className="mt-5 w-full" loading={send.isPending}>
              Siųsti pranešimą
            </Button>
            <p className="mt-3 text-center text-[12px] leading-snug text-slate-500">
              Gali rašyti ir el. paštu{' '}
              <a href={reportHref(what, path, id)} className="font-bold text-slate-300 underline">
                {OPERATOR.email}
              </a>
              . Kaip nagrinėjame pranešimus –{' '}
              <Link to="/salygos" target="_blank" className="font-bold text-slate-300 underline">
                sąlygose
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </dialog>
  )
}
