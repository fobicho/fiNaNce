import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, PiggyBank, Calendar, DollarSign } from 'lucide-react'
import { resolveIcon } from '../lib/icons'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { GoalForm } from '../components/goal-form'
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

export function Goals() {
  const goals = useFinanceStore((s) => s.goals)
  const updateGoal = useFinanceStore((s) => s.updateGoal)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [addAmount, setAddAmount] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  async function handleAddProgress(goalId: string, amount?: number) {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    const added = amount ?? goal.targetAmount * 0.1
    await updateGoal(goalId, { currentAmount: Math.min(goal.currentAmount + added, goal.targetAmount) })
  }

  function startAddAmount(goalId: string) {
    setAddingToId(goalId)
    setAddAmount('')
    requestAnimationFrame(() => addInputRef.current?.focus())
  }

  async function submitAddAmount(goalId: string) {
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) return
    await handleAddProgress(goalId, amount)
    setAddingToId(null)
    setAddAmount('')
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
<motion.div variants={item} className="flex items-center">
        <Button onClick={() => setEditingId('new')} className="gap-2 rounded-full btn-contrast">
          <Plus className="w-4 h-4" />
          Nueva meta
        </Button>
      </motion.div>

      {goals.length === 0 ? (
        <motion.div variants={item}>
          <EmptyState title="Sin metas" icon={PiggyBank} />
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const percentage = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
            const bgColor = goal.color || '#8b5cf6'
            return (
<Card key={goal.id} className="relative shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: bgColor + '20' }}
                      >
                        {(() => { const Icon = resolveIcon(goal.icon || 'PiggyBank'); return <Icon className="w-5 h-5" style={{ color: bgColor }} /> })()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{goal.name}</p>
                        {goal.deadline && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(goal.deadline).toLocaleDateString('es-MX', { dateStyle: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
                        onClick={() => setEditingId(goal.id)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center h-9 w-9 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        onClick={() => setDeleteId(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: bgColor }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="num">{formatCurrency(goal.currentAmount)}</span>
                      <span className="num">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    {percentage >= 100 ? (
                      <p className="text-xs text-green-500 text-center font-medium">Meta cumplida</p>
                    ) : addingToId === goal.id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            ref={addInputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm"
                            value={addAmount}
                            onChange={(e) => setAddAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitAddAmount(goal.id) }}
                          />
                        </div>
                        <Button size="sm" onClick={() => submitAddAmount(goal.id)} disabled={!addAmount}>
                          Añadir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingToId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleAddProgress(goal.id)}
                        >
                          +10% rápido
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                          onClick={() => startAddAmount(goal.id)}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Añadir
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <GoalForm open={editingId !== undefined} onClose={() => setEditingId(undefined)} editId={editingId !== 'new' ? editingId : undefined} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { useFinanceStore.getState().removeGoal(deleteId); setDeleteId(null) } }}
        title="Eliminar meta"
        description="Esta acción no se puede deshacer."
      />
    </motion.div>
  )
}
