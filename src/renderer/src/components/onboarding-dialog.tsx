import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, type SelectOption } from './ui/select'
import {
  ArrowRightLeft, PiggyBank, Landmark, Target, BarChart3, LayoutDashboard, ChevronRight, ChevronLeft, Bot, Sparkles
} from 'lucide-react'
import { useAiStore } from '../stores/ai-store'

const ONBOARDING_FLAG = 'finance-onboarding-done'

const steps = [
  {
    icon: LayoutDashboard,
    title: 'Bienvenido a FiNaNce',
    description: 'Tu asistente de finanzas personales. Lleva el control de tus ingresos, gastos y metas de ahorro en un solo lugar.',
    color: 'from-primary to-primary/60'
  },
  {
    icon: ArrowRightLeft,
    title: 'Transacciones',
    description: 'Registra todos tus ingresos y gastos. Agrégales categorías para mantener todo organizado.',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: PiggyBank,
    title: 'Presupuestos',
    description: 'Define límites de gasto por categoría cada mes. El sistema te avisará cuando te estés acercando al límite.',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: Target,
    title: 'Metas de Ahorro',
    description: 'Establece metas con fecha límite y da seguimiento a tu progreso.',
    color: 'from-pink-500 to-rose-600'
  },
  {
    icon: Landmark,
    title: 'Cuentas',
    description: 'Administra múltiples cuentas (efectivo, banco, crédito) y transfiere dinero entre ellas.',
    color: 'from-cyan-500 to-teal-600'
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Visualiza tus finanzas con gráficos por categoría y mes. Exporta tus datos cuando lo necesites.',
    color: 'from-amber-500 to-orange-600'
  }
]

const aiStepIcons = [Bot, Sparkles, Bot]

export function onboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_FLAG) === 'true'
}

export function dismissOnboarding(): void {
  localStorage.setItem(ONBOARDING_FLAG, 'true')
}

type AiPhase = 'prompt' | 'provider' | 'key' | 'done'

export function OnboardingDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [aiPhase, setAiPhase] = useState<AiPhase | null>(null)
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai'>('openai')
  const [tempKey, setTempKey] = useState('')
  const setAiConfig = useAiStore((s) => s.setConfig)
  const current = steps[step]

  const aiProviderOptions: SelectOption[] = [
    { value: 'openai', label: 'OpenAI (más rápido, requiere API key)' },
    { value: 'ollama', label: 'Local con Ollama (gratis, requiere instalación)' }
  ]

  function handleFinish() {
    dismissOnboarding()
    onClose()
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      setAiPhase('prompt')
    }
  }

  function handleSkipAi() {
    handleFinish()
  }

  function handleSetupAi() {
    setAiPhase('provider')
  }

  function handleProviderNext() {
    if (aiProvider === 'openai') {
      setAiPhase('key')
    } else {
      setAiConfig({ provider: 'ollama', enabled: true })
      handleFinish()
    }
  }

  function handleKeyDone() {
    if (tempKey.trim()) {
      setAiConfig({ provider: 'openai', apiKey: tempKey.trim(), enabled: true })
    }
    handleFinish()
  }

  const aiColors = ['from-primary to-primary/60', 'from-purple-500 to-violet-600', 'from-purple-500 to-violet-600']

  if (aiPhase && aiPhase !== 'done') {
    const phaseIndex = aiPhase === 'prompt' ? 0 : aiPhase === 'provider' ? 1 : 2
    const Icon = aiStepIcons[phaseIndex]
    const color = aiColors[phaseIndex]

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto shadow-lg`}>
                <Icon className="w-10 h-10 text-white" />
              </div>

              {aiPhase === 'prompt' && (
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight">¿Asistente con IA?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Puedes activar un asistente inteligente para agregar transacciones con lenguaje natural, consultar tus finanzas y más.
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Los datos se procesan de forma segura. Tú eliges entre OpenAI (cloud) o un modelo local.
                  </p>
                </div>
              )}

              {aiPhase === 'provider' && (
                <div className="space-y-2 text-left">
                  <h2 className="text-xl font-semibold tracking-tight text-center">Elige un proveedor</h2>
                  <div className="pt-3">
                    <Select
                      options={aiProviderOptions}
                      value={aiProvider}
                      onChange={(v) => setAiProvider(v as 'ollama' | 'openai')}
                    />
                  </div>
                  {aiProvider === 'ollama' && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5 mt-3">
                      <p>1. <span className="text-foreground font-medium">Instala Ollama</span> desde ollama.com</p>
                      <p>2. Ejecuta en tu terminal:</p>
                      <pre className="bg-background rounded px-2.5 py-1.5 font-mono">ollama pull llama3.2:3b</pre>
                      <p>3. Inicia Ollama y la IA funcionará automáticamente</p>
                    </div>
                  )}
                </div>
              )}

              {aiPhase === 'key' && (
                <div className="space-y-2 text-left">
                  <h2 className="text-xl font-semibold tracking-tight text-center">API Key de OpenAI</h2>
                  <div className="pt-3">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Tu API key se guarda solo en tu dispositivo. Consíguela en <span className="text-primary">platform.openai.com/api-keys</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 pb-6">
              <div>
                {aiPhase === 'prompt' ? (
                  <Button variant="ghost" size="sm" onClick={() => { setAiPhase(null); setStep(steps.length - 1) }} className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Volver
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setAiPhase('prompt')} className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {aiPhase === 'prompt' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSkipAi}>Ahora no</Button>
                    <Button size="sm" onClick={handleSetupAi} className="gap-1">
                      Configurar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {aiPhase === 'provider' && (
                  <Button size="sm" onClick={handleProviderNext} className="gap-1">
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {aiPhase === 'key' && (
                  <Button size="sm" onClick={handleKeyDone}>Activar IA</Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center mx-auto shadow-lg`}>
                <current.icon className="w-10 h-10 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between px-6 pb-6">
              <div>
                {step > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                ) : <div />}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleFinish}>
                  Saltar
                </Button>
                <Button size="sm" onClick={handleNext} className="gap-1">
                  {step < steps.length - 1 ? (
                    <>Siguiente <ChevronRight className="w-4 h-4" /></>
                  ) : 'Comenzar'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
