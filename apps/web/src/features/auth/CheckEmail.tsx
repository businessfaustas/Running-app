import { MailCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { toast, toastError } from '../../lib/toast'
import { useCooldown } from '../../lib/useCooldown'

const RESEND_AFTER_SECONDS = 60

interface CheckEmailProps {
  email: string
  title?: string
  children: ReactNode
  /** Sends the email again; omitted when there's nothing to resend. */
  resend?: () => Promise<void>
  onBack: () => void
  backLabel: string
}

/** "We sent you a link" with a resend button that respects the email rate limit. */
export function CheckEmail({
  email,
  title = 'Patikrink paštą',
  children,
  resend,
  onBack,
  backLabel,
}: CheckEmailProps) {
  const cooldown = useCooldown()
  const send = async () => {
    try {
      await resend?.()
      toast('Laiškas išsiųstas dar kartą')
      cooldown.start(RESEND_AFTER_SECONDS)
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-volt text-black">
        <MailCheck className="size-8" aria-hidden />
      </span>
      <h1 className="headline mt-5 text-[40px]">{title}</h1>
      <p className="mt-2 max-w-sm text-[15px] text-slate-300">{children}</p>
      <p className="mt-1 max-w-sm text-[15px] font-bold break-all text-white">{email}</p>
      <p className="mt-4 max-w-xs text-[13px] text-slate-500">
        Laiško nėra? Patikrink „Šlamšto“ ar „Reklamos“ aplanką. Nuoroda galioja 1 valandą.
      </p>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        {resend && (
          <Button variant="secondary" size="lg" disabled={cooldown.remaining > 0} onClick={send}>
            {cooldown.remaining > 0
              ? `Siųsti dar kartą po ${cooldown.remaining} s`
              : 'Siųsti laišką dar kartą'}
          </Button>
        )}
        <Button variant="ghost" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    </div>
  )
}
