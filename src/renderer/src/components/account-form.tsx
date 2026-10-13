import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { type SelectOption } from './ui/select'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'
import { Landmark, Wallet, PiggyBank, CreditCard } from 'lucide-react'

const accountTypeOptions: SelectOption[] = [
  { value: 'cash', label: 'Efectivo', icon: Landmark },
  { value: 'savings', label: 'Ahorro', icon: PiggyBank },
  { value: 'debit', label: 'Débito', icon: Wallet },
  { value: 'credit', label: 'Crédito', icon: CreditCard }
]

const presetColors = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4',
  '#f97316', '#eab308', '#ec4899', '#ef4444',
  '#14b8a6', '#6366f1', '#6b7280', '#78716c'
]

interface AccountFormProps {
  open: boolean
  onClose: () => void
  editId?: string
}

export function AccountForm({ open, onClose, editId }: AccountFormProps) {
  const { accounts, addAccount, updateAccount } = useFinanceStore()
  const editAcc = editId ? accounts.find((a) => a.id === editId) : null

  const [name, setName] = useState(editAcc?.name || '')
  const [type, setType] = useState(editAcc?.type || 'debit')
  const [balance, setBalance] = useState(editAcc ? String(Math.abs(editAcc.balance)) : '0')
  const [color, setColor] = useState(editAcc?.color || '#22c55e')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name) return
    setSaving(true)
    const numBalance = Math.abs(parseFloat(balance) || 0)
    try {
      if (editAcc) {
        await updateAccount(editAcc.id, { name, type: type as 'debit' | 'savings' | 'credit' | 'cash', color })
        toast('Cuenta actualizada', '', 'success')
      } else {
        await addAccount({ name, type: type as 'debit' | 'savings' | 'credit' | 'cash', balance: numBalance, color })
        toast('Cuenta creada', '', 'success')
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
      title={editAcc ? 'Editar cuenta' : 'Nueva cuenta'}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value as 'debit' | 'savings' | 'credit' | 'cash')}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all ${
                  type === opt.value
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground border border-transparent'
                }`}
              >
                {opt.icon && <opt.icon className="w-4 h-4" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Nombre</label>
          <Input
            placeholder="Nombre de la cuenta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {!editAcc && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Saldo inicial</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
        )}

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
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name || saving} className="flex-1">
            {saving ? 'Guardando...' : editAcc ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
