import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Sparkles, Trash2, ChevronDown } from 'lucide-react'
import { useAiStore } from '../stores/ai-store'
import { useThemeStore } from '../stores/theme-store'
import { SIDEBAR_WIDTH, SIDEBAR_ACTION_BUTTON } from '../lib/sidebar-width'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TypewriterText, TypingDots } from './chat-typing'
import { QUICK_CHAT_EVENT } from './ai-quick-chat'

export function AiChat() {
  const { messages, processing, config, pendingAction, sendMessage, confirmPendingAction, cancelPendingAction, clearMessages } = useAiStore()
  const sidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typingIndex, setTypingIndex] = useState<number | null>(null)
  const prevProcessing = useRef(processing)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const size = sidebarCollapsed ? SIDEBAR_ACTION_BUTTON.collapsed : SIDEBAR_ACTION_BUTTON.expanded
  const iconClass = cn(
    'transition-[width,height] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]',
    sidebarCollapsed ? 'w-2.5 h-2.5' : 'w-4 h-4'
  )

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    function close() {
      setOpen(false)
    }
    window.addEventListener(QUICK_CHAT_EVENT, close)
    return () => window.removeEventListener(QUICK_CHAT_EVENT, close)
  }, [])


  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (prevProcessing.current && !processing) {
      const last = messages.length - 1
      if (last >= 0 && messages[last].role === 'assistant') setTypingIndex(last)
    }
    prevProcessing.current = processing
  }, [processing, messages])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleSubmit() {
    const text = input.trim()
    if (!text || processing || pendingAction) return
    setInput('')
    await sendMessage(text)
  }

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente IA'}
        title={open ? 'Cerrar asistente' : 'Asistente IA'}
        animate={{ width: size.width, height: size.height }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {open ? <X className={iconClass} /> : <Bot className={iconClass} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            ref={panelRef}
            className="fixed bottom-6 z-50 w-[380px] max-w-[calc(100vw-15rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden select-text transition-[left] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ left: SIDEBAR_WIDTH.collapsed + (sidebarCollapsed ? 12 : 24) }}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm font-medium">NaNbot</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={clearMessages}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Limpiar conversación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">¿En qué puedo ayudarte?</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-[250px]">
                    Puedes agregar transacciones, consultar tu resumen financiero, buscar gastos y más.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => {
                if (msg.toolCall) return null
                return (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : msg.role === 'tool'
                            ? 'bg-muted/50 text-muted-foreground text-xs font-mono'
                            : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.role === 'tool' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {i === typingIndex ? (
                            <TypewriterText text={msg.content} onDone={() => setTypingIndex(null)} />
                          ) : (
                            msg.content
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {pendingAction && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl px-3.5 py-3 text-sm bg-muted text-foreground border border-border/60">
                    <p className="font-medium">¿Confirmas esta acción?</p>
                    <p className="text-xs text-muted-foreground mt-1">{pendingAction.description}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => confirmPendingAction()}>Sí</Button>
                      <Button size="sm" variant="outline" onClick={() => cancelPendingAction()}>No</Button>
                    </div>
                  </div>
                </div>
              )}
              {processing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3.5 py-2 text-sm flex items-center">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-muted/20">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={config.enabled ? 'Escribe un mensaje...' : 'Activa la IA en Ajustes'}
                  disabled={!config.enabled || processing || !!pendingAction}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || !config.enabled || processing || !!pendingAction}
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
