import { RotateCw, WifiOff, type LucideIcon } from 'lucide-react'
import { MESSAGES } from '../backend/messages'
import { Button } from './Button'

interface ErrorStateProps {
  error: Error | null
  onRetry?: () => void
  title?: string
  Icon?: LucideIcon
}

/** A failed load, said plainly, with a way to try again. */
export function ErrorState({ error, onRetry, title = 'Nepavyko įkelti', Icon }: ErrorStateProps) {
  const offline = error?.message === MESSAGES.offline || !navigator.onLine
  const Shown = Icon ?? (offline ? WifiOff : RotateCw)
  return (
    <div role="alert" className="flex flex-col items-center px-8 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-blaze/15 text-[#ff9466]">
        <Shown className="size-6" aria-hidden />
      </div>
      <p className="headline mt-4 text-[26px]">{offline ? 'Nėra ryšio' : title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-slate-400">
        {offline ? MESSAGES.offline : (error?.message ?? MESSAGES.unknown)}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden />
          Bandyti dar kartą
        </Button>
      )}
    </div>
  )
}
