import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Wallet, Download, Percent, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Segmented } from '../components/ui/segmented'
import { DatePicker } from '../components/ui/date-picker'
import { useFinanceStore } from '../stores/finance-store'
import { useThemeStore } from '../stores/theme-store'
import { formatCurrency, cn } from '../lib/utils'
import { txAmount } from '../lib/exchange'
import { ReportsSkeleton } from '../components/page-skeletons'
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#ec4899', '#6366f1', '#06b6d4']
const TICK = { fontSize: 12, fill: 'hsl(240 5% 64.9%)' }

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

const RANGE_PRESETS = [
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '12 meses', days: 365 }
] as const

const GROUP_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' }
] as const

const CATEGORY_CHART_OPTIONS = [
  { value: 'donut', label: 'Dona' },
  { value: 'bar', label: 'Barras' }
] as const

type GroupBy = (typeof GROUP_OPTIONS)[number]['value']
type Granularity = 'day' | 'week' | 'month'

const MS_DAY = 86400000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function diffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_DAY) + 1
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function resolveGranularity(groupBy: GroupBy, days: number): Granularity {
  if (groupBy !== 'auto') return groupBy
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === 'month') return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  const base = granularity === 'week' ? startOfWeek(date) : date
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`
}

function buildBuckets(start: Date, end: Date, granularity: Granularity): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  if (granularity === 'month') {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cursor <= last) {
      out.push({
        key: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`,
        label: cursor.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return out
  }
  let cursor = granularity === 'week' ? startOfWeek(start) : new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = granularity === 'week' ? startOfWeek(end) : new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const step = granularity === 'week' ? 7 : 1
  while (cursor <= last) {
    out.push({
      key: bucketKey(cursor, granularity),
      label: cursor.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + step)
  }
  return out
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

interface DeltaProps {
  value: number
  positiveIsGood?: boolean
}

function Delta({ value, positiveIsGood = true }: DeltaProps) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) {
    return <span className="text-xs text-muted-foreground">sin cambios</span>
  }
  const up = value > 0
  const good = positiveIsGood ? up : !up
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-green-500' : 'text-red-500')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {`${Math.abs(value).toFixed(0)}%`}
    </span>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ElementType
  tone: 'green' | 'red' | 'primary' | 'violet'
  delta?: number
  positiveIsGood?: boolean
}

