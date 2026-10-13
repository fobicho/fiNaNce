import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, AlertTriangle, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { BudgetForm } from '../components/budget-form'
import { useFinanceStore } from '../stores/finance-store'
import { formatCurrency } from '../lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Budgets() {
  const budgets = useFinanceStore((s) => s.budgets)
  const transactions = useFinanceStore((s) => s.transactions)
  const removeBudget = useFinanceStore((s) => s.removeBudget)
  const [showForm, setShowForm] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editId, setEditId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const monthlyBudgets = useMemo(
    () => budgets.filter((b) => b.month === viewMonth && b.year === viewYear),
    [budgets, viewMonth, viewYear]
  )

  const spentByCategory = useMemo(() => {
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear && t.type === 'expense'
    })
    const map: Record<string, number> = {}
    monthly.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount)
    })
    return map
  }, [transactions, viewMonth, viewYear])

  const budgetsWithActual = useMemo(
    () => monthlyBudgets.map((b) => ({
      ...b,
      actualSpent: spentByCategory[b.category] || 0
    })),
    [monthlyBudgets, spentByCategory]
  )

  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear()

  function navigateMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewMonth(d.getMonth())
    setViewYear(d.getFullYear())
  }

  async function handleDelete() {
    if (deleteId) {
      await removeBudget(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
<motion.div variants={item} className="flex items-center gap-2">
        <Button onClick={() => { setEditId(undefined); setFormKey(k => k + 1); setShowForm(true) }} className="gap-2 rounded-full btn-contrast">
          <Plus className="w-4 h-4" />
          Nuevo presupuesto
        </Button>
        <div className="flex items-center gap-2 h-10 px-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            aria-label="Mes anterior"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-[120px] text-center">
            {new Date(viewYear, viewMonth).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            aria-label="Mes siguiente"
            disabled={!isCurrentMonth && viewMonth >= now.getMonth() && viewYear >= now.getFullYear()}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()) }}
              className="px-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </motion.div>

      <motion.div variants={item}>
      {budgetsWithActual.length === 0 ? (
<EmptyState title="Sin presupuestos" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsWithActual.map((budget) => {
            const percentage = budget.limit > 0 ? (budget.actualSpent / budget.limit) * 100 : 0
            const isOverBudget = percentage >= 100
            const isWarning = percentage >= 80 && percentage < 100

            return (
              <motion.div key={budget.id} variants={item}>
                <Card className={`overflow-hidden shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl ${isOverBudget ? 'border-destructive/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{budget.category}</CardTitle>
                      <div className="flex items-center gap-2">
                        {isOverBudget && (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            Excedido
                          </div>
                        )}
                        {isWarning && !isOverBudget && (
                          <Badge variant="warning">Casi al límite</Badge>
                        )}
<button
                          type="button"
                          aria-label={`Editar presupuesto de ${budget.category}`}
                          onClick={() => { setEditId(budget.id); setShowForm(true) }}
                          className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar presupuesto de ${budget.category}`}
                          onClick={() => setDeleteId(budget.id)}
                          className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gastado</span>
                        <span className="font-medium num">{formatCurrency(budget.actualSpent)}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isOverBudget ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(0)}% utilizado</span>
                        <span className="num">Límite: {formatCurrency(budget.limit)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
      </motion.div>

      <BudgetForm key={editId || `new-${formKey}`} open={showForm} onClose={() => { setShowForm(false); setEditId(undefined) }} editId={editId} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar presupuesto"
        description="Esta acción no se puede deshacer."
      />
    </motion.div>
  )
}
