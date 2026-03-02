import { create } from 'zustand'

export const useUiStore = create((set, get) => ({
  // ─── Sidebar ───────────────────────────────────────────
  sidebarOpen: true,
  sidebarCollapsed: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  closeSidebar: () => set({ sidebarOpen: false }),

  // ─── Theme ─────────────────────────────────────────────
  theme: localStorage.getItem('sf_theme') || 'light',

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('sf_theme', next)
    set({ theme: next })
  },

  // ─── Toast Notifications ───────────────────────────────
  toasts: [],

  toast: (message, type = 'success', duration = 4000) => {
    const id = Date.now()
    set((s) => ({
      toasts: [...s.toasts, { id, message, type }],
    }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ─── Global Loading ────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),

  // ─── Selected Site Filter ──────────────────────────────
  selectedSiteId: null,
  setSelectedSiteId: (id) => set({ selectedSiteId: id }),
}))