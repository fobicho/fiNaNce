import { describe, it, expect, beforeEach } from 'vitest'
import { db, type Goal } from './db'
import { buildBackupPayload, applyBackupPayload } from './backup'

function makeGoal(id: string): Goal {
  return {
    id,
    name: 'Viaje',
    targetAmount: 1000,
    currentAmount: 0,
    color: '#8b5cf6',
    icon: 'Target',
    createdAt: new Date(),
    updatedAt: new Date()
  }
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

beforeEach(clearDb)

describe('backup', () => {
  it('buildBackupPayload incluye las metas', async () => {
    await db.goals.add(makeGoal('g1'))
    const payload = await buildBackupPayload()
    expect(payload.goals).toHaveLength(1)
    expect(payload).toHaveProperty('exportedAt')
  })

  it('merge es idempotente y no falla con IDs repetidos', async () => {
    const payload = { transactions: [], budgets: [], categories: [], accounts: [], goals: [makeGoal('g1')] }
    await applyBackupPayload(payload, 'merge')
    await applyBackupPayload(payload, 'merge')

    const goals = await db.goals.toArray()
    expect(goals).toHaveLength(1)
  })

  it('replace limpia lo previo y restaura todas las tablas incluidas las metas', async () => {
    await db.goals.add(makeGoal('viejo'))

    const payload = { transactions: [], budgets: [], categories: [], accounts: [], goals: [makeGoal('nuevo')] }
    await applyBackupPayload(payload, 'replace')

    const goals = await db.goals.toArray()
    expect(goals.map((g) => g.id)).toEqual(['nuevo'])
  })
})
