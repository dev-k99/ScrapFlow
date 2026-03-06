/**
 * Pulse-animated skeleton loaders for every page layout.
 * Usage: show while `isLoading` is true instead of a spinner.
 */

function Bar({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-[var(--color-surface-2)] ${className}`} />
  )
}

/** 8 table rows of grey bars */
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* header row */}
      <div className="flex gap-4 px-4 py-3 border-b border-[var(--color-border)]">
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-[var(--color-border)]">
          {Array.from({ length: cols }).map((_, c) => (
            <Bar key={c} className={`h-3 flex-1 ${c === 0 ? 'max-w-[120px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Single card-shaped skeleton */
export function CardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3 animate-pulse">
      <Bar className="h-4 w-1/3" />
      <Bar className="h-3 w-2/3" />
      <Bar className="h-3 w-1/2" />
    </div>
  )
}

/** 4 small stat cards in a row */
export function StatCardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
          <Bar className="h-7 w-24" />
          <Bar className="h-2 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Tall rectangle for chart areas */
export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={`glass-card p-4 space-y-3 animate-pulse ${height}`}>
      <Bar className="h-4 w-32" />
      <div className="flex-1 flex items-end gap-2 pt-4 h-[calc(100%-2rem)]">
        {Array.from({ length: 12 }).map((_, i) => (
          <Bar key={i} className={`flex-1 rounded-t-sm`}
            style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  )
}
