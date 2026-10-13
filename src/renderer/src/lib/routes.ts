import { lazy } from 'react'

/**
 * Rutas de la app y sus loaders.
 *
 * Cada pagina es un chunk separado. Los loaders se exportan para poder
 * calentarlos por intencion (hover/focus en la nav) en vez de descargar
 * las 9 rutas al arranque.
 */
export const routes = {
  '/': () => import('../pages/dashboard').then((m) => ({ default: m.Dashboard })),
  '/transactions': () => import('../pages/transactions').then((m) => ({ default: m.Transactions })),
  '/recurring': () => import('../pages/recurring').then((m) => ({ default: m.Recurring })),
  '/accounts': () => import('../pages/accounts').then((m) => ({ default: m.Accounts })),
  '/budgets': () => import('../pages/budgets').then((m) => ({ default: m.Budgets })),
  '/categories': () => import('../pages/categories').then((m) => ({ default: m.Categories })),
  '/goals': () => import('../pages/goals').then((m) => ({ default: m.Goals })),
  '/reports': () => import('../pages/reports').then((m) => ({ default: m.Reports })),
  '/settings': () => import('../pages/settings').then((m) => ({ default: m.Settings }))
} as const

export type RoutePath = keyof typeof routes

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
