import { useState, useMemo } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'
import { allIconNames, resolveIcon } from '../lib/icons'
import { TrendingUp, TrendingDown } from 'lucide-react'

const typeOptions: SelectOption[] = [
  { value: 'expense', label: 'Gasto', icon: TrendingDown, color: '#ef4444' },
  { value: 'income', label: 'Ingreso', icon: TrendingUp, color: '#22c55e' }
]

const presetColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#6b7280', '#78716c'
]

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  editId?: string
}

export function CategoryForm({ open, onClose, editId }: CategoryFormProps) {
  const { categories, addCategory, updateCategory } = useFinanceStore()
  const editCat = editId ? categories.find((c) => c.id === editId) : null

  const [name, setName] = useState(editCat?.name || '')
  const [type, setType] = useState(editCat?.type || 'expense')
  const [icon, setIcon] = useState(editCat?.icon || 'Receipt')
  const [color, setColor] = useState(editCat?.color || '#6b7280')
  const [saving, setSaving] = useState(false)

  const iconOptions: SelectOption[] = useMemo(
    () => allIconNames.map((name) => ({
      value: name,
      label: name,
      icon: resolveIcon(name)
    })),
    []
  )

  async function handleSubmit() {
    if (!name) return
    setSaving(true)
    try {
      if (editCat) {
        await updateCategory(editCat.id, { name, type: type as 'income' | 'expense', icon, color })
        toast('Categoría actualizada', '', 'success')
      } else {
        await addCategory({ name, type: type as 'income' | 'expense', icon, color })
        toast('Categoría creada', '', 'success')
      }
      onClose()
    } catch {
      toast('Error al guardar', '', 'error')
    } finally {
      setSaving(false)
    }
  }

  const IconComp = resolveIcon(icon || 'Receipt')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editCat ? 'Editar categoría' : 'Nueva categoría'}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
                onClick={() => setType(opt.value as 'income' | 'expense')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all ${
                type === opt.value
                  ? opt.value === 'expense'
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-muted text-muted-foreground border border-transparent'
              }`}
            >
              {opt.icon && <opt.icon className="w-4 h-4" />}
              {opt.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Nombre</label>
          <Input
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
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

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name || saving} className="flex-1">
            {saving ? 'Guardando...' : editCat ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
