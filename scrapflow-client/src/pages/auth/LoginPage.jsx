import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [serverError, setServerError] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setServerError(null)
    try {
      const res = await authApi.login({ email, password })
      const { token, email: userEmail, fullName, role, siteId, expiry } = res.data

      login(token, { email: userEmail, fullName, role, siteId, expiry })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(
        err.response?.data?.message ?? 'Unable to sign in. Check your credentials and try again.'
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-emerald-600 rounded-2xl items-center justify-center mb-4 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
            <LogIn className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-text)] tracking-tight">ScrapFlow SA</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Sign in to your yard</p>
        </div>

        <div className="glass-card p-8">
          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20
                            border border-red-200 dark:border-red-800 mb-6">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  placeholder="you@scrapyard.co.za"
                  className="sf-input pl-10"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                  })}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="sf-input pl-10"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand w-full py-3 text-base mt-2 justify-center"
            >
              {isSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
            Need to set up a yard?{' '}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Register now
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
