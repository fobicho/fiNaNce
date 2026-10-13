import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  ArrowUpRight, ArrowDownRight, Plus, ChevronLeft, ChevronRight, BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { TransactionForm } from '../components/transaction-form'
import { useFinanceStore } from '../stores/finance-store'
import { formatCurrency } from '../lib/utils'
import { txAmount } from '../lib/exchange'
import { DashboardSkeleton } from '../components/page-skeletons'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Dashboard() {
  const transactions = useFinanceStore((s) => s.transactions)
  const loading = useFinanceStore((s) => s.loading)
  const [showForm, setShowForm] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('month')

  const [now] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(now)
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  function getWeekBounds(date: Date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    const monday = new Date(d)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { monday, sunday }
  }

  const weekBounds = viewMode === 'week' ? getWeekBounds(selectedDate) : null

  const rangeLabel = viewMode === 'week'
    ? weekBounds
      ? `Semana del ${weekBounds.monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} — ${weekBounds.sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : ''
    : viewMode === 'month'
      ? `${MONTHS[viewMonth]} ${viewYear}`
      : String(viewYear)

  const filterFn = useCallback((t: { date: Date }) => {
    const d = new Date(t.date)
    if (viewMode === 'week') {
      return weekBounds ? d >= weekBounds.monday && d <= weekBounds.sunday : false
    }
    if (viewMode === 'month') {
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear
    }
    return d.getFullYear() === viewYear
  }, [viewMode, viewMonth, viewYear, weekBounds])

  const periodLabel = viewMode === 'week' ? 'de la Semana' : viewMode === 'month' ? 'del Mes' : 'del Año'

  const filteredTx = useMemo(() => transactions.filter(filterFn), [transactions, filterFn])

  const stats = useMemo(() => {
    const totalIncome = filteredTx.filter((t) => t.type === 'income').reduce((s, t) => s + txAmount(t), 0)
    const totalExpenses = filteredTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(txAmount(t)), 0)
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, count: filteredTx.length }
  }, [filteredTx])

  function trimData(data: { label: string; income: number; expenses: number }[], padding: number) {
    let first = -1
    let last = -1
    for (let i = 0; i < data.length; i++) {
      if (data[i].income !== 0 || data[i].expenses !== 0) {
        if (first === -1) first = i
        last = i
      }
    }
    if (first === -1) return data
    const start = Math.max(0, first - padding)
    const end = Math.min(data.length, last + padding + 1)
    return data.slice(start, end)
  }

  const chartData = useMemo(() => {
    const buckets = new Map<string, { income: number; expenses: number }>()
    if (viewMode === 'week') {
      if (!weekBounds) return []
      for (const t of transactions) {
        const d = new Date(t.date)
        if (d < weekBounds.monday || d > weekBounds.sunday) continue
        const key = String(d.getDay())
        const val = txAmount(t)
        const b = buckets.get(key) || { income: 0, expenses: 0 }
        if (t.type === 'income') b.income += val
        else b.expenses += Math.abs(val)
        buckets.set(key, b)
      }
      const data: { label: string; income: number; expenses: number }[] = []
      for (let i = 0; i <= 6; i++) {
        const key = String(i)
        const d = new Date(weekBounds.monday)
        d.setDate(d.getDate() + i)
        data.push({ label: `${DAYS[i]} ${d.getDate()}`, income: buckets.get(key)?.income || 0, expenses: buckets.get(key)?.expenses || 0 })
      }
      return data
    }
    if (viewMode === 'month') {
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
      for (const t of transactions) {
        const d = new Date(t.date)
        if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) continue
        const key = String(d.getDate())
        const val = txAmount(t)
        const b = buckets.get(key) || { income: 0, expenses: 0 }
        if (t.type === 'income') b.income += val
        else b.expenses += Math.abs(val)
        buckets.set(key, b)
      }
      const data: { label: string; income: number; expenses: number }[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const key = String(d)
        data.push({ label: key, income: buckets.get(key)?.income || 0, expenses: buckets.get(key)?.expenses || 0 })
      }
      return trimData(data, 3)
    }
    for (const t of transactions) {
      const d = new Date(t.date)
      if (d.getFullYear() !== viewYear) continue
      const key = String(d.getMonth())
      const val = txAmount(t)
      const b = buckets.get(key) || { income: 0, expenses: 0 }
      if (t.type === 'income') b.income += val
      else b.expenses += Math.abs(val)
      buckets.set(key, b)
    }
    const data: { label: string; income: number; expenses: number }[] = []
    for (let m = 0; m < 12; m++) {
      data.push({ label: MONTHS[m].slice(0, 3), income: buckets.get(String(m))?.income || 0, expenses: buckets.get(String(m))?.expenses || 0 })
    }
    return trimData(data, 3)
  }, [transactions, viewMode, weekBounds, viewMonth, viewYear])

  const flowByCategory = useMemo(() => {
    const incomeMap: Record<string, number> = {}
    const expenseMap: Record<string, number> = {}
    filteredTx.forEach((t) => {
      const val = txAmount(t)
      if (t.type === 'income') {
        incomeMap[t.category] = (incomeMap[t.category] || 0) + val
      } else {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + Math.abs(val)
      }
    })
    const incomeTotal = Object.values(incomeMap).reduce((s, v) => s + v, 0)
    const expenseTotal = Object.values(expenseMap).reduce((s, v) => s + v, 0)
    return {
      incomeTotal,
      expenseTotal,
      income: Object.entries(incomeMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([name, value]) => ({ name, value, percentage: incomeTotal ? Math.round((value / incomeTotal) * 100) : 0 })),
      expenses: Object.entries(expenseMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([name, value]) => ({ name, value, percentage: expenseTotal ? Math.round((value / expenseTotal) * 100) : 0 }))
    }
  }, [filteredTx])

  const recentTx = useMemo(() =>
    filteredTx.slice(0, 5),
    [filteredTx]
  )

  const projection = useMemo(() => {
    if (viewMode !== 'month') return { projectedBalance: stats.balance, change: 0, details: [] }
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysLeft = daysInMonth - dayOfMonth

    let projectedChange = 0
    const details: { desc: string; amount: number }[] = []

    for (const t of transactions) {
      if (!t.isRecurring) continue
      const absAmount = Math.abs(txAmount(t))
      if (absAmount === 0) continue

      let count = 0
      const interval = t.recurringInterval || 'monthly'

      if (interval === 'monthly') {
        count = 1
      } else if (interval === 'weekly') {
        count = Math.max(1, Math.floor(daysLeft / 7))
      } else if (interval === 'yearly') {
        const txDate = new Date(t.date)
        if (txDate.getMonth() === viewMonth) count = 1
      }

      if (count > 0) {
        const total = absAmount * count
        if (t.type === 'expense') {
          projectedChange -= total
          details.push({ desc: `${t.description || t.category}`, amount: -total })
        } else {
          projectedChange += total
          details.push({ desc: `${t.description || t.category}`, amount: total })
        }
      }
    }

    const allTimeIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + txAmount(t), 0)
    const allTimeExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(txAmount(t)), 0)
    return {
      projectedBalance: (allTimeIncome - allTimeExpenses) + projectedChange,
      change: projectedChange,
      details
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, viewMode, viewMonth, viewYear, now])

  if (loading) {
    return <DashboardSkeleton />
  }

  function navigateMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewMonth(d.getMonth())
    setViewYear(d.getFullYear())
  }

  function navigateWeek(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta * 7)
    setSelectedDate(d)
  }

  function navigateYear(delta: number) {
    setViewYear(viewYear + delta)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-[2px] bg-muted rounded-lg h-10">
            {(['week', 'month', 'year'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2.5 h-9 text-xs font-medium rounded-md transition-all flex items-center ${
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <button type="button" onClick={() => viewMode === 'week' ? navigateWeek(-1) : viewMode === 'month' ? navigateMonth(-1) : navigateYear(-1)} aria-label="Período anterior" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-medium text-center flex-none ${viewMode === 'week' ? 'w-[215px]' : viewMode === 'month' ? 'w-[120px]' : 'w-[80px]'}`}>{rangeLabel}</span>
            <button type="button" onClick={() => viewMode === 'week' ? navigateWeek(1) : viewMode === 'month' ? navigateMonth(1) : navigateYear(1)} aria-label="Período siguiente" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
        <motion.div variants={item}>
          <Button onClick={() => { setFormKey(k => k + 1); setShowForm(true) }} className="gap-2 rounded-full btn-contrast">
            <Plus className="w-4 h-4" />
            Nueva transacción
          </Button>
        </motion.div>
      </div>

      <motion.div key={viewMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <p className="text-sm text-muted-foreground">Balance {periodLabel}</p>
                <p className="text-2xl font-bold tracking-tight num">{formatCurrency(stats.balance)}</p>
                {viewMode === 'month' && projection.change !== 0 && (
                  <p className={`text-xs flex items-center gap-1 num ${projection.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {projection.change > 0 ? <ArrowUpRight className="w-3 h-3 shrink-0" /> : <ArrowDownRight className="w-3 h-3 shrink-0" />}
                    <span>{projection.change > 0 ? '+' : ''}{formatCurrency(Math.abs(projection.change))} fin de mes</span>
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ingresos {periodLabel}</p>
                <p className="text-2xl font-bold tracking-tight num">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Gastos {periodLabel}</p>
                <p className="text-2xl font-bold tracking-tight num">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold tracking-tight">{stats.count}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Ingresos vs Gastos — {rangeLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 || chartData.every((m) => m.income === 0 && m.expenses === 0) ? (
                <div className="h-[190px] flex flex-col items-center justify-center gap-2">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Sin datos para mostrar</p>
                </div>
              ) : (
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(240 5% 64.9%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(240 5% 64.9%)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(240 10% 5.9%)',
                          border: '1px solid hsl(240 5% 20%)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Flujo {periodLabel}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {flowByCategory.incomeTotal > 0 || flowByCategory.expenseTotal > 0
                    ? `${formatCurrency(flowByCategory.incomeTotal - flowByCategory.expenseTotal)} neto`
                    : 'Sin movimientos'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {flowByCategory.income.length === 0 && flowByCategory.expenses.length === 0 ? (
                <div className="h-[190px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin movimientos en este período</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-green-500 mb-3 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Ingresos
                    </p>
                    {flowByCategory.income.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin ingresos</p>
                    ) : (
                      <div className="space-y-3">
                        {flowByCategory.income.map((cat, i) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{cat.name}</span>
                              <span className="font-medium text-green-500 shrink-0 num">{formatCurrency(cat.value)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cat.percentage}%` }}
                                transition={{ duration: 1, delay: i * 0.05, ease: 'easeOut' }}
                                className="h-full rounded-full bg-green-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-3 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Gastos
                    </p>
                    {flowByCategory.expenses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin gastos</p>
                    ) : (
                      <div className="space-y-3">
                        {flowByCategory.expenses.map((cat, i) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{cat.name}</span>
                              <span className="font-medium text-red-500 shrink-0 num">{formatCurrency(cat.value)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cat.percentage}%` }}
                                transition={{ duration: 1, delay: i * 0.05, ease: 'easeOut' }}
                                className="h-full rounded-full bg-red-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Transacciones Recientes — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <EmptyState title="Sin transacciones" />
            ) : (
              <div className="space-y-1">
                {recentTx.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {t.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={t.type === 'income' ? 'income' : 'expense'}>
                            {t.category}
                          </Badge>
<span className="text-xs text-muted-foreground num">
                            {new Date(t.date).toLocaleDateString('es-MX', { dateStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold num ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {viewMode === 'month' && projection.details.length > 0 && (
        <motion.div variants={item}>
          <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Próximas transacciones recurrentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projection.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{d.desc}</span>
                    <span className={`text-sm font-medium num ${d.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {d.amount >= 0 ? '+' : ''}{formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <TransactionForm key={formKey} open={showForm} onClose={() => setShowForm(false)} />
    </motion.div>
  )
}
