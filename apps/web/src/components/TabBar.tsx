import clsx from 'clsx'
import {
  CalendarCheck2,
  Compass,
  MessageCircle,
  Plus,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'

const TABS: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Discover', Icon: Compass, end: true },
  { to: '/plans', label: 'Plans', Icon: CalendarCheck2 },
  { to: '/inbox', label: 'Chats', Icon: MessageCircle },
  { to: '/profile', label: 'Profile', Icon: UserRound },
]

function Tab({ to, label, Icon, end }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors',
          isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function TabBar() {
  const [discover, plans, chats, profile] = TABS
  return (
    <nav
      aria-label="Main"
      className="z-30 shrink-0 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="flex items-stretch">
        <Tab {...discover!} />
        <Tab {...plans!} />
        <div className="flex flex-1 items-center justify-center">
          <NavLink
            to="/workouts/new"
            aria-label="Post a workout"
            className="grid size-11 place-items-center rounded-full bg-volt text-black transition active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} aria-hidden />
          </NavLink>
        </div>
        <Tab {...chats!} />
        <Tab {...profile!} />
      </div>
    </nav>
  )
}
