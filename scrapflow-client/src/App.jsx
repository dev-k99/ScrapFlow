import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import ErrorBoundary from '@/components/ErrorBoundary'

// Layouts
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

// Public pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// App pages
import DashboardPage from '@/pages/DashboardPage'
import InboundTicketsPage from '@/pages/inbound/InboundTicketsPage'
import InboundTicketWizard from '@/pages/inbound/InboundTicketWizard'
import OutboundTicketsPage from '@/pages/outbound/OutboundTicketsPage'
import OutboundTicketWizard from '@/pages/outbound/OutboundTicketWizard'
import InventoryPage from '@/pages/inventory/InventoryPage'
import MaterialsPage from '@/pages/materials/MaterialsPage'
import SuppliersPage from '@/pages/suppliers/SuppliersPage'
import SupplierDetailPage from '@/pages/suppliers/SupplierDetailPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import PortalsPage from '@/pages/portals/PortalsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import AuditPage from '@/pages/audit/AuditPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  const { theme } = useUiStore()
  const { token, initAuth } = useAuthStore()

  // Apply dark mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Restore auth from localStorage on mount
  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />

            <Route path="/tickets/inbound" element={<ErrorBoundary><InboundTicketsPage /></ErrorBoundary>} />
            <Route path="/tickets/inbound/new" element={<ErrorBoundary><InboundTicketWizard /></ErrorBoundary>} />
            <Route path="/tickets/inbound/:id" element={<ErrorBoundary><InboundTicketWizard /></ErrorBoundary>} />

            <Route path="/tickets/outbound" element={<ErrorBoundary><OutboundTicketsPage /></ErrorBoundary>} />
            <Route path="/tickets/outbound/new" element={<ErrorBoundary><OutboundTicketWizard /></ErrorBoundary>} />
            <Route path="/tickets/outbound/:id" element={<ErrorBoundary><OutboundTicketWizard /></ErrorBoundary>} />

            <Route path="/inventory" element={<ErrorBoundary><InventoryPage /></ErrorBoundary>} />
            <Route path="/materials" element={<ErrorBoundary><MaterialsPage /></ErrorBoundary>} />

            <Route path="/suppliers" element={<ErrorBoundary><SuppliersPage /></ErrorBoundary>} />
            <Route path="/suppliers/:id" element={<ErrorBoundary><SupplierDetailPage /></ErrorBoundary>} />

            <Route path="/reports" element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
            <Route path="/portals" element={<ErrorBoundary><PortalsPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            <Route path="/audit" element={<ErrorBoundary><AuditPage /></ErrorBoundary>} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}