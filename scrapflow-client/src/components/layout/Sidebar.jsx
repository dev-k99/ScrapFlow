import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Truck, PackageOpen, BarChart3, Users,
  FileBarChart2, Globe, Settings, LogOut, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Scale, Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useTicketStore } from '@/store/ticketStore'

const NAV = [
  { label: 'Dashboard',   icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Inbound',     icon: Truck,           to: '/tickets/inbound' },
  { label: 'Outbound',    icon: PackageOpen,     to: '/tickets/outbound' },
  { label: 'Inventory',   icon: BarChart3,       to: '/inventory' },
  { label: 'Materials',   icon: Scale,           to: '/materials' },
  { label: 'Suppliers',   icon: Users,           to: '/suppliers' },
  { label: 'Reports',     icon: FileBarChart2,   to: '/reports' },
  { label: 'Portals',     icon: Globe,           to: '/portals' },
  { label: 'Settings',    icon: Settings,        to: '/settings' },
]

const ADMIN_NAV = [
  { label: 'Audit Log', icon: Shield, to: '/audit' },
]

export default function Sidebar() {
  const { sidebarCollapsed, sidebarOpen, toggleSidebarCollapse, closeSidebar } = useUiStore()
  const { user, logout, hasRole } = useAuthStore()
  const { weighbridgeConnected } = useTicketStore()
  const navigate = useNavigate()

  // Track mobile breakpoint
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const w = sidebarCollapsed ? '4.5rem' : '17rem'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // On mobile, close sidebar after navigating
  const handleNavClick = () => {
    if (isMobile) closeSidebar()
  }

  return (
    <motion.aside
      animate={{
        width: w,
        x: isMobile && !sidebarOpen ? '-100%' : 0,
      }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col
                 bg-[var(--color-surface)] border-r border-[var(--color-border)]
                 shadow-sm overflow-hidden"
    >
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-5 flex-shrink-0">
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'mx-auto' : ''}`}>
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 flex-shrink-0">
            <span className="text-white font-black text-base">SF</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="font-black text-base tracking-tight text-[var(--color-text)] leading-none">ScrapFlow</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 leading-none mt-0.5">South Africa</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapse}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed (desktop only) */}
      {sidebarCollapsed && !isMobile && (
        <button
          onClick={toggleSidebarCollapse}
          className="mx-auto mb-2 w-7 h-7 rounded-lg flex items-center justify-center
                     text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {[...NAV, ...(hasRole('Owner', 'Manager') ? ADMIN_NAV : [])].map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed && !isMobile ? label : undefined}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
               ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}
               ${isActive
                 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                 : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
               }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {(!sidebarCollapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="font-semibold text-sm whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: weighbridge status + user */}
      <div className="p-2 flex-shrink-0 border-t border-[var(--color-border)] space-y-1">
        {(!sidebarCollapsed || isMobile) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
            ${weighbridgeConnected
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
            }`}>
            {weighbridgeConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {weighbridgeConnected ? 'Scale Connected' : 'Scale Offline'}
          </div>
        )}

        <div className={`flex items-center gap-3 px-3 py-2 ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <AnimatePresence>
            {(!sidebarCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-[var(--color-text)] truncate">{user?.fullName ?? 'User'}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {(!sidebarCollapsed || isMobile) && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-[var(--color-text-muted)] hover:text-red-500
                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
