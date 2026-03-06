import { clsx } from 'clsx'

const VARIANTS = {
  default:   'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300',
  emerald:   'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  blue:      'bg-blue-50  dark:bg-blue-900/30  text-blue-700  dark:text-blue-400',
  amber:     'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  red:       'bg-red-50   dark:bg-red-900/30   text-red-700   dark:text-red-400',
  purple:    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}

// Map TicketStatus enum strings to badge variants
const STATUS_VARIANT = {
  Created:         'blue',
  GrossWeighed:    'blue',
  Graded:          'amber',
  TareWeighed:     'amber',
  PaymentRecorded: 'purple',
  Completed:       'emerald',
  Cancelled:       'red',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
      VARIANTS[variant] ?? VARIANTS.default,
      className
    )}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const variant = STATUS_VARIANT[status] ?? 'default'
  const label = status?.replace(/([A-Z])/g, ' $1').trim() ?? 'Unknown'
  return <Badge variant={variant}>{label}</Badge>
}
