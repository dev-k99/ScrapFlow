import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Tailwind class merger ────────────────────────────────────────────────────
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// ─── Currency / Number Formatting ────────────────────────────────────────────
export function formatCurrency(value, currency = 'ZAR') {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatWeight(value, unit = 'kg') {
  if (value == null) return '—'
  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} ${unit}`
}

export function formatTons(value) {
  if (value == null) return '—'
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} t`
  }
  return `${value.toFixed(1)} kg`
}

export function formatNumber(value, decimals = 0) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ─── Date / Time ──────────────────────────────────────────────────────────────
export function formatDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function formatRelative(date) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// ─── Ticket Status ────────────────────────────────────────────────────────────
export const TICKET_STATUS_LABELS = {
  Created: 'Created',
  GrossWeighed: 'Gross Weighed',
  Graded: 'Graded',
  TareWeighed: 'Tare Weighed',
  PaymentRecorded: 'Payment Recorded',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

export const TICKET_STATUS_COLORS = {
  Created: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  GrossWeighed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Graded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  TareWeighed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PaymentRecorded: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
}

export const TICKET_STEP_INDEX = {
  Created: 0,
  GrossWeighed: 1,
  Graded: 2,
  TareWeighed: 3,
  PaymentRecorded: 4,
  Completed: 5,
  Cancelled: -1,
}

// ─── Lot Status ───────────────────────────────────────────────────────────────
export const LOT_STATUS_COLORS = {
  InStock: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PartiallyAllocated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Allocated: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Sold: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  WrittenOff: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
}

// ─── ID Type Labels ───────────────────────────────────────────────────────────
export const ID_TYPE_LABELS = {
  SouthAfricanId: 'SA ID',
  Passport: 'Passport',
  BusinessRegistration: 'Company Reg.',
  AsylumPermit: 'Asylum Permit',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}