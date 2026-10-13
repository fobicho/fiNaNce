import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Select, type SelectOption } from './ui/select'
import { useFinanceStore } from '../stores/finance-store'
import { toast } from '../stores/toast-store'
import { Upload, FileText } from 'lucide-react'

interface CsvImportDialogProps {
  open: boolean
  onClose: () => void
}

export function CsvImportDialog({ open, onClose }: CsvImportDialogProps) {
  const { categories, addTransaction } = useFinanceStore()
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [dateCol, setDateCol] = useState(0)
  const [descCol, setDescCol] = useState(1)
  const [amountCol, setAmountCol] = useState(2)
  const [categoryCol, setCategoryCol] = useState<number | undefined>()
  const [defaultCategory, setDefaultCategory] = useState('')
  const [importing, setImporting] = useState(false)

  const columnOptions: SelectOption[] = headers.map((h, i) => ({
    value: String(i),
    label: h || `Columna ${i + 1}`
  }))

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.name, label: c.name, color: c.color }))
  ]

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        toast('Archivo inválido', 'No se encontraron datos', 'error')
        return
      }
      const parsed = lines.map((l) => {
        const parts: string[] = []
        let current = ''
        let inQuotes = false
        for (const ch of l) {
          if (ch === '"') inQuotes = !inQuotes
          else if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = '' }
          else current += ch
        }
        parts.push(current.trim())
        return parts
      })
      setHeaders(parsed[0])
      setRows(parsed.slice(1))
      setDateCol(0)
      setDescCol(1)
      setAmountCol(2)
      setCategoryCol(undefined)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)
    let success = 0
    for (const row of rows) {
      try {
        const dateStr = row[dateCol]
        const amountStr = row[amountCol]?.replace(/[$,€£\s]/g, '').replace(',', '.')
        const desc = row[descCol] || ''
        const cat = categoryCol !== undefined ? row[categoryCol] : defaultCategory
        if (!dateStr || !amountStr) continue
        const amount = parseFloat(amountStr)
        if (isNaN(amount)) continue
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) continue
        await addTransaction({
          type: amount >= 0 ? 'income' : 'expense',
          amount,
          category: cat || 'Otros',
          description: desc,
          date,
          accountId: undefined,
        })
        success++
      } catch { /* skip bad row */ }
    }
    toast(`${success} transacciones importadas`, `De ${rows.length} filas procesadas`, 'success')
    setRows([])
    setHeaders([])
    onClose()
    setImporting(false)
  }

  const showMapping = headers.length > 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar CSV"
      description="Sube un archivo CSV bancario"
    >
      <div className="space-y-4">
        {!showMapping ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-muted-foreground/30 transition-colors">
            <label className="cursor-pointer flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Seleccionar archivo CSV</span>
              <input type="file" accept=".csv,.tsv" onChange={handleFile} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              {rows.length} filas detectadas
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Columna de fecha</label>
                <Select options={columnOptions} value={String(dateCol)} onChange={(v) => setDateCol(Number(v))} searchable={false} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Columna de descripción</label>
                <Select options={columnOptions} value={String(descCol)} onChange={(v) => setDescCol(Number(v))} searchable={false} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Columna de monto</label>
                <Select options={columnOptions} value={String(amountCol)} onChange={(v) => setAmountCol(Number(v))} searchable={false} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Columna de categoría (opcional)</label>
                <Select options={[{ value: '', label: 'Usar categoría por defecto' }, ...columnOptions]} value={String(categoryCol ?? '')} onChange={(v) => setCategoryCol(v ? Number(v) : undefined)} searchable={false} />
              </div>
              {categoryCol === undefined && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Categoría por defecto</label>
                  <Select options={categoryOptions} value={defaultCategory} onChange={setDefaultCategory} searchable={false} />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setRows([]); setHeaders([]) }} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || rows.length === 0} className="flex-1 gap-2">
                <Upload className="w-4 h-4" />
                {importing ? 'Importando...' : `Importar ${rows.length}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
