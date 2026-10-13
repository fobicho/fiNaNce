import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import { DatePicker } from './ui/date-picker'
import { useFinanceStore } from '../stores/finance-store'
import { useThemeStore } from '../stores/theme-store'
import { toast } from '../stores/toast-store'
import { TrendingUp, TrendingDown, Repeat } from 'lucide-react'
import type { CurrencyCode } from '../lib/db'

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  editId?: string
}

const typeOptions: SelectOption[] = [
  { value: 'expense', label: 'Gasto', icon: TrendingDown, color: '#ef4444' },
  { value: 'income', label: 'Ingreso', icon: TrendingUp, color: '#22c55e' }
]

const currencyOptions: SelectOption[] = [
  { value: 'MXN', label: 'MXN' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'COP', label: 'COP' },
  { value: 'ARS', label: 'ARS' },
  { value: 'CLP', label: 'CLP' }
]

export function TransactionForm({ open, onClose, editId }: TransactionFormProps) {
  const { addTransaction, updateTransaction, categories, accounts, transactions } = useFinanceStore()
  const baseCurrency = useThemeStore((s) => s.currency)
  const editTx = editId ? transactions.find((t) => t.id === editId) : null
  const [type, setType] = useState(editTx?.type || 'expense')
  const [amount, setAmount] = useState(editTx ? String(Math.abs(editTx.amount)) : '')
  const [currency, setCurrency] = useState<CurrencyCode>(editTx?.currency || baseCurrency)
  const [category, setCategory] = useState(editTx?.category || '')
  const [description, setDescription] = useState(editTx?.description || '')
  const [date, setDate] = useState(editTx ? new Date(editTx.date) : new Date())
  const [accountId, setAccountId] = useState(editTx?.accountId || '')
  const [saving, setSaving] = useState(false)
  const [isRecurring, setIsRecurring] = useState(editTx?.isRecurring || false)
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>(editTx?.recurringInterval || 'monthly')

  const categoryOptions: SelectOption[] = categories
    .filter((c) => c.type === type)
    .map((c) => ({ value: c.name, label: c.name, color: c.color }))

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id, label: a.name, color: a.color
  }))

  async function handleSubmit() {
    if (!amount || !category) return
    setSaving(true)
    const numAmount = Math.abs(parseFloat(amount))
    try {
      const base = {
        type: type as 'income' | 'expense',
        amount: type === 'expense' ? -numAmount : numAmount,
        currency: currency as CurrencyCode,
        category,
        description,
        date,
        accountId: accountId || undefined,
        isRecurring: isRecurring || undefined,
        recurringInterval: isRecurring ? recurringInterval : undefined
      }
      if (editTx) {
        await updateTransaction(editTx.id, base)
        toast('Transacción actualizada', '', 'success')
      } else {
        await addTransaction(base)
        toast('Transacción creada', '', 'success')
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
      title={editTx ? 'Editar transacción' : 'Nueva transacción'}
      description={editTx ? 'Modifica los datos de la transacción' : 'Registra un ingreso o gasto'}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {typeOptions.map((opt) => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => { setType(opt.value as 'income' | 'expense'); setCategory('') }}
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
            </motion.button>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Monto</label>
          <div className="flex gap-2">
            <div className="flex-1">
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
            <div className="w-[100px]">
              <Select options={currencyOptions} value={currency} onChange={(v) => setCurrency(v as CurrencyCode)} searchable={false} />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Categoría</label>
          <Select
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            placeholder="Seleccionar categoría"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Descripción</label>
          <Input
            placeholder={type === 'expense' ? '¿Cuál fue el gasto?' : '¿Cuál fue el ingreso?'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Fecha</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cuenta</label>
            <Select
              options={accountOptions}
              value={accountId}
              onChange={setAccountId}
              placeholder="Sin cuenta"
              searchable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isRecurring
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted text-muted-foreground border border-transparent'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Repetir
          </button>
          {isRecurring && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cada</span>
              <select
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                className="h-8 px-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="weekly">semana</option>
                <option value="monthly">mes</option>
                <option value="yearly">año</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || !category || saving}
            className="flex-1"
          >
            {saving ? 'Guardando...' : editTx ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
