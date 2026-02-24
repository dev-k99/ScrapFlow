import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value)
}

export function formatWeight(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} tons`
  }
  return `${kg.toFixed(0)} kg`
}
