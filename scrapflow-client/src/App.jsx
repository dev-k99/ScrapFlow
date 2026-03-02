import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

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
            <Route path="/dashboard" element={<DashboardPage />} />
            
            <Route path="/tickets/inbound" element={<InboundTicketsPage />} />
            <Route path="/tickets/inbound/new" element={<InboundTicketWizard />} />
            <Route path="/tickets/inbound/:id" element={<InboundTicketWizard />} />
            
            <Route path="/tickets/outbound" element={<OutboundTicketsPage />} />
            <Route path="/tickets/outbound/new" element={<OutboundTicketWizard />} />
            <Route path="/tickets/outbound/:id" element={<OutboundTicketWizard />} />
            
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
            
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/portals" element={<PortalsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}