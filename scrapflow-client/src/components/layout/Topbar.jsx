import { Bell, Moon, Sun, Wifi, WifiOff, ChevronDown, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import hubManager from '@/lib/signalr'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const PAGES = {
  '/dashboard':         'Dashboard',
  '/tickets/inbound':   'Inbound Tickets',
  '/tickets/outbound':  'Outbound Tickets',
  '/inventory':         'Inventory',
  '/materials':         'Materials & Pricing',
  '/suppliers':         'Suppliers',
  '/reports':           'Reports',
  '/portals':           'Portals',
  '/settings':          'Settings',
}

function useCurrentTitle() {
  const { pathname } = useLocation()
  for (const [prefix, label] of Object.entries(PAGES)) {
    if (pathname.startsWith(prefix)) return label
  }
  return 'ScrapFlow SA'
}

export default function Topbar() {
  const { user } = useAuthStore()
  const { theme, toggleTheme, toggleSidebar } = useUiStore()
  const navigate = useNavigate()
  const title = useCurrentTitle()

  const connected = hubManager.state === 'Connected'

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6
                       bg-[var(--color-surface)] border-b border-[var(--color-border)]
                       shadow-sm z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleSidebar}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl
                     text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        {/* Page title */}
        <h1 className="font-bold text-base text-[var(--color-text)] tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* SignalR connection badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          ${connected
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
          {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-xl
                     text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                     transition-colors"
          title="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="w-8 h-8 flex items-center justify-center rounded-xl relative
                           text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                           transition-colors">
          <Bell size={16} />
        </button>

        {/* User badge */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl
                               hover:bg-[var(--color-surface-2)] transition-colors text-left">
              <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-[var(--color-text)] leading-none">{user?.fullName}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-none mt-0.5">{user?.role}</p>
              </div>
              <ChevronDown size={12} className="text-[var(--color-text-muted)]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[160px] rounded-xl border border-[var(--color-border)]
                         bg-[var(--color-surface)] shadow-xl p-1 text-sm"
            >
              <DropdownMenu.Item
                className="px-3 py-2 rounded-lg cursor-pointer
                           text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                           hover:text-[var(--color-text)] transition-colors"
                onSelect={() => navigate('/settings')}
              >
                Profile & Settings
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
