import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { CategoryForm } from '../components/category-form'
import { EmptyState } from '../components/ui/empty-state'
import { useFinanceStore } from '../stores/finance-store'
import { resolveIcon } from '../lib/icons'
import { toast } from '../stores/toast-store'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

function CategoryGroup({ title, categories: cats, onEdit, onDelete, txCount: countFn }: {
  title: string
  categories: { id: string; name: string; type: string; icon?: string; color?: string }[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  txCount: (name: string) => number
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title}</h2>
      {cats.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin categorías</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map((cat) => {
            const Icon = resolveIcon(cat.icon || 'Receipt')
            const count = countFn(cat.name)
            const bgColor = cat.color || '#6b7280'
            return (
              <motion.div key={cat.id} variants={item}>
<Card className="relative overflow-hidden shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: bgColor + '20' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: bgColor }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cat.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {count} transacciones
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          cat.type === 'income'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onEdit(cat.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => onDelete(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Categories() {
  const { categories, removeCategory, transactions } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const txCount = useCallback(
    (name: string) => transactions.filter((t) => t.category === name).length,
    [transactions]
  )

  async function handleDelete() {
    const id = deleteId
    setDeleteId(null)
    if (!id) return
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const count = txCount(cat.name)
    if (count > 0) {
      toast('No se puede eliminar', `${count} transacciones usan esta categoría`, 'error')
      return
    }
    try {
      await removeCategory(id)
    } catch {
      toast('Error al eliminar', '', 'error')
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
<motion.div variants={item} className="flex items-center">
        <Button onClick={() => { setEditId(undefined); setFormKey(k => k + 1); setShowForm(true) }} className="gap-2 rounded-full btn-contrast">
          <Plus className="w-4 h-4" />
          Nueva categoría
        </Button>
      </motion.div>

      <motion.div variants={item}>
      {categories.length === 0 ? (
        <EmptyState title="Sin categorías" />
      ) : (
        <div className="space-y-8">
          <CategoryGroup
            title="Ingresos"
            categories={categories.filter((c) => c.type === 'income')}
            onEdit={(id) => { setEditId(id); setShowForm(true) }}
            onDelete={setDeleteId}
            txCount={txCount}
          />
          <CategoryGroup
            title="Gastos"
            categories={categories.filter((c) => c.type === 'expense')}
            onEdit={(id) => { setEditId(id); setShowForm(true) }}
            onDelete={setDeleteId}
            txCount={txCount}
          />
        </div>
      )}
      </motion.div>

      <CategoryForm key={editId || `new-${formKey}`} open={showForm} onClose={() => { setShowForm(false); setEditId(undefined) }} editId={editId} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        description="Las categorías con transacciones no se pueden eliminar."
      />
    </motion.div>
  )
}
