import { Wrench } from 'lucide-react'
import { LogoMark } from './Logo'

/**
 * Shown instead of the app while VITE_MAINTENANCE_MESSAGE is set – the quick way to take the
 * site offline (set it on Vercel and redeploy) after a serious bug or a security problem.
 */
export function MaintenancePage({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-8 text-center text-white">
      <LogoMark size={56} />
      <span className="mt-8 grid size-12 place-items-center rounded-full bg-raised text-volt">
        <Wrench className="size-6" aria-hidden />
      </span>
      <h1 className="headline mt-4 text-[32px]">Trumpam tvarkomės</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-300">{message}</p>
    </main>
  )
}
