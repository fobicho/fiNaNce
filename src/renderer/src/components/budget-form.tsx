import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'

interface BudgetFormProps {
  open: boolean
  onClose: () => void
  editId?: string
}

export function BudgetForm({ open, onClose, editId }: BudgetFormProps) {
  const { categories, budgets, addBudget, updateBudget } = useFinanceStore()
  const editBudget = editId ? budgets.find((b) => b.id === editId) : null
  const now = new Date()

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const usedCategories = budgets
    .filter((b) => b.month === now.getMonth() && b.year === now.getFullYear() && b.id !== editId)
    .map((b) => b.category)

  const categoryOptions: SelectOption[] = expenseCategories
    .filter((c) => !usedCategories.includes(c.name))
    .map((c) => ({ value: c.name, label: c.name, color: c.color }))

  const [category, setCategory] = useState(editBudget?.category || '')
  const [limit, setLimit] = useState(editBudget ? String(editBudget.limit) : '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!category || !limit) return
    setSaving(true)
    try {
      if (editBudget) {
        await updateBudget(editBudget.id, {
          category,
          limit: Math.abs(parseFloat(limit))
        })
        toast('Presupuesto actualizado', '', 'success')
      } else {
        await addBudget({
          category,
          limit: Math.abs(parseFloat(limit)),
          month: now.getMonth(),
          year: now.getFullYear()
        })
        toast('Presupuesto creado', `Límite: $${limit} para ${category}`, 'success')
      }
      onClose()
    } catch {
      toast('Error al guardar presupuesto', '', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      description={editBudget ? 'Modifica el límite de gasto mensual' : 'Establece un límite de gasto mensual'}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Categoría</label>
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todas las categorías ya tienen presupuesto este mes
            </p>
          ) : (
            <Select
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              placeholder="Seleccionar categoría"
            />
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Límite mensual</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!category || !limit || saving || categoryOptions.length === 0}
            className="flex-1"
          >
            {saving ? 'Guardando...' : editBudget ? 'Actualizar presupuesto' : 'Crear presupuesto'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
