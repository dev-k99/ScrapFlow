import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'

export function useAuth() {
  const { login, logout, user, isAuthenticated, hasRole } = useAuthStore()
  const { toast } = useUiStore()
  const navigate = useNavigate()

  const handleLogin = async (dto) => {
    const res = await authApi.login(dto)
    const { token, email, fullName, role, expiresAt } = res.data
    login(token, { email, fullName, role, expiresAt })
    navigate('/dashboard')
    toast(`Welcome back, ${fullName?.split(' ')[0]}!`, 'success')
    return res.data
  }

  const handleRegister = async (dto) => {
    const res = await authApi.register(dto)
    const { token, email, fullName, role } = res.data
    login(token, { email, fullName, role })
    navigate('/dashboard')
    toast('Account created successfully', 'success')
    return res.data
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return {
    user,
    isAuthenticated,
    hasRole,
    handleLogin,
    handleRegister,
    handleLogout,
  }
}