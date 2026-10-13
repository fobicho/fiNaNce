import { useRatesStore } from '../stores/rates-store'
import { useThemeStore } from '../stores/theme-store'
import type { CurrencyCode } from './db'

export function convertAmount(amount: number, from?: CurrencyCode): number {
  const base = useThemeStore.getState().currency
  if (!from || from === base) return amount
  return useRatesStore.getState().convert(amount, from, base)
}

export function txAmount(tx: { amount: number; currency?: CurrencyCode }): number {
  return convertAmount(tx.amount, tx.currency)
}
