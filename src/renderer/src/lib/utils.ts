import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useThemeStore } from '../stores/theme-store'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOL: Record<string, string> = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  COP: '$',
  ARS: '$',
  CLP: '$'
}

const SUFFIX_SYMBOL: Record<string, boolean> = {
  USD: true,
  EUR: true
}

const ZERO_DECIMAL: Record<string, boolean> = {
  CLP: true,
  COP: true
}

export function formatCurrency(amount: number, currency?: string): string {
  const target = currency || useThemeStore.getState().currency
  const symbol = CURRENCY_SYMBOL[target] || '$'
  const fractionDigits = ZERO_DECIMAL[target] ? 0 : 2
  const value = Math.abs(amount)
  const fixed = value.toFixed(fractionDigits)
  const [whole, decimals] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const formatted = decimals ? `${grouped},${decimals}` : grouped
  return SUFFIX_SYMBOL[target] ? `${formatted}${symbol}` : `${symbol}${formatted}`
}

export function formatDate(date: Date, locale = 'es-MX'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium'
    }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

export function generateId(): string {
  return crypto.randomUUID()
}
