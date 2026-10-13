import { Suspense, useEffect, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Shell } from './components/shell'
import { Toaster } from './components/ui/toaster'
import { ErrorBoundary } from './components/error-boundary'
import { useFinanceStore } from './stores/finance-store'
import { useActionStore } from './stores/action-store'
import { useNotificationStore } from './stores/notification-store'
import { useBackupStore, type BackupInterval } from './stores/backup-store'
import { buildBackupPayload } from './lib/backup'
import { useKeyboardShortcuts } from './lib/use-keyboard-shortcuts'
import { OnboardingDialog, onboardingDone, dismissOnboarding } from './components/onboarding-dialog'
import { Splash } from './components/splash'
import { AiQuickChat, QUICK_CHAT_EVENT } from './components/ai-quick-chat'
import { seedRan } from './lib/seed'
import {
  DashboardPage,
  TransactionsPage,
  RecurringPage,
  AccountsPage,
  BudgetsPage,
  CategoriesPage,
  GoalsPage,
  ReportsPage,
  SettingsPage,
  prefetchRoute,
  routes,
  type RoutePath
} from './lib/routes'

export default function App() {
  const loadData = useFinanceStore((s) => s.loadData)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pagesWarm, setPagesWarm] = useState(false)

  useEffect(() => {
    if (!ready) return
    useNotificationStore.getState().generate()
    if (seedRan() && !onboardingDone()) {
      const txCount = useFinanceStore.getState().transactions.length
      if (txCount === 0) {
        setShowOnboarding(true)
      } else {
        dismissOnboarding()
      }
    }
  }, [ready])

  useEffect(() => {
    loadData()
      .then(() => setReady(true))
      .catch((e) => {
        setError(e?.message || 'Error al cargar datos')
      })
  }, [loadData])

  useEffect(() => {
    if (!ready) return

    const hashPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
    const initialPath = (hashPath in routes ? hashPath : '/') as RoutePath
    let cancelled = false

    prefetchRoute(initialPath).catch(() => undefined).finally(() => {
      if (!cancelled) setPagesWarm(true)
    })

    return () => {
      cancelled = true
    }
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const { interval, backupPath, lastBackup, addBackup } = useBackupStore.getState()
    if (interval === 'never' || !backupPath) return

    const now = Date.now()
    const last = lastBackup ? new Date(lastBackup).getTime() : 0
    const msDay = 86400000
    const intervals: Record<BackupInterval, number> = { never: 0, daily: msDay, weekly: msDay * 7, monthly: msDay * 30 }
    if (now - last < intervals[interval]) return

    ;(async () => {
      try {
        const json = JSON.stringify(await buildBackupPayload(), null, 2)
        const dateStr = new Date().toISOString().slice(0, 10)
        const defaultName = `finance-backup-${dateStr}.json`
        const defaultPath = `${backupPath.replace(/\\/g, '/')}/${defaultName}`
        const savedPath = await window.api.backupSave(json, defaultPath)
        if (savedPath) {
          addBackup({ path: savedPath, date: new Date().toISOString(), label: dateStr })
        }
      } catch { /* silent */ }
    })()
  }, [ready])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error al cargar</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return <div className="h-screen bg-background" />
  }

  return (
    <>
      <Splash ready={pagesWarm} />
      <HashRouter>
        {showOnboarding && <OnboardingDialog onClose={() => setShowOnboarding(false)} />}
        <ErrorBoundary>
          <Toaster />
          <GlobalShortcuts />
          <AiQuickChat />
          <Shell>
            <Suspense
              fallback={
                <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-2xl bg-muted/20" aria-live="polite">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                    Cargando página…
                  </div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/recurring" element={<RecurringPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Shell>
        </ErrorBoundary>
      </HashRouter>
    </>
  )
}

function GlobalShortcuts() {
  const navigate = useNavigate()
  const { action, trigger, requestAction, clearAction } = useActionStore()

  useEffect(() => {
    if (action === 'new-transaction' && trigger > 0) {
      navigate('/transactions', { state: { newTransaction: true } })
      clearAction()
    }
  }, [action, trigger, navigate, clearAction])

  useEffect(() => {
    function handleAiNavigate(e: Event) {
      const path = (e as CustomEvent<string>).detail
      if (path) navigate(path)
    }
    window.addEventListener('ai-navigate', handleAiNavigate)
    return () => window.removeEventListener('ai-navigate', handleAiNavigate)
  }, [navigate])

  const shortcuts = useMemo(() => [
    { key: 'n', ctrl: true, handler: () => requestAction('new-transaction') },
    { key: 'f', ctrl: true, handler: () => window.dispatchEvent(new CustomEvent('focus-search')) },
    { key: ' ', ctrl: true, handler: () => window.dispatchEvent(new CustomEvent(QUICK_CHAT_EVENT)) },
  ], [requestAction])
  useKeyboardShortcuts(shortcuts)
  return null
}
