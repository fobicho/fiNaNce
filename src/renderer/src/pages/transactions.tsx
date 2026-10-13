import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'

interface TransactionsLocationState {
  newTransaction?: boolean
  tag?: string
}
import { motion } from 'framer-motion'
import { Plus, Search, Trash2, Pencil, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Select, type SelectOption } from '../components/ui/select'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { TransactionForm } from '../components/transaction-form'
import { CsvImportDialog } from '../components/csv-import-dialog'
import { useFinanceStore } from '../stores/finance-store'
import { useThemeStore } from '../stores/theme-store'
import { formatCurrency } from '../lib/utils'
import { txAmount } from '../lib/exchange'
import { toast } from '../stores/toast-store'
import { TransactionsSkeleton } from '../components/page-skeletons'
import { TrendingUp, TrendingDown } from 'lucide-react'

const PAGE_SIZE = 50

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

const sortOptions: SelectOption[] = [
  { value: 'date-desc', label: 'Más recientes' },
  { value: 'date-asc', label: 'Más antiguos' },
  { value: 'amount-desc', label: 'Mayor monto' },
  { value: 'amount-asc', label: 'Menor monto' }
]

const typeFilterOptions: SelectOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'income', label: 'Ingresos', icon: TrendingUp, color: '#22c55e' },
  { value: 'expense', label: 'Gastos', icon: TrendingDown, color: '#ef4444' }
]

export function Transactions() {
  const transactions = useFinanceStore((s) => s.transactions)
  const categories = useFinanceStore((s) => s.categories)
  const removeTransaction = useFinanceStore((s) => s.removeTransaction)
  const loading = useFinanceStore((s) => s.loading)
  const baseCurrency = useThemeStore((s) => s.currency)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const searchRef = useRef<HTMLInputElement>(null)
  const locationState = location.state as TransactionsLocationState | undefined

  useEffect(() => {
    function handleFocusSearch() { searchRef.current?.focus() }
    window.addEventListener('focus-search', handleFocusSearch)
    return () => window.removeEventListener('focus-search', handleFocusSearch)
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const search = searchParams.get('q') || ''
  const typeFilter = searchParams.get('type') || 'all'
  const categoryFilter = searchParams.get('category') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortBy = searchParams.get('sort') || 'date'
  const sortOrder = searchParams.get('order') || 'desc'

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value && value !== 'all' && value !== '1') {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      return next
    }, { replace: true })
  }

  useEffect(() => {
    if (locationState?.newTransaction) {
      setEditId(undefined)
      setFormKey(k => k + 1)
      setShowForm(true)
      window.history.replaceState({}, document.title)
    }
  }, [locationState])

  const categoryFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Todas las categorías' },
    ...categories.map((c) => ({ value: c.name, label: c.name, color: c.color }))
  ]

  const filtered = useMemo(() => {
    let result = [...transactions]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter)
    }
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'amount') cmp = a.amount - b.amount
      else cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [transactions, search, typeFilter, categoryFilter, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    if (search || typeFilter !== 'all' || categoryFilter !== 'all') {
      setParam('page', '1')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, categoryFilter])

  async function handleDelete() {
    if (deleteId) {
      await removeTransaction(deleteId)
      setDeleteId(null)
      toast('Transacción eliminada', undefined, undefined, {
        label: 'Deshacer',
        onClick: () => useFinanceStore.getState().undoDeleteTransaction()
      })
    }
  }

  if (loading) return <TransactionsSkeleton />

  function handleEdit(id: string) {
    setEditId(id)
    setShowForm(true)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="gap-4 flex flex-col flex-1 min-h-0">
      <motion.div variants={item} className="flex items-center gap-2">
        <Button onClick={() => { setEditId(undefined); setFormKey(k => k + 1); setShowForm(true) }} className="gap-2 rounded-full btn-contrast">
          <Plus className="w-4 h-4" />
          Nueva transacción
        </Button>
        <Button onClick={() => setShowCsvImport(true)} className="gap-2 rounded-full btn-contrast">
          <Upload className="w-4 h-4" />
          Importar CSV
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Buscar por descripción o categoría..."
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-[140px]">
          <Select options={typeFilterOptions} value={typeFilter} onChange={(v) => setParam('type', v)} searchable={false} />
        </div>
        <div className="w-[200px]">
          <Select options={categoryFilterOptions} value={categoryFilter} onChange={(v) => setParam('category', v)} />
        </div>
        <div className="w-[160px]">
          <Select options={sortOptions} value={`${sortBy}-${sortOrder}`} onChange={(v) => { const [by, order] = v.split('-'); setParam('sort', by); setParam('order', order) }} searchable={false} />
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { navigator.clipboard.writeText(window.location.href); toast('Enlace copiado', 'URL con filtros actuales', 'success') }}>
          Compartir vista
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex-1">
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl h-full">
        <CardContent className="p-0 h-full flex flex-col">
          {filtered.length === 0 ? (
            <EmptyState
              className="flex-1"
              title={transactions.length === 0 ? 'Sin transacciones' : 'Sin resultados'}
              description={transactions.length === 0 ? undefined : 'Intenta con otros filtros'}
            />
          ) : (
            <div className="divide-y divide-border">
              {paginated.map((t, i) => (
                <div
                  key={t.id}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group animate-fade-in"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {t.type === 'income' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || '-'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant={t.type === 'income' ? 'income' : 'expense'}>{t.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString('es-MX', { dateStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-sm font-semibold num ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : ''}{formatCurrency(txAmount(t), baseCurrency)}
                      </span>
                      {t.currency && t.currency !== baseCurrency && (
                        <p className="text-[10px] text-muted-foreground num">
                          {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount, t.currency)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t.id)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {totalPages > 1 && (
        <motion.div variants={item} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} transacciones
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="min-w-[36px]" onClick={() => setParam('page', String(p))}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <TransactionForm key={editId || `new-${formKey}`} open={showForm} onClose={() => { setShowForm(false); setEditId(undefined) }} editId={editId} />
      <CsvImportDialog open={showCsvImport} onClose={() => setShowCsvImport(false)} />
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar transacción"
        description="Esta acción no se puede deshacer. ¿Estás seguro?"
      />
    </motion.div>
  )
}
