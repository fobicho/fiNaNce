import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reports } from './reports'
import { useFinanceStore } from '../stores/finance-store'

function resetStore() {
  useFinanceStore.setState({
    transactions: [],
    budgets: [],
    categories: [],
    accounts: [],
    goals: [],
    loading: false
  })
}

describe('Reports', () => {
  beforeEach(resetStore)

  it('renderiza las tarjetas de resumen y los controles', () => {
    render(<Reports />)

    expect(screen.getByText('Ingresos')).toBeInTheDocument()
    expect(screen.getByText('Gastos')).toBeInTheDocument()
    expect(screen.getByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('Tasa de ahorro')).toBeInTheDocument()
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument()
    expect(screen.getByText(/Evolución/)).toBeInTheDocument()
  })

  it('muestra el ranking de categorías cuando hay gastos', () => {
    useFinanceStore.setState({
      transactions: [
        {
          id: 't1',
          type: 'expense',
          amount: -100,
          category: 'Comida',
          description: 'Almuerzo',
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    })

    render(<Reports />)

    expect(screen.getByText('Ranking de categorías')).toBeInTheDocument()
    expect(screen.getAllByText('Comida').length).toBeGreaterThan(0)
  })
})
