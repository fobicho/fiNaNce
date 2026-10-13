import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { CurrencyCode } from '../lib/db'
export type { CurrencyCode }

export type ThemeId = 'default' | 'beige'
export type Mode = 'dark' | 'light'
export type Locale = 'es-MX' | 'en-US'

interface ThemeState {
  mode: Mode
  theme: ThemeId
  sidebarCollapsed: boolean
  currency: CurrencyCode
  locale: Locale
  toggleMode: () => void
  setMode: (mode: Mode) => void
  setTheme: (theme: ThemeId) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrency: (c: CurrencyCode) => void
  setLocale: (l: Locale) => void
}

function applyDocument(theme: ThemeId, mode: Mode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', mode)
}

export function syncDocumentTheme(state: Pick<ThemeState, 'theme' | 'mode'>) {
  applyDocument(state.theme, state.mode)
}

export const useThemeStore = create<ThemeState>()(
  persist(    (set) => ({
      mode: 'dark',
      theme: 'default',
      sidebarCollapsed: false,
      currency: 'CLP',
      locale: 'es-MX',
      toggleMode: () =>
        set((state) => {
          const next = state.mode === 'dark' ? 'light' : 'dark'
          applyDocument(state.theme, next)
          return { mode: next }
        }),
      setMode: (mode) =>
        set((state) => {
          applyDocument(state.theme, mode)
          return { mode }
        }),
      setTheme: (theme) =>
        set((state) => {
          applyDocument(theme, state.mode)
          return { theme }
        }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale })
    }),
    {
      name: 'finance-theme',
      version: 2,
      migrate: (state: unknown) => {
        const s = state as Partial<ThemeState>
        return { ...s, theme: 'default' as ThemeId, currency: 'CLP' as CurrencyCode }
      }
    }
  )
)

let lastTheme: ThemeId | null = null
let lastMode: Mode | null = null

useThemeStore.subscribe((state) => {
  if (state.theme === lastTheme && state.mode === lastMode) return
  lastTheme = state.theme
  lastMode = state.mode
  applyDocument(state.theme, state.mode)
})
