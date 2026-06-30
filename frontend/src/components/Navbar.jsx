import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Network, Monitor, Bell } from 'lucide-react'

const links = [
  { to: '/',        label: 'Overview',    Icon: LayoutDashboard },
  { to: '/map',     label: 'Mappa Rete',  Icon: Network },
  { to: '/devices', label: 'Dispositivi', Icon: Monitor },
  { to: '/alerts',  label: 'Alert',       Icon: Bell },
]

export default function Navbar() {
  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <nav className="max-w-screen-xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-blue-400 text-lg tracking-tight mr-4">
          Network Map
        </span>
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded transition-colors ${
                isActive
                  ? 'text-blue-400 bg-blue-900/30'
                  : 'text-slate-400 hover:text-slate-100'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
