import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../lib/db'
import { useFinanceStore } from './finance-store'

const baseTx = {
  type: 'expense' as const,
  amount: -100,
  category: 'Comida',
  description: 'prueba'
}

async function clearDb() {
  await db.transaction(
    'rw',
    db.transactions,
    db.budgets,
    db.categories,
    db.accounts,
    db.goals,
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.budgets.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.goals.clear()
      ])
    }
  )
}

beforeEach(async () => {
  await clearDb()
  useFinanceStore.setState({
    transactions: [],
    budgets: [],
    categories: [],
    accounts: [],
    goals: [],
    loading: false,
    seeded: false,
    _lastDeleted: null
  })
})

describe('finance-store', () => {
  it('mantiene el orden por fecha descendente al agregar', async () => {
    const { addTransaction } = useFinanceStore.getState()
    await addTransaction({ ...baseTx, date: new Date('2026-10-01') })
    await addTransaction({ ...baseTx, date: new Date('2026-01-01') })
    await addTransaction({ ...baseTx, date: new Date('2026-05-01') })

    const dates = useFinanceStore
      .getState()
      .transactions.map((t) => new Date(t.date).toISOString().slice(0, 10))
    expect(dates).toEqual(['2026-10-01', '2026-05-01', '2026-01-01'])
  })

  it('recalcula el mes previo al mover una transacción de fecha', async () => {
    const store = useFinanceStore.getState()
    await store.addBudget({ category: 'Comida', limit: 1000, month: 0, year: 2026 })
    const budgetId = useFinanceStore.getState().budgets[0].id
    expect(useFinanceStore.getState().budgets[0].spent).toBe(0)

    await store.addTransaction({ ...baseTx, amount: -300, date: new Date('2026-01-15') })
    expect(useFinanceStore.getState().budgets.find((b) => b.id === budgetId)?.spent).toBe(300)

    const tx = useFinanceStore.getState().transactions[0]
    await store.updateTransaction(tx.id, { date: new Date('2026-02-10') })

    expect(useFinanceStore.getState().budgets.find((b) => b.id === budgetId)?.spent).toBe(0)
  })

  it('nunca guarda spent negativo', async () => {
    const store = useFinanceStore.getState()
    await store.addBudget({ category: 'Comida', limit: 1000, month: 0, year: 2026 })
    await store.addTransaction({ ...baseTx, amount: -250, date: new Date('2026-01-10') })

    const spent = useFinanceStore.getState().budgets[0].spent
    expect(spent).toBe(250)
    expect(spent).toBeGreaterThanOrEqual(0)
  })

  it('restaura la última transacción eliminada', async () => {
    const store = useFinanceStore.getState()
    await store.addTransaction({ ...baseTx, date: new Date('2026-03-01') })
    const tx = useFinanceStore.getState().transactions[0]

    await store.removeTransaction(tx.id)
    expect(useFinanceStore.getState().transactions).toHaveLength(0)

    await store.undoDeleteTransaction()
    expect(useFinanceStore.getState().transactions).toHaveLength(1)
    expect(useFinanceStore.getState().transactions[0].id).toBe(tx.id)
  })
})
