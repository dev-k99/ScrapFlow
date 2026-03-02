import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,     // { email, fullName, role, siteId }
  isAuthenticated: false,

  // Called on app mount to restore session
  initAuth: () => {
    const token = localStorage.getItem('sf_token')
    const userRaw = localStorage.getItem('sf_user')
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw)
        set({ token, user, isAuthenticated: true })
      } catch {
        localStorage.removeItem('sf_token')
        localStorage.removeItem('sf_user')
      }
    }
  },

  // Called after successful login
  login: (token, user) => {
    localStorage.setItem('sf_token', token)
    localStorage.setItem('sf_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  // Called on logout
  logout: () => {
    localStorage.removeItem('sf_token')
    localStorage.removeItem('sf_user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  // Helpers
  hasRole: (...roles) => {
    const { user } = get()
    return user ? roles.includes(user.role) : false
  },

  get siteId() {
    return get().user?.siteId ?? null
  },
}))