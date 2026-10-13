import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import { DatePicker } from './ui/date-picker'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'
import { ArrowRightLeft } from 'lucide-react'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
}

export function TransferDialog({ open, onClose }: TransferDialogProps) {
  const { accounts, addTransaction } = useFinanceStore()

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    color: a.color
  }))

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date())
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!fromId || !toId || !amount) return
    if (fromId === toId) {
      toast('Cuentas inválidas', 'Selecciona dos cuentas diferentes', 'error')
      return
    }
    setSaving(true)
    const numAmount = Math.abs(parseFloat(amount))
    const desc = description || 'Transferencia'
    try {
      await addTransaction({
        type: 'expense',
        amount: -numAmount,
        category: 'Transferencia',
        description: `${desc} → ${accounts.find((a) => a.id === toId)?.name || ''}`,
        date,
        accountId: fromId
      })
      await addTransaction({
        type: 'income',
        amount: numAmount,
        category: 'Transferencia',
        description: `${desc} ← ${accounts.find((a) => a.id === fromId)?.name || ''}`,
        date,
        accountId: toId
      })
      toast('Transferencia realizada', `$${numAmount.toFixed(2)} transferidos`, 'success')
      onClose()
    } catch {
      toast('Error al transferir', '', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transferir entre cuentas"
      description="Mueve dinero de una cuenta a otra"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Desde</label>
          <Select
            options={accountOptions}
            value={fromId}
            onChange={setFromId}
            placeholder="Seleccionar origen"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Hacia</label>
          <Select
            options={accountOptions}
            value={toId}
            onChange={setToId}
            placeholder="Seleccionar destino"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Monto</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Descripción (opcional)</label>
          <Input
            placeholder="Motivo de la transferencia"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Fecha</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!fromId || !toId || !amount || saving || fromId === toId} className="flex-1 gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            {saving ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
