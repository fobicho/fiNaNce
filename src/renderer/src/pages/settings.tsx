import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Globe, Download, Upload, RotateCcw, Folder, History, Trash2, Bot, Palette
} from 'lucide-react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Select, type SelectOption } from '../components/ui/select'
import { Dialog } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { Segmented } from '../components/ui/segmented'
import { toast } from '../stores/toast-store'
import { useThemeStore, type Mode } from '../stores/theme-store'
import type { CurrencyCode } from '../stores/theme-store'
import { useAiStore, PROVIDER_DEFAULT_MODELS, type AiProvider } from '../stores/ai-store'
import { useBackupStore, type BackupInterval, type BackupEntry } from '../stores/backup-store'
import { db } from '../lib/db'
import { clearSeedFlag } from '../lib/seed'
import { buildBackupPayload, applyBackupPayload } from '../lib/backup'
import { formatCurrency } from '../lib/utils'
import { cn } from '../lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

const currencyOptions: SelectOption[] = [
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'USD', label: 'USD - Dólar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'ARS', label: 'ARS - Peso Argentino' },
  { value: 'CLP', label: 'CLP - Peso Chileno' }
]

const MODES = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' }
] as const

const THEMES = [
  {
    id: 'default',
    name: 'Predeterminado',
    swatch: { dark: ['#09090b', '#3b82f6'], light: ['#ffffff', '#2563eb'] }
  },
  {
    id: 'beige',
    name: 'Beige pastel',
    swatch: { dark: ['#241d14', '#c9a06a'], light: ['#f7f1e6', '#a67c52'] }
  }
] as const

