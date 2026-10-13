import Dexie, { type Table } from 'dexie'

export type CurrencyCode = 'MXN' | 'USD' | 'EUR' | 'COP' | 'ARS' | 'CLP'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: Date
  accountId?: string
  currency?: CurrencyCode
  isRecurring?: boolean
  recurringInterval?: 'weekly' | 'monthly' | 'yearly'
  createdAt: Date
  updatedAt: Date
}

export interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  month: number
  year: number
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface Account {
  id: string
  name: string
  balance: number
  type: 'debit' | 'savings' | 'credit' | 'cash'
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: Date
  color: string
  icon: string
  createdAt: Date
  updatedAt: Date
}

class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>
  budgets!: Table<Budget, string>
  categories!: Table<Category, string>
  accounts!: Table<Account, string>
  goals!: Table<Goal, string>

  constructor() {
    super('FinanceDB')
    this.version(1).stores({
      transactions: 'id, type, category, date, createdAt',
      budgets: 'id, category, month, year',
      categories: 'id, name, type',
      accounts: 'id, name, type'
    })
    this.version(2).stores({
      transactions: 'id, type, category, date, accountId, createdAt',
      budgets: 'id, category, month, year',
      categories: 'id, name, type',
      accounts: 'id, name, type'
    })
    this.version(3).stores({
      transactions: 'id, type, category, date, accountId, createdAt',
      budgets: 'id, category, month, year',
      categories: 'id, name, type',
      accounts: 'id, name, type',
      goals: 'id, name'
    })
    this.version(4).stores({
      transactions: 'id, type, category, date, accountId, createdAt',
      budgets: 'id, category, month, year',
      categories: 'id, name, type',
      accounts: 'id, name, type',
      goals: 'id, name'
    })
    this.version(5).stores({
      transactions: 'id, type, category, date, accountId, createdAt',
      budgets: 'id, category, month, year',
      categories: 'id, name, type',
      accounts: 'id, name, type',
      goals: 'id, name'
    })
    this.version(6).upgrade((tx) => {
      return tx.table('accounts').toCollection().modify((acc) => {
        if ((acc as { type: string }).type === 'checking') {
          ;(acc as { type: string }).type = 'debit'
        }
      })
    })
    this.version(7)
      .stores({
        transactions: 'id, type, category, date, accountId, createdAt',
        budgets: 'id, category, month, year',
        categories: 'id, name, type',
        accounts: 'id, name, type',
        goals: 'id, name'
      })
      .upgrade((tx) => {
        return tx
          .table('budgets')
          .toCollection()
          .modify((budget) => {
            const b = budget as { spent?: number }
            if (typeof b.spent === 'number') b.spent = Math.abs(b.spent)
          })
      })
  }
}

export const db = new FinanceDB()
