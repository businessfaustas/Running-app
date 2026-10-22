import clsx from 'clsx'
import {
  CalendarCheck2,
  Compass,
  Flame,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'

const TABS: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Atrasti', Icon: Compass, end: true },
  { to: '/races', label: 'Varžybos', Icon: Trophy },
  { to: '/clubs', label: 'Klubai', Icon: UsersRound },
  { to: '/plans', label: 'Planai', Icon: CalendarCheck2 },
  { to: '/inspire', label: 'Įkvėpimas', Icon: Flame },
  { to: '/profile', label: 'Profilis', Icon: UserRound },
]

/** Floating pill; the active tab grows into a volt chip with its name (icon only on narrow phones). */
export function TabBar() {
  return (
    <nav
      aria-label="Pagrindinis meniu"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-white/10 bg-[#141416]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              clsx(
                'flex h-12 items-center justify-center gap-1.5 rounded-full transition-all duration-300 ease-out',
                isActive
                  ? 'bg-volt px-3.5 text-black max-[374px]:w-11 max-[374px]:px-0'
                  : 'w-11 text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                {isActive && (
                  <span className="text-[13px] font-bold whitespace-nowrap max-[374px]:hidden">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