function SummaryCard({ label, value, icon: Icon, tone, delta, positiveIsGood }: SummaryCardProps) {
  const toneBg = {
    green: 'bg-green-500/10',
    red: 'bg-red-500/10',
    primary: 'bg-primary/10',
    violet: 'bg-violet-500/10'
  }[tone]
  const toneFg = {
    green: 'text-green-500',
    red: 'text-red-500',
    primary: 'text-primary',
    violet: 'text-violet-500'
  }[tone]
  const valueTone = tone === 'green' ? 'text-green-500' : tone === 'red' ? 'text-red-500' : ''
  return (
    <Card className="shadow-none border border-border/50 bg-card/60 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', toneBg)}>
            <Icon className={cn('w-5 h-5', toneFg)} />
          </div>
          {delta !== undefined && <Delta value={delta} positiveIsGood={positiveIsGood} />}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{label}</p>
        <p className={cn('text-xl font-bold tracking-tight num', valueTone)}>{value}</p>
      </CardContent>
    </Card>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function Reports() {
  const transactions = useFinanceStore((s) => s.transactions)
  const accounts = useFinanceStore((s) => s.accounts)
  const loading = useFinanceStore((s) => s.loading)
  const currency = useThemeStore((s) => s.currency)
  const now = new Date()
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()))
  const [endDate, setEndDate] = useState(now)
  const [groupBy, setGroupBy] = useState<GroupBy>('auto')
  const [categoryChart, setCategoryChart] = useState<'donut' | 'bar'>('donut')

  const days = Math.max(1, diffDays(startDate, endDate))
  const granularity = resolveGranularity(groupBy, days)

  const previousRange = useMemo(() => {
    const prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1)
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (days - 1))
    return { start: prevStart, end: prevEnd }
  }, [startDate, days])

  const filtered = useMemo(() => {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= startDate && d <= end
    })
  }, [transactions, startDate, endDate])

  const previousFiltered = useMemo(() => {
    const end = new Date(previousRange.end)
    end.setHours(23, 59, 59, 999)
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= previousRange.start && d <= end
    })
  }, [transactions, previousRange])

  const totals = useMemo(() => {
    let income = 0, expenses = 0
    for (const t of filtered) {
      const val = Math.abs(txAmount(t))
      if (t.type === 'income') income += val
      else expenses += val
    }
    return { income, expenses, balance: income - expenses }
  }, [filtered])

  const prevTotals = useMemo(() => {
    let income = 0, expenses = 0
    for (const t of previousFiltered) {
      const val = Math.abs(txAmount(t))
      if (t.type === 'income') income += val
      else expenses += val
    }
    return { income, expenses, balance: income - expenses }
  }, [previousFiltered])

  const savingsRate = totals.income > 0 ? (totals.balance / totals.income) * 100 : 0
  const prevSavingsRate = prevTotals.income > 0 ? (prevTotals.balance / prevTotals.income) * 100 : 0

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      map[t.category] = (map[t.category] || 0) + Math.abs(txAmount(t))
    }
    const total = Object.values(map).reduce((sum, value) => sum + value, 0)
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, percent: total > 0 ? value / total : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  const trend = useMemo(() => {
    const buckets = buildBuckets(startDate, endDate, granularity)
    const map = new Map(buckets.map((bucket) => [bucket.key, { ...bucket, income: 0, expenses: 0 }]))
    for (const t of filtered) {
      const bucket = map.get(bucketKey(new Date(t.date), granularity))
      if (!bucket) continue
      const val = Math.abs(txAmount(t))
      if (t.type === 'income') bucket.income += val
      else bucket.expenses += val
    }
    return Array.from(map.values())
  }, [filtered, startDate, endDate, granularity])

  const comparison = useMemo(
    () => [
      { name: 'Ingresos', actual: totals.income, anterior: prevTotals.income },
      { name: 'Gastos', actual: totals.expenses, anterior: prevTotals.expenses }
    ],
    [totals, prevTotals]
  )

  const activePresetDays = RANGE_PRESETS.find((preset) => preset.days === days)?.days

  if (loading) return <ReportsSkeleton />

  const granularityLabel = granularity === 'day' ? 'por día' : granularity === 'week' ? 'por semana' : 'por mes'

  function applyPreset(presetDays: number) {
    const end = new Date()
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (presetDays - 1))
    setStartDate(start)
    setEndDate(end)
  }

  function accountName(id?: string): string {
    return accounts.find((a) => a.id === id)?.name || ''
  }

  function handleExportTransactionsCSV() {
    const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Cuenta', 'Moneda', 'Monto', `Monto (${currency})`]
    const lines = [header.map(csvCell).join(',')]
    for (const t of filtered) {
      lines.push(
        [
          new Date(t.date).toISOString().slice(0, 10),
          t.type === 'income' ? 'Ingreso' : 'Gasto',
          t.category,
          t.description || '',
          accountName(t.accountId),
          t.currency || currency,
          String(t.amount),
          String(Math.round(Math.abs(txAmount(t))))
        ]
          .map(csvCell)
          .join(',')
      )
    }
    downloadCSV(
      `reporte-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}.csv`,
      lines.join('\n')
    )
  }

  function handleExportCategoriesCSV() {
    const header = ['Categoría', 'Monto', `Monto (${currency})`, 'Porcentaje']
    const lines = [header.map(csvCell).join(',')]
    for (const cat of byCategory) {
      lines.push(
        [cat.name, String(cat.value), String(Math.round(cat.value)), `${(cat.percent * 100).toFixed(1)}%`]
          .map(csvCell)
          .join(',')
      )
    }
    downloadCSV(`reporte-categorias-${startDate.toISOString().slice(0, 10)}.csv`, lines.join('\n'))
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
<motion.div variants={item} className="flex items-center flex-wrap gap-3">
        <div className="flex items-center gap-2 mr-1">
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              size="sm"
              variant={activePresetDays === preset.days ? 'default' : 'outline'}
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">De</span>
          <DatePicker value={startDate} onChange={setStartDate} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">A</span>
          <DatePicker value={endDate} onChange={setEndDate} />
        </div>
        <Button onClick={handleExportTransactionsCSV} className="gap-2 rounded-full btn-contrast ml-auto">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Ingresos"
          value={formatCurrency(totals.income)}
          icon={TrendingUp}
          tone="green"
          delta={percentDelta(totals.income, prevTotals.income)}
        />
        <SummaryCard
          label="Gastos"
          value={formatCurrency(totals.expenses)}
          icon={TrendingDown}
          tone="red"
          delta={percentDelta(totals.expenses, prevTotals.expenses)}
          positiveIsGood={false}
        />
        <SummaryCard label="Balance" value={formatCurrency(totals.balance)} icon={Wallet} tone="primary" />
        <SummaryCard
          label="Tasa de ahorro"
          value={`${savingsRate.toFixed(0)}%`}
          icon={Percent}
          tone="violet"
          delta={percentDelta(savingsRate, prevSavingsRate)}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Evolución {granularityLabel}</CardTitle>
              <Segmented options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} ariaLabel="Agrupar por" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {filtered.length === 0 ? (
                  <ChartEmpty message="Sin datos en este período" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="reportIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="reportExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 20%)" vertical={false} />
                      <XAxis dataKey="label" tick={TICK} minTickGap={16} />
                      <YAxis tick={TICK} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="income" name="Ingresos" stroke="#22c55e" strokeWidth={2} fill="url(#reportIncome)" />
                      <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ef4444" strokeWidth={2} fill="url(#reportExpenses)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
<Card className="shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Gastos por categoría</CardTitle>
              <Segmented
                options={CATEGORY_CHART_OPTIONS}
                value={categoryChart}
                onChange={setCategoryChart}
                ariaLabel="Tipo de gráfico"
              />
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {byCategory.length === 0 ? (
                  <ChartEmpty message="Sin gastos en este período" />
                ) : categoryChart === 'donut' ? (
                  <div className="h-full flex flex-col sm:flex-row items-center gap-4">
                    <div className="h-[200px] sm:h-full w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                            {byCategory.map((entry, i) => (
                              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 w-full space-y-2 overflow-y-auto max-h-[220px] pr-1">
                      {byCategory.slice(0, 8).map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm gap-3">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="text-muted-foreground num shrink-0">{formatCurrency(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={92} tick={TICK} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: 'hsl(240 5% 20% / 0.3)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {byCategory.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
<Card className="shadow-none border border-border/50 bg-card/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Período actual vs anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {filtered.length === 0 && previousFiltered.length === 0 ? (
                <ChartEmpty message="Sin datos en este período" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 20%)" vertical={false} />
                    <XAxis dataKey="name" tick={TICK} />
                    <YAxis tick={TICK} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: 'hsl(240 5% 20% / 0.3)' }} />
                    <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="anterior" name="Anterior" fill="#6b7280" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {byCategory.length > 0 && (
        <motion.div variants={item}>
<Card className="shadow-none border border-border/50 bg-card/60 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Ranking de categorías</CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCategoriesCSV}>
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {byCategory.map((cat, i) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm gap-3">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="font-medium num shrink-0">
                        {formatCurrency(cat.value)}
                        <span className="text-muted-foreground text-xs font-normal ml-2">{(cat.percent * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.percent * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
