import { db } from './db'

const SEED_FLAG = 'finance-seeded-v2'

const INCOME_CATEGORIES = [
  { name: 'Salario', type: 'income' as const, icon: 'TrendingUp', color: '#22c55e' },
  { name: 'Freelance', type: 'income' as const, icon: 'Briefcase', color: '#6366f1' },
  { name: 'Inversiones', type: 'income' as const, icon: 'TrendingUp', color: '#8b5cf6' },
  { name: 'Otros ingresos', type: 'income' as const, icon: 'Gift', color: '#14b8a6' }
]

const EXPENSE_CATEGORIES = [
  { name: 'Comida', type: 'expense' as const, icon: 'Utensils', color: '#f97316' },
  { name: 'Vivienda', type: 'expense' as const, icon: 'Home', color: '#ec4899' },
  { name: 'Transporte', type: 'expense' as const, icon: 'Car', color: '#eab308' },
  { name: 'Servicios', type: 'expense' as const, icon: 'Zap', color: '#3b82f6' }
]

export function seedRan(): boolean {
  return localStorage.getItem(SEED_FLAG) === 'true'
}

export function clearSeedFlag(): void {
  localStorage.removeItem(SEED_FLAG)
}

let seeding = false

export async function seedInitialData(): Promise<boolean> {
  if (seedRan()) return false
  if (seeding) return false
  seeding = true

  try {
    await db.categories.clear()

    const now = new Date()
    const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
    const categories = ALL_CATEGORIES.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    }))
    await db.categories.bulkAdd(categories)

    const existingAccount = await db.accounts.where('name').equals('Efectivo').first()
    if (!existingAccount) {
      await db.accounts.add({
        id: crypto.randomUUID(),
        name: 'Efectivo',
        balance: 0,
        type: 'cash',
        color: '#22c55e',
        createdAt: now,
        updatedAt: now
      })
    }

    localStorage.setItem(SEED_FLAG, 'true')
    return true
  } finally {
    seeding = false
  }
}
