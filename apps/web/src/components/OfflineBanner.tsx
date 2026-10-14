import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Tells people when they've lost connection, instead of letting actions fail silently. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (online) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 flex justify-center px-4"
    >
      <p className="flex items-center gap-2 rounded-full bg-blaze px-4 py-2 text-[13px] font-bold text-black shadow-xl">
        <WifiOff className="size-4" aria-hidden />
        Nėra interneto ryšio
      </p>
    </div>
  )
}
