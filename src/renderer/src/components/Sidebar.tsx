import { clsx } from 'clsx'
import { LayoutDashboard, TrendingUp, Users, Star, Settings, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { initials } from '../lib/format'
import { useAuth } from '../store/auth'

export type Route = 'dashboard' | 'sales' | 'coaching' | 'reviews' | 'settings'

interface NavItem {
  route: Route
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { route: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { route: 'sales', label: 'Sales', icon: <TrendingUp size={18} /> },
  { route: 'coaching', label: 'Coaching', icon: <Users size={18} /> },
  { route: 'reviews', label: 'Reviews', icon: <Star size={18} /> }
]

interface SidebarProps {
  route: Route
  onNavigate: (r: Route) => void
}

// Fixed 220px dark forest sidebar (§4.4).
export function Sidebar({ route, onNavigate }: SidebarProps): JSX.Element {
  const { user, logout } = useAuth()

  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-brand-dark text-white">
      <div className="px-5 py-6">
        <Logo light />
      </div>

      <nav className="mt-2 flex-1 px-3">
        {NAV.map((item) => {
          const active = route === item.route
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={clsx(
                'relative mb-1 flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-body transition-colors',
                active ? 'bg-white/10 font-medium text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-warm" />}
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => onNavigate('settings')}
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
            route === 'settings' ? 'bg-white/10' : 'hover:bg-white/5'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-warm text-[12px] font-semibold text-white">
            {user ? initials(user.name) : '–'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-body-sm font-medium text-white">{user?.name}</div>
            <div className="truncate text-[10px] uppercase tracking-wide text-white/50">
              {user?.role === 'admin' ? 'Administrator' : 'General Manager'}
            </div>
          </div>
          <Settings size={16} className="text-white/60" />
        </button>
        <button
          onClick={() => logout()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
