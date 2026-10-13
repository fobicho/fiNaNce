import { create } from 'zustand'
import { db, type Transaction, type Budget, type Category, type Account, type Goal, type CurrencyCode } from '../lib/db'
import { useRatesStore } from './rates-store'
import { useThemeStore } from './theme-store'
import { seedInitialData } from '../lib/seed'
import { generateId } from '../lib/utils'

function insertByDateDesc(list: Transaction[], tx: Transaction): Transaction[] {
  const time = new Date(tx.date).getTime()
  const index = list.findIndex((item) => new Date(item.date).getTime() < time)
  if (index === -1) return [...list, tx]
  return [...list.slice(0, index), tx, ...list.slice(index)]
}

interface FinanceState {
  transactions: Transaction[]
  budgets: Budget[]
  categories: Category[]
  accounts: Account[]
  goals: Goal[]
  loading: boolean
  seeded: boolean
  _lastDeleted: Transaction | null
  loadData: () => Promise<void>
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  addBudget: (b: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>
  removeBudget: (id: string) => Promise<void>
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>
  removeGoal: (id: string) => Promise<void>
  undoDeleteTransaction: () => Promise<void>
  recalculateBudgetSpent: (month: number, year: number) => Promise<void>
  getMonthlyBalance: (month: number, year: number) => Promise<{ income: number; expenses: number }>
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  transactions: [],
  budgets: [],
  categories: [],
  accounts: [],
  goals: [],
  loading: false,
  seeded: false,
  _lastDeleted: null,

  loadData: async () => {
    set({ loading: true })
    const seeded = await seedInitialData()
    const [rawTransactions, budgets, categories, accounts, goals] = await Promise.all([
      db.transactions.orderBy('date').reverse().toArray(),
      db.budgets.toArray(),
      db.categories.toArray(),
      db.accounts.toArray(),
      db.goals.toArray()
    ])
    const transactions = rawTransactions.map((t) => ({ ...t }))
    set({ transactions, budgets, categories, accounts, goals, loading: false, seeded })
  },

  addTransaction: async (data) => {
    const now = new Date()
    const transaction: Transaction = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    await db.transactions.add(transaction)
    set((state) => ({
      transactions: insertByDateDesc(state.transactions, transaction)
    }))

    const d = new Date(data.date)
    await get().recalculateBudgetSpent(d.getMonth(), d.getFullYear())
  },

  updateTransaction: async (id, data) => {
    const previous = get().transactions.find((t) => t.id === id)
    const updates = { ...data, updatedAt: new Date() }
    await db.transactions.update(id, updates)
    set((state) => ({
      transactions: state.transactions
        .map((t) => (t.id === id ? { ...t, ...updates } : t))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }))
    const updated = get().transactions.find((t) => t.id === id)
    const newDate = updated ? new Date(updated.date) : null
    const prevDate = previous ? new Date(previous.date) : null

    if (newDate) {
      await get().recalculateBudgetSpent(newDate.getMonth(), newDate.getFullYear())
    }
    if (
      prevDate &&
      (!newDate ||
        prevDate.getMonth() !== newDate.getMonth() ||
        prevDate.getFullYear() !== newDate.getFullYear())
    ) {
      await get().recalculateBudgetSpent(prevDate.getMonth(), prevDate.getFullYear())
    }
  },

  removeTransaction: async (id) => {
    const t = get().transactions.find((t) => t.id === id)
    if (!t) return
    await db.transactions.delete(id)
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
      _lastDeleted: t
    }))
    const d = new Date(t.date)
    get().recalculateBudgetSpent(d.getMonth(), d.getFullYear())
  },

  undoDeleteTransaction: async () => {
    const t = get()._lastDeleted
    if (!t) return
    await db.transactions.add(t)
    set((state) => ({
      transactions: insertByDateDesc(state.transactions, t),
      _lastDeleted: null
    }))
    const d = new Date(t.date)
    await get().recalculateBudgetSpent(d.getMonth(), d.getFullYear())
  },

  addBudget: async (data) => {
    const now = new Date()
    const budget: Budget = {
      ...data,
      id: generateId(),
      spent: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.budgets.add(budget)
    set((state) => ({ budgets: [...state.budgets, budget] }))
    get().recalculateBudgetSpent(budget.month, budget.year)
  },

  updateBudget: async (id, data) => {
    const updates = { ...data, updatedAt: new Date() }
    await db.budgets.update(id, updates)
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      )
    }))
  },

  removeBudget: async (id) => {
    await db.budgets.delete(id)
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id)
    }))
  },

  addCategory: async (data) => {
    const now = new Date()
    const category: Category = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    await db.categories.add(category)
    set((state) => ({ categories: [...state.categories, category] }))
  },

  updateCategory: async (id, data) => {
    const updates = { ...data, updatedAt: new Date() }
    await db.categories.update(id, updates)
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    }))
  },

  removeCategory: async (id) => {
    await db.categories.delete(id)
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id)
    }))
  },

  addAccount: async (data) => {
    const now = new Date()
    const account: Account = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    await db.accounts.add(account)
    set((state) => ({ accounts: [...state.accounts, account] }))
  },

  updateAccount: async (id, data) => {
    const updates = { ...data, updatedAt: new Date() }
    await db.accounts.update(id, updates)
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
    }))
  },

  removeAccount: async (id) => {
    await db.accounts.delete(id)
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id)
    }))
  },

  addGoal: async (data) => {
    const now = new Date()
    const goal: Goal = {
      ...data,
      id: generateId(),
      currentAmount: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.goals.add(goal)
    set((state) => ({ goals: [...state.goals, goal] }))
  },

  updateGoal: async (id, data) => {
    const updates = { ...data, updatedAt: new Date() }
    await db.goals.update(id, updates)
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g))
    }))
  },

  removeGoal: async (id) => {
    await db.goals.delete(id)
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id)
    }))
  },

  recalculateBudgetSpent: async (month, year) => {
    const expenses = await db.transactions
      .filter((t) => {
        if (t.type !== 'expense') return false
        const d = new Date(t.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .toArray()

    const base = useThemeStore.getState().currency
    const convert = (amount: number, currency?: CurrencyCode) => {
      if (!currency || currency === base) return amount
      return useRatesStore.getState().convert(amount, currency, base)
    }

    const spentByCategory = expenses.reduce<Record<string, number>>((acc, t) => {
      const val = Math.abs(convert(t.amount, t.currency))
      acc[t.category] = (acc[t.category] || 0) + val
      return acc
    }, {})

    const budgets = get().budgets.filter(
      (b) => b.month === month && b.year === year
    )

    for (const budget of budgets) {
      const spent = spentByCategory[budget.category] || 0
      if (spent !== budget.spent) {
        await db.budgets.update(budget.id, { spent, updatedAt: new Date() })
      }
    }

    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.month === month && b.year === year
          ? { ...b, spent: spentByCategory[b.category] || 0 }
          : b
      )
    }))
  },

  getMonthlyBalance: async (month, year) => {
    const transactions = await db.transactions
      .filter((t) => {
        const d = new Date(t.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .toArray()

    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += Math.abs(t.amount)
        else acc.expenses += Math.abs(t.amount)
        return acc
      },
      { income: 0, expenses: 0 }
    )
  }
}))
