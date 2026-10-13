import {
  db,
  type Account,
  type Budget,
  type Category,
  type Goal,
  type Transaction
} from './db'

export interface BackupPayload {
  transactions: Transaction[]
  budgets: Budget[]
  categories: Category[]
  accounts: Account[]
  goals: Goal[]
  exportedAt: string
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [transactions, budgets, categories, accounts, goals] = await Promise.all([
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
    db.goals.toArray()
  ])
  return { transactions, budgets, categories, accounts, goals, exportedAt: new Date().toISOString() }
}

export async function applyBackupPayload(
  data: Record<string, unknown>,
  mode: 'replace' | 'merge'
): Promise<void> {
  await db.transaction(
    'rw',
    db.transactions,
    db.budgets,
    db.categories,
    db.accounts,
    db.goals,
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.transactions.clear(),
          db.budgets.clear(),
          db.categories.clear(),
          db.accounts.clear(),
          db.goals.clear()
        ])
      }
      if ((data.transactions as unknown[] | undefined)?.length) await db.transactions.bulkPut(data.transactions as never[])
      if ((data.budgets as unknown[] | undefined)?.length) await db.budgets.bulkPut(data.budgets as never[])
      if ((data.categories as unknown[] | undefined)?.length) await db.categories.bulkPut(data.categories as never[])
      if ((data.accounts as unknown[] | undefined)?.length) await db.accounts.bulkPut(data.accounts as never[])
      if ((data.goals as unknown[] | undefined)?.length) await db.goals.bulkPut(data.goals as never[])
    }
  )
}
