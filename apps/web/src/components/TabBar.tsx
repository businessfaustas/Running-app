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
                'flex h-12 min-w-11 items-center justify-center rounded-full transition-[background-color,color,padding,transform] duration-300 ease-out active:scale-95',
                isActive
                  ? 'bg-volt px-3.5 text-black max-[374px]:px-0'
                  : 'px-3 text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                {/* Always there, so the chip can grow and shrink smoothly around its name. */}
                <span
                  aria-hidden
                  className={clsx(
                    'overflow-hidden text-[13px] font-bold whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out max-[374px]:hidden',
                    isActive ? 'ml-1.5 max-w-24 opacity-100' : 'ml-0 max-w-0 opacity-0',
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
