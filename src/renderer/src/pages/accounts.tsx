import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, ArrowRightLeft, Wallet, PiggyBank, CreditCard, Landmark } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { AccountForm } from '../components/account-form'
import { TransferDialog } from '../components/transfer-dialog'
import { useFinanceStore } from '../stores/finance-store'
import { formatCurrency } from '../lib/utils'
import { toast } from '../stores/toast-store'
import { AccountsSkeleton } from '../components/page-skeletons'

const typeMeta: Record<string, { label: string; icon: React.ElementType }> = {
  debit: { label: 'Débito', icon: Wallet },
  savings: { label: 'Ahorro', icon: PiggyBank },
  credit: { label: 'Crédito', icon: CreditCard },
  cash: { label: 'Efectivo', icon: Landmark }
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Accounts() {
  const accounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const removeAccount = useFinanceStore((s) => s.removeAccount)
  const loading = useFinanceStore((s) => s.loading)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)

  const computedBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acc of accounts) {
      map[acc.id] = acc.balance
    }
    for (const t of transactions) {
      if (t.accountId) {
        map[t.accountId] = (map[t.accountId] || 0) + t.amount
      }
    }
    return map
  }, [accounts, transactions])

  const txCountByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.accountId) {
        map[t.accountId] = (map[t.accountId] || 0) + 1
      }
    }
    return map
  }, [transactions])

  if (loading) return <AccountsSkeleton />

  async function handleDelete() {
    const id = deleteId
    setDeleteId(null)
    if (!id) return
    const count = transactions.filter((t) => t.accountId === id).length
    if (count > 0) {
      toast('No se puede eliminar', `${count} transacciones usan esta cuenta`, 'error')
      return
    }
    await removeAccount(id)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
<motion.div variants={item} className="flex items-center gap-2">
        <Button onClick={() => setEditingId('new')} className="gap-2 rounded-full btn-contrast">
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </Button>
        <Button onClick={() => setShowTransfer(true)} className="gap-2 rounded-full btn-contrast">
          <ArrowRightLeft className="w-4 h-4" />
          Transferir
        </Button>
      </motion.div>

      {accounts.length === 0 ? (
        <motion.div variants={item}>
          <EmptyState title="Sin cuentas" />
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const meta = typeMeta[acc.type] || { label: acc.type, icon: Wallet }
            const Icon = meta.icon
            const balance = computedBalances[acc.id] || 0
            const txCount = txCountByAccount[acc.id] || 0
            const bgColor = acc.color || '#6b7280'
            return (
<Card key={acc.id} className="relative shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: bgColor + '20' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: bgColor }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <Badge variant="outline" className="mt-0.5 text-xs">{meta.label}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(acc.id)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center h-9 w-9 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(acc.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold tracking-tight num">{formatCurrency(balance)}</p>
                    <p className="text-xs text-muted-foreground">{txCount} transacciones</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <AccountForm key={editingId || 'closed'} open={editingId !== undefined} onClose={() => setEditingId(undefined)} editId={editingId !== 'new' ? editingId : undefined} />
      <TransferDialog open={showTransfer} onClose={() => setShowTransfer(false)} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar cuenta"
        description="Esta acción no se puede deshacer."
      />
    </motion.div>
  )
}
