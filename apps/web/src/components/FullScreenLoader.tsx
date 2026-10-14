import { LogoMark } from './Logo'

/** Shown while the session or a lazily loaded screen is on its way. */
export function FullScreenLoader({ label = 'Kraunama…' }: { label?: string }) {
  return (
    <div role="status" className="grid h-full min-h-60 place-items-center bg-ink">
      <div className="flex flex-col items-center gap-3 text-white">
        <LogoMark size={44} className="motion-safe:animate-pulse" />
        <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      </div>
    </div>
  )
}
