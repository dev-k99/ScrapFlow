import { useEffect, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from '@/components/ui/Toast'
import { useUiStore } from '@/store/uiStore'
import { replayOutbox } from '@/offline/db'
import api from '@/lib/api'

export default function AppShell() {
  const { sidebarCollapsed, sidebarOpen, closeSidebar, toast } = useUiStore()
  const navigate = useNavigate()

  // Replay outbox on reconnect or mount
  const syncOutbox = useCallback(async () => {
    try {
      const results = await replayOutbox(async (mutation) => {
        const { method = 'post', url, data } = mutation
        return api[method](url, data)
      })
      const synced = results.filter((r) => r.success).length
      if (synced > 0) toast(`Synced ${synced} offline draft${synced > 1 ? 's' : ''}`, 'success')
    } catch {
      // Silent — network may still be unavailable
    }
  }, [toast])

  useEffect(() => {
    syncOutbox()
    window.addEventListener('online', syncOutbox)
    return () => window.removeEventListener('online', syncOutbox)
  }, [syncOutbox])

  useEffect(() => {
    function handler(e) {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        navigate('/tickets/inbound/new')
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        navigate('/tickets/outbound/new')
      }
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('sf:closeModal'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Mobile backdrop — closes sidebar on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar />

      {/* Main content area — no margin on mobile (sidebar is overlay), desktop pushes */}
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-[margin] duration-300 min-w-0
          ${sidebarCollapsed ? 'md:ml-[4.5rem]' : 'md:ml-[17rem]'}`}
      >
        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global toast stack */}
      <Toast />
    </div>
  )
}
