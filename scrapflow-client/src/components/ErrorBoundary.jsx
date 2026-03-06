import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Catches render errors anywhere in the subtree.
 * Wrap each <Route> in App.jsx: <ErrorBoundary><Page /></ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Something went wrong</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              An unexpected error occurred. Please try reloading the page.
            </p>
          </div>

          {this.state.error?.message && (
            <p className="text-xs font-mono bg-[var(--color-surface-2)] rounded-lg px-3 py-2
                           text-[var(--color-text-muted)] text-left overflow-auto max-h-24">
              {this.state.error.message}
            </p>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => this.handleReset()}
              className="btn-brand flex items-center gap-2"
              aria-label="Reload the page"
            >
              <RefreshCw size={15} /> Reload page
            </button>
            <a href="/dashboard" className="btn-ghost flex items-center gap-2" aria-label="Go to dashboard">
              <Home size={15} /> Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}
