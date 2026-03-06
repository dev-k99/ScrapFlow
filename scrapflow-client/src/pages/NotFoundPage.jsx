import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6
                    bg-[var(--color-bg)] dark:bg-[var(--color-bg)]">
      <div className="glass-card p-10 max-w-sm w-full text-center space-y-5">
        <p className="text-8xl font-black text-[var(--color-text)] opacity-10 leading-none select-none">
          404
        </p>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Page not found</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link to="/dashboard" className="btn-brand inline-flex items-center gap-2 mx-auto">
          <Home size={15} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
