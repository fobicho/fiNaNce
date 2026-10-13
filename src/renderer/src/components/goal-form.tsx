import { useState, useMemo } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import { DatePicker } from './ui/date-picker'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'
import { allIconNames, resolveIcon } from '../lib/icons'

interface GoalFormProps {
  open: boolean
  onClose: () => void
  editId?: string
}

const presetColors = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#f97316',
  '#eab308', '#ec4899', '#ef4444', '#14b8a6',
  '#06b6d4', '#6366f1'
]

export function GoalForm({ open, onClose, editId }: GoalFormProps) {
  const { goals, addGoal, updateGoal } = useFinanceStore()
  const editGoal = editId ? goals.find((g) => g.id === editId) : null

  const [name, setName] = useState(editGoal?.name || '')
  const [targetAmount, setTargetAmount] = useState(editGoal ? String(editGoal.targetAmount) : '')
  const [deadline, setDeadline] = useState(editGoal?.deadline ? new Date(editGoal.deadline) : undefined)
  const [color, setColor] = useState(editGoal?.color || '#8b5cf6')
  const [icon, setIcon] = useState(editGoal?.icon || 'PiggyBank')
  const [saving, setSaving] = useState(false)

  const iconOptions: SelectOption[] = useMemo(
    () => allIconNames.map((name) => ({
      value: name,
      label: name,
      icon: resolveIcon(name)
    })),
    []
  )

  const IconComp = resolveIcon(icon || 'PiggyBank')

  async function handleSubmit() {
    if (!name || !targetAmount) return
    setSaving(true)
    try {
      if (editGoal) {
        await updateGoal(editGoal.id, { name, targetAmount: Math.abs(parseFloat(targetAmount)), deadline, color, icon })
        toast('Meta actualizada', '', 'success')
      } else {
        await addGoal({ name, targetAmount: Math.abs(parseFloat(targetAmount)), currentAmount: 0, deadline, color, icon })
        toast('Meta creada', '', 'success')
      }
      onClose()
    } catch {
      toast('Error al guardar', '', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editGoal ? 'Editar meta' : 'Nueva meta de ahorro'}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Nombre</label>
          <Input
            placeholder="¿Qué quieres ahorrar?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Meta</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Ícono</label>
          <Select options={iconOptions} value={icon} onChange={setIcon} placeholder="Seleccionar ícono" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Color</label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-xl transition-all ${
                  color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <IconComp className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-sm text-muted-foreground">
              Vista previa: <span style={{ color }}>{name || 'Nombre'}</span>
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Fecha límite (opcional)</label>
          <DatePicker value={deadline} onChange={setDeadline} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !targetAmount || saving} className="flex-1">
            {saving ? 'Guardando...' : editGoal ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
