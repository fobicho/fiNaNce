import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Repeat, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { TransactionForm } from '../components/transaction-form'
import { useFinanceStore } from '../stores/finance-store'
import { formatCurrency } from '../lib/utils'

const intervalLabels: Record<string, string> = {
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  yearly: 'Cada año'
}

function getNextDate(date: Date, interval: string): Date {
  const d = new Date(date)
  if (interval === 'weekly') d.setDate(d.getDate() + 7)
  else if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Recurring() {
  const transactions = useFinanceStore((s) => s.transactions)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const removeTransaction = useFinanceStore((s) => s.removeTransaction)
  const [editId, setEditId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const recurring = useMemo(
    () => transactions.filter((t) => t.isRecurring).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions]
  )

  async function handleDelete() {
    const id = deleteId
    setDeleteId(null)
    if (!id) return
    await removeTransaction(id)
  }

  async function handleStopRecurring(id: string) {
    await updateTransaction(id, { isRecurring: false, recurringInterval: undefined })
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {recurring.length === 0 ? (
        <motion.div variants={item}>
          <EmptyState
            title="Sin recurrentes"
            description="Al crear una transacción, actívala como recurrente"
            icon={Repeat}
          />
        </motion.div>
      ) : (
        <motion.div variants={item} className="space-y-3">
          {recurring.map((t) => {
            const nextDate = getNextDate(new Date(t.date), t.recurringInterval || 'monthly')
            const isOverdue = nextDate < new Date()
            return (
              <Card key={t.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        t.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        <Repeat className={`w-5 h-5 ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={t.type === 'income' ? 'income' : 'expense'}>{t.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {intervalLabels[t.recurringInterval || 'monthly']}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold num ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                      </p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {isOverdue ? 'Vencida' : 'Próxima'}: {nextDate.toLocaleDateString('es-MX', { dateStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleStopRecurring(t.id)}
                    >
                      Detener
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditId(t.id)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <TransactionForm open={editId !== undefined} onClose={() => setEditId(undefined)} editId={editId} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar transacción recurrente"
        description="Esta acción no se puede deshacer."
      />
    </motion.div>
  )
}