export function Settings() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const currency = useThemeStore((s) => s.currency)
  const setCurrency = useThemeStore((s) => s.setCurrency)
  const {
    interval, backupPath, lastBackup, setInterval, setBackupPath,
    history, addBackup, removeBackup
  } = useBackupStore()
  const aiConfig = useAiStore((s) => s.config)
  const setAiConfig = useAiStore((s) => s.setConfig)
  const [showReset, setShowReset] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace')
  const [active, setActive] = useState<SectionId>('apariencia')

  const intervalOptions: SelectOption[] = [
    { value: 'never', label: 'Nunca' },
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' }
  ]

  const aiProviderOptions: SelectOption[] = [
    { value: 'ollama', label: 'Local (Ollama)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'tokenharbor', label: 'Token Harbor' }
  ]

  async function handleAutoExport() {
    try {
      const json = JSON.stringify(await buildBackupPayload(), null, 2)
      const dateStr = new Date().toISOString().slice(0, 10)
      const defaultName = `finance-backup-${dateStr}.json`
      const defaultPath = backupPath ? `${backupPath.replace(/\\/g, '/')}/${defaultName}` : defaultName
      const savedPath = await window.api.backupSave(json, defaultPath)
      if (savedPath) {
        addBackup({ path: savedPath, date: new Date().toISOString(), label: dateStr })
        toast('Respaldo guardado', `Archivo: ${savedPath.split(/[/\\]/).pop()}`, 'success')
      }
    } catch {
      toast('Error al exportar', '', 'error')
    }
  }

  async function handleChooseFolder() {
    try {
      const folder = await window.api.backupChooseFolder()
      if (folder) {
        setBackupPath(folder)
        toast('Carpeta seleccionada', folder.split(/[/\\]/).pop(), 'success')
      }
    } catch (e) {
      toast('Error al seleccionar carpeta', String(e), 'error')
    }
  }

  async function handleRestoreFromFile() {
    const file = await window.api.backupRead()
    if (!file) return
    try {
      const data = JSON.parse(file.content)
      await applyBackupPayload(data, restoreMode)
      localStorage.setItem('finance-seeded-v2', 'true')
      toast('Datos restaurados', `Desde: ${file.path.split(/[/\\]/).pop()}`, 'success')
      window.location.reload()
    } catch {
      toast('Error al restaurar', 'Archivo inválido', 'error')
    }
  }

  async function handleRestoreFromHistory(entry: BackupEntry) {
    try {
      const text = await window.api.backupReadPath(entry.path)
      if (!text) throw new Error('No se pudo leer el archivo')
      const data = JSON.parse(text)
      await applyBackupPayload(data, restoreMode)
      localStorage.setItem('finance-seeded-v2', 'true')
      toast('Datos restaurados', `Desde: ${entry.label}`, 'success')
      window.location.reload()
    } catch {
      toast('Error al restaurar', 'No se pudo leer el archivo', 'error')
    }
  }

  async function handleExport() {
    try {
      const blob = new Blob([JSON.stringify(await buildBackupPayload(), null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Datos exportados', 'Backup guardado correctamente', 'success')
    } catch {
      toast('Error al exportar', '', 'error')
    }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)

        await applyBackupPayload(data, 'replace')

        localStorage.setItem('finance-seeded-v2', 'true')
        toast('Datos importados', `${data.transactions?.length || 0} transacciones restauradas`, 'success')
        window.location.reload()
      } catch {
        toast('Error al importar', 'Archivo inválido', 'error')
      }
    }
    input.click()
  }

  async function handleReset() {
    await Promise.all([
      db.transactions.clear(),
      db.budgets.clear(),
      db.categories.clear(),
      db.accounts.clear(),
      db.goals.clear()
    ])
    clearSeedFlag()
    localStorage.removeItem('finance-onboarding-done')
    toast('Datos restablecidos', 'La app se recargará', 'success')
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="min-h-full flex flex-col">
      <motion.div
        variants={item}
        className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-stretch flex-1"
      >
        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl h-full">
          <nav className="p-2 flex flex-col gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  active === section.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                {section.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="shadow-none hover:shadow-none border border-border/50 bg-card/60 rounded-2xl h-full">
          <div className="px-6 py-5 flex flex-col min-h-0">
            {active === 'apariencia' && (
              <div>
                <Row label="Tema" description="Paleta de colores de la interfaz">
                  <div className="flex gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        aria-pressed={theme === t.id}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                          theme === t.id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        <span className="flex gap-1">
                          <span
                            className="w-3.5 h-3.5 rounded-sm ring-1 ring-border"
                            style={{ backgroundColor: t.swatch.dark[0] }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-sm ring-1 ring-border"
                            style={{ backgroundColor: t.swatch.dark[1] }}
                          />
                        </span>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Modo" description="Oscuro o claro">
                  <Segmented
                    ariaLabel="Modo"
                    options={MODES}
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                  />
                </Row>
              </div>
            )}

            {active === 'regional' && (
              <div>
                <Row label="Moneda" description="Se usa en todos los importes">
                  <div className="w-56">
                    <Select
                      options={currencyOptions}
                      value={currency}
                      onChange={(v) => setCurrency(v as CurrencyCode)}
                      searchable={false}
                    />
                  </div>
                </Row>
                <Row label="Vista previa" description="Así se verán los montos">
                  <span className="text-sm font-medium num">{formatCurrency(123456, currency)}</span>
                </Row>
                <Row label="Regional" description="Configuración regional de la aplicación">
                  <span className="text-xs text-muted-foreground">Moneda y formato local</span>
                </Row>
              </div>
            )}

            {active === 'datos' && (
              <div>
                <Row label="Exportar" description="Guarda una copia de tus datos en un archivo JSON">
                  <Button variant="outline" onClick={handleExport} className="gap-2">
                    <Download className="w-4 h-4" /> Exportar
                  </Button>
                </Row>
                <Row label="Importar" description="Restaura desde un archivo JSON, reemplazando los datos actuales">
                  <Button variant="outline" onClick={handleImport} className="gap-2">
                    <Upload className="w-4 h-4" /> Importar
                  </Button>
                </Row>
                <Row label="Respaldos automáticos" description="Programa exportaciones periódicas">
                  <div className="w-48">
                    <Select
                      options={intervalOptions}
                      value={interval}
                      onChange={(v) => setInterval(v as BackupInterval)}
                      searchable={false}
                    />
                  </div>
                </Row>
                <Row label="Carpeta de destino" description={backupPath || 'Sin seleccionar'}>
                  <Button variant="outline" onClick={handleChooseFolder} className="gap-2">
                    <Folder className="w-4 h-4" /> Elegir
                  </Button>
                </Row>
                <Row
                  label="Último respaldo"
                  description={
                    interval === 'never'
                      ? 'Los respaldos automáticos están desactivados'
                      : lastBackup
                        ? new Date(lastBackup).toLocaleDateString('es-MX', { dateStyle: 'long' })
                        : 'Aún no se ha realizado ningún respaldo'
                  }
                >
                  <div className="flex gap-2">
                    <Button onClick={handleAutoExport} disabled={!backupPath} className="gap-2">
                      <Download className="w-4 h-4" /> Ahora
                    </Button>
                    <Button variant="outline" onClick={() => setShowRestore(true)} className="gap-2">
                      <History className="w-4 h-4" /> Historial
                    </Button>
                  </div>
                </Row>
                <Row label="Restablecer" description="Elimina todos tus datos de forma irreversible">
                  <Button
                    variant="outline"
                    onClick={() => setShowReset(true)}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-4 h-4" /> Restablecer
                  </Button>
                </Row>
              </div>
            )}

            {active === 'ia' && (
              <div>
                <Row
                  label="Activado"
                  description={
                    aiConfig.enabled
                      ? 'Disponible en el botón flotante'
                      : 'Actívalo para usar el chat con IA'
                  }
                >
                  <Switch
                    ariaLabel="Activar asistente"
                    checked={aiConfig.enabled}
                    onChange={(v) => setAiConfig({ enabled: v })}
                  />
                </Row>

                {aiConfig.enabled && (
                  <>
                    <Row label="Proveedor" description="Motor local (Ollama), OpenAI o Token Harbor">
                      <div className="w-48">
                        <Select
                          options={aiProviderOptions}
                          value={aiConfig.provider}
                          onChange={(v) =>
                            setAiConfig({
                              provider: v as AiProvider,
                              apiKey: v === 'ollama' ? '' : aiConfig.apiKey,
                              model: PROVIDER_DEFAULT_MODELS[v as AiProvider]
                            })
                          }
                          searchable={false}
                        />
                      </div>
                    </Row>

                    {aiConfig.provider !== 'ollama' && (
                      <>
                        <Row
                          label="API Key"
                          description={
                            aiConfig.provider === 'tokenharbor'
                              ? 'Se guarda localmente y solo se usa para llamar a Token Harbor'
                              : 'Se guarda localmente y solo se usa para llamar a OpenAI'
                          }
                        >
                          <div className="w-64">
                            <Input
                              type="password"
                              placeholder={aiConfig.provider === 'tokenharbor' ? 'thk_live_...' : 'sk-...'}
                              value={aiConfig.apiKey}
                              onChange={(e) => setAiConfig({ apiKey: e.target.value })}
                            />
                          </div>
                        </Row>

                        <Row
                          label="Modelo"
                          description={
                            aiConfig.provider === 'tokenharbor'
                              ? 'Id del catálogo de Token Harbor, por ejemplo tokenharbor/qwen3-max'
                              : 'Modelo de OpenAI, por ejemplo gpt-4o-mini'
                          }
                        >
                          <div className="w-64">
                            <Input
                              value={aiConfig.model}
                              placeholder={PROVIDER_DEFAULT_MODELS[aiConfig.provider]}
                              onChange={(e) => setAiConfig({ model: e.target.value })}
                            />
                          </div>
                        </Row>
                      </>
                    )}

                    {aiConfig.provider === 'tokenharbor' && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
                        <p>
                          1. Crea tu API key en{' '}
                          <a href="https://tokenharbor.ai/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            tokenharbor.ai/dashboard
                          </a>{' '}
                          (formato <span className="font-mono text-xs">thk_live_...</span>)
                        </p>
                        <p>
                          2. Elige el modelo en el{' '}
                          <a href="https://tokenharbor.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            catálogo
                          </a>{' '}
                          y pega su id en «Modelo»
                        </p>
                        <p>
                          3. La API es compatible con OpenAI en{' '}
                          <span className="font-mono text-xs">https://tokenharbor.ai/v1</span>
                        </p>
                      </div>
                    )}

                    {aiConfig.provider === 'ollama' && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
                        <p>
                          1.{' '}
                          <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Instala Ollama
                          </a>
                        </p>
                        <p>2. Abre tu terminal y ejecuta:</p>
                        <pre className="bg-background rounded-md px-3 py-2 text-xs font-mono">
                          ollama pull llama3.2:3b
                        </pre>
                        <p>3. Inicia Ollama y recarga la aplicación</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <Dialog open={showRestore} onClose={() => setShowRestore(false)} title="Restaurar respaldo" description="Selecciona un respaldo para restaurar">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={restoreMode === 'replace' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRestoreMode('replace')}
              className="flex-1"
            >
              Reemplazar
            </Button>
            <Button
              variant={restoreMode === 'merge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRestoreMode('merge')}
              className="flex-1"
            >
              Combinar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {restoreMode === 'replace'
              ? 'Borra todos los datos actuales antes de importar'
              : 'Agrega los datos del respaldo sin eliminar los existentes'}
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Historial de respaldos</p>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin respaldos registrados</p>
            ) : (
              history.map((entry) => (
                <div key={entry.path} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.path}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleRestoreFromHistory(entry)}>
                      Restaurar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeBackup(entry.path)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2 border-t border-border">
              <Button variant="outline" onClick={handleRestoreFromFile} className="w-full gap-2">
                <Upload className="w-4 h-4" /> Restaurar desde archivo...
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleReset}
        title="Restablecer todos los datos"
        description="Se eliminarán todas tus transacciones, presupuestos, categorías y cuentas. Esta acción es irreversible."
        confirmLabel="Restablecer"
        variant="destructive"
      />
    </motion.div>
  )
}

const sections = [
  { id: 'apariencia', label: 'Apariencia', icon: Palette },
  { id: 'regional', label: 'Regional', icon: Globe },
  { id: 'datos', label: 'Datos', icon: Download },
  { id: 'ia', label: 'Asistente IA', icon: Bot }
] as const

type SectionId = (typeof sections)[number]['id']

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border first:pt-0">
      <div className="min-w-0 flex flex-col">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="shrink-0 self-start">{children}</div>
    </div>
  )
}
