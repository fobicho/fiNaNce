import { describe, it, expect, beforeEach } from 'vitest'
import { TOOL_DEFINITIONS } from './tools'
import { useFinanceStore } from '../../stores/finance-store'

function tool(name: string) {
  const found = TOOL_DEFINITIONS.find((t) => t.name === name)
  if (!found) throw new Error(`Herramienta no encontrada: ${name}`)
  return found
}

function captureNavigate() {
  const paths: string[] = []
  const listener = (e: Event) => paths.push((e as CustomEvent<string>).detail)
  window.addEventListener('ai-navigate', listener)
  return {
    paths,
    stop: () => window.removeEventListener('ai-navigate', listener)
  }
}

const WRITE_TOOLS = [
  'addTransaction', 'addAccount', 'addBudget', 'addGoal', 'addCategory',
  'updateTransaction', 'deleteTransaction', 'updateAccount', 'deleteAccount',
  'updateBudget', 'deleteBudget', 'updateCategory', 'deleteCategory',
  'updateGoal', 'deleteGoal'
]

describe('herramientas de interacción con la app', () => {
  beforeEach(() => {
    useFinanceStore.setState({ transactions: [], budgets: [], categories: [], accounts: [], goals: [] })
  })

  it('incluye creación de cuentas, transacciones, presupuestos, metas, categorías y navegación', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name)
    expect(names).toEqual(
      expect.arrayContaining(['addAccount', 'addTransaction', 'addBudget', 'addGoal', 'addCategory', 'navigate'])
    )
  })

  it('addAccount exige un nombre', async () => {
    expect(await tool('addAccount').execute({})).toMatch(/falta el nombre/i)
  })

  it('addCategory exige un nombre', async () => {
    expect(await tool('addCategory').execute({})).toMatch(/falta el nombre/i)
  })

  it('addGoal exige nombre y monto objetivo', async () => {
    expect(await tool('addGoal').execute({ name: 'Viaje' })).toMatch(/monto objetivo/i)
  })

  it('navigate emite el evento con la ruta de la sección', async () => {
    const nav = captureNavigate()
    const result = await tool('navigate').execute({ page: 'cuentas' })
    nav.stop()
    expect(nav.paths).toEqual(['/accounts'])
    expect(result).toContain('cuentas')
  })

  it('navigate resuelve nombres con acentos', async () => {
    const nav = captureNavigate()
    await tool('navigate').execute({ page: 'Categorías' })
    nav.stop()
    expect(nav.paths).toEqual(['/categories'])
  })

  it('navigate avisa cuando la sección es desconocida', async () => {
    const nav = captureNavigate()
    const result = await tool('navigate').execute({ page: 'no-existe' })
    nav.stop()
    expect(nav.paths).toEqual([])
    expect(result).toMatch(/no conozco la sección/i)
  })

  it('incluye herramientas para editar y eliminar', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'updateTransaction', 'deleteTransaction', 'updateAccount', 'deleteAccount',
        'updateBudget', 'deleteBudget', 'updateCategory', 'deleteCategory',
        'updateGoal', 'deleteGoal'
      ])
    )
  })

  it('marca las herramientas que escriben como confirmables', () => {
    for (const name of WRITE_TOOLS) {
      expect(tool(name).requiresConfirmation).toBe(true)
    }
    expect(tool('navigate').requiresConfirmation).toBeUndefined()
    expect(tool('getSummary').requiresConfirmation).toBeUndefined()
  })

  it('deleteAccount se niega si hay transacciones que usan la cuenta', async () => {
    useFinanceStore.setState({
      accounts: [
        { id: 'a1', name: 'Efectivo', balance: 0, type: 'cash', createdAt: new Date(), updatedAt: new Date() }
      ],
      transactions: [
        {
          id: 't1', type: 'expense', amount: -10, category: 'X', description: '',
          date: new Date(), accountId: 'a1', createdAt: new Date(), updatedAt: new Date()
        }
      ]
    })

    const result = await tool('deleteAccount').execute({ name: 'Efectivo' })
    expect(result).toMatch(/no puedo eliminar/i)
  })

  it('updateAccount aplica los cambios indicados', async () => {
    useFinanceStore.setState({
      accounts: [
        { id: 'a1', name: 'Ahorro', balance: 0, type: 'savings', createdAt: new Date(), updatedAt: new Date() }
      ]
    })

    const result = await tool('updateAccount').execute({ name: 'Ahorro', newName: 'Ahorro viaje' })
    expect(result).toContain('Ahorro viaje')
    expect(useFinanceStore.getState().accounts[0].name).toBe('Ahorro viaje')
  })
})
