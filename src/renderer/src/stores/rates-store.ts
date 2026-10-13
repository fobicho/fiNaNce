import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrencyCode } from '../lib/db'

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  MXN: 'Peso Mexicano',
  USD: 'Dólar',
  EUR: 'Euro',
  COP: 'Peso Colombiano',
  ARS: 'Peso Argentino',
  CLP: 'Peso Chileno'
}

const DEFAULT_RATES: Record<CurrencyCode, number> = {
  MXN: 1,
  USD: 17.5,
  EUR: 19.1,
  COP: 0.0045,
  ARS: 0.051,
  CLP: 0.02
}

interface RatesState {
  rates: Record<CurrencyCode, number>
  setRate: (currency: CurrencyCode, value: number) => void
  convert: (amount: number, from: CurrencyCode, to: CurrencyCode) => number
}

export const useRatesStore = create<RatesState>()(
  persist(
    (set, get) => ({
      rates: { ...DEFAULT_RATES },

      setRate: (currency, value) =>
        set((state) => ({
          rates: { ...state.rates, [currency]: Math.max(0.0001, value) }
        })),

      convert: (amount, from, to) => {
        if (from === to) return amount
        const { rates } = get()
        const inBase = amount * (rates[from] || 1)
        return inBase / (rates[to] || 1)
      }
    }),
    { name: 'finance-rates' }
  )
)

export function formatConverted(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  return useRatesStore.getState().convert(amount, from, to)
}
