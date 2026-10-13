import type { AiToolDefinition, AiToolCall } from './types'
import { useFinanceStore } from '../../stores/finance-store'
import { useThemeStore } from '../../stores/theme-store'
import type { Account, Budget, CurrencyCode, Transaction } from '../db'
import { formatCurrency } from '../utils'

const PAGE_PATHS: Record<string, string> = {
  dashboard: '/',
  inicio: '/',
  transacciones: '/transactions',
  transactions: '/transactions',
  recurrentes: '/recurring',
  recurring: '/recurring',
  cuentas: '/accounts',
  accounts: '/accounts',
  presupuestos: '/budgets',
  budgets: '/budgets',
  categorias: '/categories',
  categories: '/categories',
  metas: '/goals',
  goals: '/goals',
  reportes: '/reports',
  reports: '/reports',
  ajustes: '/settings',
  settings: '/settings'
}

function normalizePage(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

type Named = { id: string; name: string }

function findByIdOrName<T extends Named>(items: T[], args: Record<string, unknown>): T | undefined {
  const id = args.id ? String(args.id) : ''
  if (id) {
    const byId = items.find((item) => item.id === id)
    if (byId) return byId
  }
  const name = args.name ? String(args.name).trim().toLowerCase() : ''
  if (name) return items.find((item) => item.name.toLowerCase() === name)
  return undefined
}

function findBudgetItem(budgets: Budget[], args: Record<string, unknown>): Budget | undefined {
  const id = args.id ? String(args.id) : ''
  if (id) {
    const byId = budgets.find((b) => b.id === id)
    if (byId) return byId
  }
  const category = args.category ? String(args.category).trim().toLowerCase() : ''
  if (!category) return undefined
  return budgets.find((b) => b.category.toLowerCase() === category)
}

export const TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: 'addTransaction',
    description: 'Agrega una nueva transacción (gasto o ingreso)',
    requiresConfirmation: true,
    describe: (args) =>
      `Registrar ${args.type === 'income' ? 'ingreso' : 'gasto'} de ${formatCurrency(Math.abs(Number(args.amount) || 0))} en "${String(args.category ?? '')}"`,
    parameters: {
      type: { type: 'string', enum: ['income', 'expense'], description: 'Tipo: income (ingreso) o expense (gasto)' },
      amount: { type: 'number', description: 'Monto en número positivo' },
      category: { type: 'string', description: 'Nombre de la categoría' },
      description: { type: 'string', description: 'Descripción de la transacción' },
      date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD (opcional, hoy por defecto)' },
      currency: { type: 'string', description: 'Moneda (opcional, usa la del sistema por defecto)' }
    },
    execute: async (args) => {
      const { addTransaction } = useFinanceStore.getState()
      const baseCurrency = useThemeStore.getState().currency
      const date = args.date ? new Date(args.date as string) : new Date()
      const tx = {
        type: args.type as 'income' | 'expense',
        amount: args.type === 'expense' ? -Math.abs(Number(args.amount)) : Math.abs(Number(args.amount)),
        category: args.category as string,
        description: args.description as string,
        date,
        currency: (args.currency as CurrencyCode) || baseCurrency
      }
      await addTransaction(tx)
      const label = tx.type === 'income' ? 'Ingreso' : 'Gasto'
      return `✅ ${label} de ${formatCurrency(Math.abs(tx.amount), tx.currency)} en "${tx.category}" registrado${tx.description ? ` (${tx.description})` : ''}.`
    }
  },
  {
    name: 'getSummary',
    description: 'Obtiene un resumen financiero del período actual',
    parameters: {},
    execute: async () => {
      const store = useFinanceStore.getState()
      const { currency } = useThemeStore.getState()
      const income = store.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = store.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
      const balance = income - expenses
      const txCount = store.transactions.length
      const accountCount = store.accounts.length
      const budgetCount = store.budgets.length
      const goalCount = store.goals.length
      const topCategory = [...store.transactions]
        .filter((t) => t.type === 'expense')
        .reduce<Record<string, number>>((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
          return acc
        }, {})
      const topCat = Object.entries(topCategory).sort(([, a], [, b]) => b - a)[0]
      return [
        `Resumen financiero (moneda: ${currency}):`,
        `• Balance total: ${formatCurrency(balance)}`,
        `• Ingresos totales: ${formatCurrency(income)}`,
        `• Gastos totales: ${formatCurrency(expenses)}`,
        `• Transacciones registradas: ${txCount}`,
        `• Cuentas: ${accountCount}`,
        `• Presupuestos: ${budgetCount}`,
        `• Metas: ${goalCount}`,
        topCat ? `• Mayor gasto: ${topCat[0]} (${formatCurrency(topCat[1])})` : ''
      ].filter(Boolean).join('\n')
    }
  },
  {
    name: 'searchTransactions',
    description: 'Busca transacciones por texto, tipo, categoría o rango de fechas',
    parameters: {
      query: { type: 'string', description: 'Texto a buscar en descripción o categoría (opcional)' },
      type: { type: 'string', enum: ['income', 'expense'], description: 'Filtrar por tipo (opcional)' },
      category: { type: 'string', description: 'Filtrar por categoría (opcional)' },
      limit: { type: 'number', description: 'Máximo de resultados (opcional, default 10)' }
    },
    execute: async (args) => {
      const { transactions } = useFinanceStore.getState()
      let results = [...transactions]
      if (args.query) {
        const q = String(args.query).toLowerCase()
        results = results.filter((t) => t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      }
      if (args.type) results = results.filter((t) => t.type === args.type)
      if (args.category) results = results.filter((t) => t.category === args.category)
      const limit = Number(args.limit) || 10
      results = results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
      if (results.length === 0) return 'No se encontraron transacciones.'
      const header = `📋 ${results.length} transacciones encontradas:\n`
      const lines = results.map((t, i) => {
        const sign = t.type === 'income' ? '+' : ''
        return `${i + 1}. [${t.id}] ${t.description || t.category} — ${sign}${formatCurrency(t.amount, t.currency)} — ${new Date(t.date).toLocaleDateString('es-MX')}`
      })
      return header + lines.join('\n')
    }
  },
  {
    name: 'getUpcomingRecurring',
    description: 'Obtiene las transacciones recurrentes próximas',
    parameters: {},
    execute: async () => {
      const { transactions } = useFinanceStore.getState()
      const recurring = transactions.filter((t) => t.isRecurring)
      if (recurring.length === 0) return 'No hay transacciones recurrentes.'
      const lines = recurring.map((t) => {
        const sign = t.type === 'income' ? '+' : '-'
        return `• ${t.description || t.category}: ${sign}${formatCurrency(Math.abs(t.amount), t.currency)} (${t.recurringInterval || 'mensual'})`
      })
      return `📅 Transacciones recurrentes:\n${lines.join('\n')}`
    }
  },
  {
    name: 'undoLastTransaction',
    description: 'Elimina la última transacción agregada (deshacer)',
    parameters: {},
    execute: async () => {
      const { removeTransaction, transactions } = useFinanceStore.getState()
      const sorted = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const last = sorted[0]
      if (!last) return 'No hay transacciones para deshacer.'
      await removeTransaction(last.id)
      return `✅ Eliminada: ${last.type === 'income' ? 'Ingreso' : 'Gasto'} de ${formatCurrency(Math.abs(last.amount), last.currency)} en "${last.category}".`
    }
  },
  {
    name: 'getBudgetsStatus',
    description: 'Obtiene el estado de los presupuestos',
    parameters: {},
    execute: async () => {
      const { budgets } = useFinanceStore.getState()
      if (budgets.length === 0) return 'No hay presupuestos configurados.'
      const lines = budgets.map((b) => {
        const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0
        return `• [${b.id}] ${b.category} (${b.month + 1}/${b.year}): ${formatCurrency(b.spent)} de ${formatCurrency(b.limit)} (${pct}%)`
      })
      return `📊 Presupuestos del mes:\n${lines.join('\n')}`
    }
  },
  {
    name: 'getAccountsSummary',
    description: 'Obtiene el resumen de cuentas',
    parameters: {},
    execute: async () => {
      const { accounts } = useFinanceStore.getState()
      if (accounts.length === 0) return 'No hay cuentas registradas.'
      const lines = accounts.map((a) => `• [${a.id}] ${a.name}: ${formatCurrency(a.balance)}`)
      const total = accounts.reduce((s, a) => s + a.balance, 0)
      return `💰 Cuentas:\n${lines.join('\n')}\n\nTotal: ${formatCurrency(total)}`
    }
  },
  {
    name: 'suggestCategory',
    description: 'Sugiere una categoría basada en la descripción de una transacción',
    parameters: {
      description: { type: 'string', description: 'Descripción de la transacción' }
    },
    execute: async (args) => {
      const { categories } = useFinanceStore.getState()
      const desc = String(args.description).toLowerCase()
      const keywords: Record<string, string[]> = {
        'Comida': ['comida', 'restaurante', 'uber eats', 'rapp', 'super', 'supermercado', 'despensa', 'comer', 'cena', 'desayuno', 'almuerzo'],
        'Transporte': ['uber', 'taxi', 'did', 'combustible', 'gasolina', 'metro', 'camión', 'bus', 'transporte', 'estacionamiento'],
        'Entretenimiento': ['cine', 'netflix', 'spotify', 'juego', 'concierto', 'teatro', 'suscripción'],
        'Salud': ['farmacia', 'médico', 'doctor', 'hospital', 'medicina', 'seguro'],
        'Servicios': ['agua', 'luz', 'gas', 'internet', 'teléfono', 'renta'],
        'Educación': ['curso', 'escuela', 'universidad', 'libro', 'clase']
      }
      for (const [cat, words] of Object.entries(keywords)) {
        if (words.some((w) => desc.includes(w))) return cat
      }
      const existing = categories.filter((c) => c.type === 'expense').map((c) => c.name)
      if (existing.length > 0) return `No encontré una categoría obvia. Categorías existentes: ${existing.join(', ')}`
      return 'Gastos Varios'
    }
  },
  {
    name: 'addAccount',
    description: 'Crea una cuenta nueva en la aplicación',
    requiresConfirmation: true,
    describe: (args) => `Crear la cuenta "${String(args.name ?? '')}"`,
    parameters: {
      name: { type: 'string', description: 'Nombre de la cuenta' },
      type: { type: 'string', enum: ['debit', 'savings', 'credit', 'cash'], description: 'Tipo: debit (débito), savings (ahorro), credit (crédito) o cash (efectivo)' },
      balance: { type: 'number', description: 'Saldo inicial (opcional, 0 por defecto)' },
      color: { type: 'string', description: 'Color en hexadecimal (opcional)' }
    },
    execute: async (args) => {
      const { addAccount } = useFinanceStore.getState()
      const name = String(args.name ?? '').trim()
      if (!name) return 'Error: falta el nombre de la cuenta.'
      const allowed: Account['type'][] = ['debit', 'savings', 'credit', 'cash']
      const type = allowed.includes(args.type as Account['type']) ? (args.type as Account['type']) : 'cash'
      await addAccount({
        name,
        type,
        balance: Number(args.balance) || 0,
        color: typeof args.color === 'string' ? args.color : undefined
      })
      return `✅ Cuenta "${name}" creada.`
    }
  },
  {
    name: 'addBudget',
    description: 'Crea un presupuesto mensual para una categoría de gasto',
    requiresConfirmation: true,
    describe: (args) => `Crear presupuesto de ${formatCurrency(Math.abs(Number(args.limit) || 0))} para "${String(args.category ?? '')}"`,
    parameters: {
      category: { type: 'string', description: 'Nombre de la categoría de gasto' },
      limit: { type: 'number', description: 'Límite de gasto mensual' },
      month: { type: 'number', description: 'Mes del 1 al 12 (opcional, el actual)' },
      year: { type: 'number', description: 'Año (opcional, el actual)' }
    },
    execute: async (args) => {
      const { addBudget, categories } = useFinanceStore.getState()
      const category = String(args.category ?? '').trim()
      const limit = Math.abs(Number(args.limit))
      if (!category || !limit) return 'Error: indica la categoría y el límite del presupuesto.'
      const exists = categories.some((c) => c.type === 'expense' && c.name.toLowerCase() === category.toLowerCase())
      if (!exists) return `No existe una categoría de gasto llamada "${category}".`
      const now = new Date()
      const monthArg = Number(args.month)
      const month = monthArg >= 1 && monthArg <= 12 ? monthArg - 1 : now.getMonth()
      const year = Number(args.year) || now.getFullYear()
      await addBudget({ category, limit, month, year })
      return `✅ Presupuesto de ${formatCurrency(limit)} para "${category}" creado.`
    }
  },
  {
    name: 'addGoal',
    description: 'Crea una meta de ahorro',
    requiresConfirmation: true,
    describe: (args) => `Crear la meta "${String(args.name ?? '')}" por ${formatCurrency(Math.abs(Number(args.targetAmount) || 0))}`,
    parameters: {
      name: { type: 'string', description: 'Nombre de la meta' },
      targetAmount: { type: 'number', description: 'Monto objetivo' },
      deadline: { type: 'string', description: 'Fecha límite en formato YYYY-MM-DD (opcional)' },
      color: { type: 'string', description: 'Color en hexadecimal (opcional)' },
      icon: { type: 'string', description: 'Nombre del ícono (opcional)' }
    },
    execute: async (args) => {
      const { addGoal } = useFinanceStore.getState()
      const name = String(args.name ?? '').trim()
      const targetAmount = Math.abs(Number(args.targetAmount))
      if (!name || !targetAmount) return 'Error: indica el nombre y el monto objetivo de la meta.'
      const deadline = args.deadline ? new Date(String(args.deadline)) : undefined
      await addGoal({
        name,
        targetAmount,
        currentAmount: 0,
        deadline,
        color: typeof args.color === 'string' ? args.color : '#8b5cf6',
        icon: typeof args.icon === 'string' ? args.icon : 'PiggyBank'
      })
      return `✅ Meta "${name}" creada por ${formatCurrency(targetAmount)}.`
    }
  },
  {
    name: 'addCategory',
    description: 'Crea una categoría de ingreso o de gasto',
    requiresConfirmation: true,
    describe: (args) => `Crear la categoría "${String(args.name ?? '')}"`,
    parameters: {
      name: { type: 'string', description: 'Nombre de la categoría' },
      type: { type: 'string', enum: ['income', 'expense'], description: 'income (ingreso) o expense (gasto)' },
      icon: { type: 'string', description: 'Nombre del ícono (opcional)' },
      color: { type: 'string', description: 'Color en hexadecimal (opcional)' }
    },
    execute: async (args) => {
      const { addCategory } = useFinanceStore.getState()
      const name = String(args.name ?? '').trim()
      if (!name) return 'Error: falta el nombre de la categoría.'
      const type = args.type === 'income' ? 'income' : 'expense'
      await addCategory({
        name,
        type,
        icon: typeof args.icon === 'string' ? args.icon : 'Receipt',
        color: typeof args.color === 'string' ? args.color : type === 'income' ? '#22c55e' : '#ef4444'
      })
      return `✅ Categoría "${name}" creada.`
    }
  },
  {
    name: 'navigate',
    description: 'Lleva al usuario a una sección de la aplicación para que vea o use esa función',
    parameters: {
      page: { type: 'string', enum: ['dashboard', 'transacciones', 'recurrentes', 'cuentas', 'presupuestos', 'categorias', 'metas', 'reportes', 'ajustes'], description: 'Sección de destino' }
    },
    execute: async (args) => {
      const key = normalizePage(String(args.page ?? ''))
      const path = PAGE_PATHS[key]
      if (!path) return `No conozco la sección "${args.page}". Puedo ir a: ${Object.keys(PAGE_PATHS).join(', ')}.`
      window.dispatchEvent(new CustomEvent('ai-navigate', { detail: path }))
      return `✅ Te llevé a la sección "${args.page}".`
    }
  },
  {
    name: 'getCategories',
    description: 'Lista las categorías con su id y tipo',
    parameters: {},
    execute: async () => {
      const { categories } = useFinanceStore.getState()
      if (categories.length === 0) return 'No hay categorías registradas.'
      const lines = categories.map((c) => `• [${c.id}] ${c.name} (${c.type === 'income' ? 'ingreso' : 'gasto'})`)
      return `🏷️ Categorías:\n${lines.join('\n')}`
    }
  },
  {
    name: 'getGoals',
    description: 'Lista las metas de ahorro con su id y progreso',
    parameters: {},
    execute: async () => {
      const { goals } = useFinanceStore.getState()
      if (goals.length === 0) return 'No hay metas registradas.'
      const lines = goals.map((g) => `• [${g.id}] ${g.name}: ${formatCurrency(g.currentAmount)} de ${formatCurrency(g.targetAmount)}`)
      return `🎯 Metas:\n${lines.join('\n')}`
    }
  },
  {
    name: 'updateTransaction',
    description: 'Edita una transacción existente por id',
    requiresConfirmation: true,
    describe: (args) => `Modificar la transacción ${String(args.id ?? '')}`,
    parameters: {
      id: { type: 'string', description: 'Id de la transacción a editar' },
      type: { type: 'string', enum: ['income', 'expense'], description: 'Nuevo tipo (opcional)' },
      amount: { type: 'number', description: 'Nuevo monto positivo (opcional)' },
      category: { type: 'string', description: 'Nueva categoría (opcional)' },
      description: { type: 'string', description: 'Nueva descripción (opcional)' },
      date: { type: 'string', description: 'Nueva fecha YYYY-MM-DD (opcional)' },
      accountId: { type: 'string', description: 'Nueva cuenta (opcional)' }
    },
    execute: async (args) => {
      const { transactions, updateTransaction } = useFinanceStore.getState()
      const id = String(args.id ?? '')
      const tx = transactions.find((t) => t.id === id)
      if (!tx) return `No encontré una transacción con id "${id}".`
      const type = args.type === 'income' || args.type === 'expense' ? args.type : tx.type
      const updates: Partial<Transaction> = {}
      if (args.type) updates.type = type
      if (args.amount !== undefined) updates.amount = (type === 'expense' ? -1 : 1) * Math.abs(Number(args.amount))
      if (args.category !== undefined) updates.category = String(args.category)
      if (args.description !== undefined) updates.description = String(args.description)
      if (args.date !== undefined) updates.date = new Date(String(args.date))
      if (args.accountId !== undefined) updates.accountId = String(args.accountId)
      if (Object.keys(updates).length === 0) return 'No indicaste qué cambiar.'
      await updateTransaction(id, updates)
      return `✅ Transacción actualizada: ${tx.description || tx.category}.`
    }
  },
  {
    name: 'deleteTransaction',
    description: 'Elimina una transacción existente por id',
    requiresConfirmation: true,
    describe: (args) => `Eliminar la transacción ${String(args.id ?? '')}`,
    parameters: {
      id: { type: 'string', description: 'Id de la transacción a eliminar' }
    },
    execute: async (args) => {
      const { transactions, removeTransaction } = useFinanceStore.getState()
      const id = String(args.id ?? '')
      const tx = transactions.find((t) => t.id === id)
      if (!tx) return `No encontré una transacción con id "${id}".`
      await removeTransaction(id)
      return `✅ Transacción eliminada: ${tx.description || tx.category} (${formatCurrency(Math.abs(tx.amount), tx.currency)}).`
    }
  },
  {
    name: 'updateAccount',
    description: 'Edita una cuenta existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Modificar la cuenta "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la cuenta (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre actual de la cuenta' },
      newName: { type: 'string', description: 'Nuevo nombre (opcional)' },
      type: { type: 'string', enum: ['debit', 'savings', 'credit', 'cash'], description: 'Nuevo tipo (opcional)' },
      color: { type: 'string', description: 'Nuevo color hex (opcional)' }
    },
    execute: async (args) => {
      const { accounts, updateAccount } = useFinanceStore.getState()
      const account = findByIdOrName(accounts, args)
      if (!account) return 'No encontré esa cuenta.'
      const updates: Partial<Account> = {}
      if (args.newName !== undefined) updates.name = String(args.newName)
      if (args.color !== undefined) updates.color = String(args.color)
      if (args.type !== undefined) {
        const allowed: Account['type'][] = ['debit', 'savings', 'credit', 'cash']
        if (allowed.includes(args.type as Account['type'])) updates.type = args.type as Account['type']
      }
      if (Object.keys(updates).length === 0) return 'No indicaste qué cambiar.'
      await updateAccount(account.id, updates)
      return `✅ Cuenta "${updates.name ?? account.name}" actualizada.`
    }
  },
  {
    name: 'deleteAccount',
    description: 'Elimina una cuenta existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Eliminar la cuenta "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la cuenta (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre de la cuenta' }
    },
    execute: async (args) => {
      const { accounts, transactions, removeAccount } = useFinanceStore.getState()
      const account = findByIdOrName(accounts, args)
      if (!account) return 'No encontré esa cuenta.'
      const count = transactions.filter((t) => t.accountId === account.id).length
      if (count > 0) return `No puedo eliminar "${account.name}": ${count} transacciones usan esta cuenta.`
      await removeAccount(account.id)
      return `✅ Cuenta "${account.name}" eliminada.`
    }
  },
  {
    name: 'updateBudget',
    description: 'Edita un presupuesto existente por id o categoría',
    requiresConfirmation: true,
    describe: (args) => `Modificar el presupuesto de "${String(args.category ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id del presupuesto (opcional si indicas la categoría)' },
      category: { type: 'string', description: 'Categoría del presupuesto' },
      limit: { type: 'number', description: 'Nuevo límite mensual (opcional)' },
      month: { type: 'number', description: 'Nuevo mes 1-12 (opcional)' },
      year: { type: 'number', description: 'Nuevo año (opcional)' }
    },
    execute: async (args) => {
      const { budgets, updateBudget } = useFinanceStore.getState()
      const budget = findBudgetItem(budgets, args)
      if (!budget) return 'No encontré ese presupuesto.'
      const updates: Partial<Budget> = {}
      if (args.limit !== undefined) updates.limit = Math.abs(Number(args.limit))
      if (args.month !== undefined) {
        const month = Number(args.month)
        if (month >= 1 && month <= 12) updates.month = month - 1
      }
      if (args.year !== undefined) updates.year = Number(args.year)
      if (Object.keys(updates).length === 0) return 'No indicaste qué cambiar.'
      await updateBudget(budget.id, updates)
      return `✅ Presupuesto de "${budget.category}" actualizado.`
    }
  },
  {
    name: 'deleteBudget',
    description: 'Elimina un presupuesto existente por id o categoría',
    requiresConfirmation: true,
    describe: (args) => `Eliminar el presupuesto de "${String(args.category ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id del presupuesto (opcional si indicas la categoría)' },
      category: { type: 'string', description: 'Categoría del presupuesto' }
    },
    execute: async (args) => {
      const { budgets, removeBudget } = useFinanceStore.getState()
      const budget = findBudgetItem(budgets, args)
      if (!budget) return 'No encontré ese presupuesto.'
      await removeBudget(budget.id)
      return `✅ Presupuesto de "${budget.category}" eliminado.`
    }
  },
  {
    name: 'updateCategory',
    description: 'Edita una categoría existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Modificar la categoría "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la categoría (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre actual de la categoría' },
      newName: { type: 'string', description: 'Nuevo nombre (opcional)' },
      type: { type: 'string', enum: ['income', 'expense'], description: 'Nuevo tipo (opcional)' },
      icon: { type: 'string', description: 'Nuevo ícono (opcional)' },
      color: { type: 'string', description: 'Nuevo color hex (opcional)' }
    },
    execute: async (args) => {
      const { categories, updateCategory } = useFinanceStore.getState()
      const category = findByIdOrName(categories, args)
      if (!category) return 'No encontré esa categoría.'
      const updates: Partial<typeof category> = {}
      if (args.newName !== undefined) updates.name = String(args.newName)
      if (args.icon !== undefined) updates.icon = String(args.icon)
      if (args.color !== undefined) updates.color = String(args.color)
      if (args.type === 'income' || args.type === 'expense') updates.type = args.type
      if (Object.keys(updates).length === 0) return 'No indicaste qué cambiar.'
      await updateCategory(category.id, updates)
      return `✅ Categoría "${updates.name ?? category.name}" actualizada.`
    }
  },
  {
    name: 'deleteCategory',
    description: 'Elimina una categoría existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Eliminar la categoría "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la categoría (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre de la categoría' }
    },
    execute: async (args) => {
      const { categories, transactions, removeCategory } = useFinanceStore.getState()
      const category = findByIdOrName(categories, args)
      if (!category) return 'No encontré esa categoría.'
      const count = transactions.filter((t) => t.category === category.name).length
      if (count > 0) return `No puedo eliminar "${category.name}": ${count} transacciones usan esta categoría.`
      await removeCategory(category.id)
      return `✅ Categoría "${category.name}" eliminada.`
    }
  },
  {
    name: 'updateGoal',
    description: 'Edita una meta de ahorro existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Modificar la meta "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la meta (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre actual de la meta' },
      newName: { type: 'string', description: 'Nuevo nombre (opcional)' },
      targetAmount: { type: 'number', description: 'Nuevo monto objetivo (opcional)' },
      currentAmount: { type: 'number', description: 'Nuevo monto actual (opcional)' },
      deadline: { type: 'string', description: 'Nueva fecha límite YYYY-MM-DD (opcional)' },
      color: { type: 'string', description: 'Nuevo color hex (opcional)' },
      icon: { type: 'string', description: 'Nuevo ícono (opcional)' }
    },
    execute: async (args) => {
      const { goals, updateGoal } = useFinanceStore.getState()
      const goal = findByIdOrName(goals, args)
      if (!goal) return 'No encontré esa meta.'
      const updates: Partial<typeof goal> = {}
      if (args.newName !== undefined) updates.name = String(args.newName)
      if (args.targetAmount !== undefined) updates.targetAmount = Math.abs(Number(args.targetAmount))
      if (args.currentAmount !== undefined) updates.currentAmount = Math.abs(Number(args.currentAmount))
      if (args.deadline !== undefined) updates.deadline = new Date(String(args.deadline))
      if (args.color !== undefined) updates.color = String(args.color)
      if (args.icon !== undefined) updates.icon = String(args.icon)
      if (Object.keys(updates).length === 0) return 'No indicaste qué cambiar.'
      await updateGoal(goal.id, updates)
      return `✅ Meta "${updates.name ?? goal.name}" actualizada.`
    }
  },
  {
    name: 'deleteGoal',
    description: 'Elimina una meta de ahorro existente por id o nombre',
    requiresConfirmation: true,
    describe: (args) => `Eliminar la meta "${String(args.name ?? args.id ?? '')}"`,
    parameters: {
      id: { type: 'string', description: 'Id de la meta (opcional si indicas el nombre)' },
      name: { type: 'string', description: 'Nombre de la meta' }
    },
    execute: async (args) => {
      const { goals, removeGoal } = useFinanceStore.getState()
      const goal = findByIdOrName(goals, args)
      if (!goal) return 'No encontré esa meta.'
      await removeGoal(goal.id)
      return `✅ Meta "${goal.name}" eliminada.`
    }
  }
]

export const TOOL_DESCRIPTIONS = TOOL_DEFINITIONS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.parameters
}))

export async function executeToolCall(toolCall: AiToolCall): Promise<string> {
  const tool = TOOL_DEFINITIONS.find((t) => t.name === toolCall.name)
  if (!tool) return `Error: herramienta "${toolCall.name}" no encontrada.`
  try {
    return await tool.execute(toolCall.args)
  } catch (e) {
    return `Error al ejecutar ${toolCall.name}: ${e instanceof Error ? e.message : String(e)}`
  }
}
