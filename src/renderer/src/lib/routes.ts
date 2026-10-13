import { lazy, type ComponentType } from 'react'

/**
 * Rutas de la app y sus loaders.
 *
 * Cada pagina es un chunk separado. Los loaders se exportan para poder
 * calentarlos por intencion (hover/focus en la nav) en vez de descargar
 * las 9 rutas al arranque.
 */

const LOAD_TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 300

type RouteLoader = () => Promise<{ default: ComponentType<any> }>

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout(path: string, promise: Promise<{ default: ComponentType<any> }>) {
  return new Promise<{ default: ComponentType<any> }>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout de ${LOAD_TIMEOUT_MS}ms cargando ${path}`)),
      LOAD_TIMEOUT_MS
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function withRecovery(path: string, load: RouteLoader): RouteLoader {
  return async () => {
    try {
      return await withTimeout(path, load())
    } catch (firstError) {
      console.warn(`[routes] No se pudo cargar ${path}, reintentando...`, firstError)
      await wait(RETRY_DELAY_MS)
      return withTimeout(path, load())
    }
  }
}

const loaders = {
  '/': () => import('../pages/dashboard').then((m) => ({ default: m.Dashboard })),
  '/transactions': () => import('../pages/transactions').then((m) => ({ default: m.Transactions })),
  '/recurring': () => import('../pages/recurring').then((m) => ({ default: m.Recurring })),
  '/accounts': () => import('../pages/accounts').then((m) => ({ default: m.Accounts })),
  '/budgets': () => import('../pages/budgets').then((m) => ({ default: m.Budgets })),
  '/categories': () => import('../pages/categories').then((m) => ({ default: m.Categories })),
  '/goals': () => import('../pages/goals').then((m) => ({ default: m.Goals })),
  '/reports': () => import('../pages/reports').then((m) => ({ default: m.Reports })),
  '/settings': () => import('../pages/settings').then((m) => ({ default: m.Settings }))
} as const satisfies Record<string, RouteLoader>

export type RoutePath = keyof typeof loaders

export const routes = Object.fromEntries(
  (Object.keys(loaders) as RoutePath[]).map((path) => [path, withRecovery(path, loaders[path])])
) as Record<RoutePath, RouteLoader>

export const DashboardPage = lazy(routes['/'])
export const TransactionsPage = lazy(routes['/transactions'])
export const RecurringPage = lazy(routes['/recurring'])
export const AccountsPage = lazy(routes['/accounts'])
export const BudgetsPage = lazy(routes['/budgets'])
export const CategoriesPage = lazy(routes['/categories'])
export const GoalsPage = lazy(routes['/goals'])
export const ReportsPage = lazy(routes['/reports'])
export const SettingsPage = lazy(routes['/settings'])

const warmed = new Set<RoutePath>()

/**
 * Calienta un chunk de ruta una sola vez.
 *
 * Comparte el loader con el `lazy()` de la ruta, asi que ademas de eliminar
 * la suspension en la primera visita llena el cache de modulos de React.
 * Un fallo saca la ruta del set para permitir reintentar.
 */
export function prefetchRoute(path: RoutePath): Promise<unknown> {
  const existing = warmed.has(path)
  if (existing) return Promise.resolve()

  warmed.add(path)
  return Promise.resolve(routes[path]()).catch((e: unknown) => {
    warmed.delete(path)
    throw e
  })
}

export function warmRoute(path: RoutePath): void {
  prefetchRoute(path).catch(() => undefined)
}
