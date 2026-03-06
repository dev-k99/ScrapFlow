import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { UserPlus, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const ROLES = ['Owner', 'Manager', 'Operator', 'Viewer']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [serverError, setServerError] = useState(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { role: 'Operator' },
  })
  const password = watch('password')

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await authApi.register({
        email:     data.email,
        password:  data.password,
        firstName: data.firstName,
        lastName:  data.lastName,
        role:      data.role,
        siteId:    null,
      })
      const { token, email: userEmail, fullName, role } = res.data
      login(token, { email: userEmail, fullName, role })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-emerald-600 rounded-2xl items-center justify-center mb-4 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
            <UserPlus className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-text)] tracking-tight">Create Account</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Set up your ScrapFlow yard</p>
        </div>

        <div className="glass-card p-8">
          {serverError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20
                            border border-red-200 dark:border-red-800 mb-6">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">First Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input className="sf-input pl-9" placeholder="Thabo" {...register('firstName', { required: 'Required' })} />
                </div>
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Last Name</label>
                <input className="sf-input" placeholder="Molefe" {...register('lastName', { required: 'Required' })} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  className="sf-input pl-9"
                  placeholder="you@scrapyard.co.za"
                  {...register('email', {
                    required: 'Email required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Valid email required' },
                  })}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="password"
                  className="sf-input pl-9"
                  placeholder="Min. 8 characters, 1 digit, 1 uppercase"
                  {...register('password', {
                    required: 'Password required',
                    minLength: { value: 8, message: 'Min. 8 characters' },
                    pattern: { value: /(?=.*[A-Z])(?=.*\d)/, message: 'Need uppercase and digit' },
                  })}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="password"
                  className="sf-input pl-9"
                  placeholder="Re-enter your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Role</label>
              <select className="sf-input" {...register('role', { required: true })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-brand w-full py-3 text-base justify-center mt-2">
              {isSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                : 'Create Account'
              }
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
