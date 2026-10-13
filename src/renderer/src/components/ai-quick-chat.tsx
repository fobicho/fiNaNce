import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { useAiStore } from '../stores/ai-store'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TypewriterText, TypingDots } from './chat-typing'

/** Evento global que abre o cierra el chat rápido (Ctrl+Espacio). */
export const QUICK_CHAT_EVENT = 'toggle-quick-ai'

const EDGE = 12
const HEADER_HEIGHT = 56
const MAX_LIST_HEIGHT = 420

/**
 * Chat de IA reducido: solo el campo de escritura y el botón de enviar.
 * Aparece con el cursor en el centro exacto del campo y los mensajes crecen
 * hacia arriba o hacia abajo según el espacio que quede en pantalla.
 */
export function AiQuickChat() {
  const messages = useAiStore((s) => s.messages)
  const processing = useAiStore((s) => s.processing)
  const config = useAiStore((s) => s.config)
  const pendingAction = useAiStore((s) => s.pendingAction)
  const sendMessage = useAiStore((s) => s.sendMessage)
  const confirmPendingAction = useAiStore((s) => s.confirmPendingAction)
  const cancelPendingAction = useAiStore((s) => s.cancelPendingAction)

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [placement, setPlacement] = useState<'up' | 'down'>('up')
  const [listHeight, setListHeight] = useState(MAX_LIST_HEIGHT)
  const [offsetX, setOffsetX] = useState(0)
  const [typingIndex, setTypingIndex] = useState<number | null>(null)
  const prevProcessing = useRef(processing)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Guarda la última posición del mouse para colocar el campo justo encima.
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    function toggle() {
      setCursor(pointerRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 })
      setOpen((value) => !value)
    }
    window.addEventListener(QUICK_CHAT_EVENT, toggle)
    return () => window.removeEventListener(QUICK_CHAT_EVENT, toggle)
  }, [])

  useEffect(() => {
    if (!open) return
    setInput('')
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (prevProcessing.current && !processing) {
      const last = messages.length - 1
      if (last >= 0 && messages[last].role === 'assistant') setTypingIndex(last)
    }
    prevProcessing.current = processing
  }, [processing, messages])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, processing, open, placement])

  // El campo queda fijo sobre el cursor; solo la lista se mueve, según el espacio real disponible.
  useLayoutEffect(() => {
    if (!open) return

    function measure() {
      const form = formRef.current
      if (!form) return
      const rect = form.getBoundingClientRect()
      const spaceAbove = Math.max(0, rect.top - HEADER_HEIGHT - EDGE)
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - EDGE)
      const needed = MAX_LIST_HEIGHT
      // Arriba por defecto (como un chat); abajo cuando los mensajes no caben arriba y hay más sitio abajo.
      const useUp = needed <= spaceAbove || spaceAbove >= spaceBelow
      const space = useUp ? spaceAbove : spaceBelow
      setPlacement(useUp ? 'up' : 'down')
      // La lista nunca excede el espacio real: se recorta y hace scroll si hace falta.
      setListHeight(Math.min(MAX_LIST_HEIGHT, space))

      const desiredLeft = cursor.x - rect.width / 2
      const maxLeft = Math.max(EDGE, window.innerWidth - rect.width - EDGE)
      const clampedLeft = Math.min(Math.max(desiredLeft, EDGE), maxLeft)
      setOffsetX(clampedLeft - desiredLeft)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, cursor.x, cursor.y, messages.length, processing])

  async function handleSubmit() {
    const text = input.trim()
    if (!text || processing || !config.enabled || pendingAction) return
    setInput('')
    await sendMessage(text)
  }

  const hasConversation = messages.length > 0 || processing

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="quick-chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-[90] pointer-events-none"
        >
          <div
            data-testid="quick-chat-backdrop"
            className="absolute inset-0 pointer-events-auto"
            onMouseDown={() => setOpen(false)}
          />

          <div
            data-testid="quick-chat-anchor"
            className="absolute pointer-events-none"
            style={{ left: cursor.x + offsetX, top: cursor.y, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              role="dialog"
              aria-label="Chat rápido de IA"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative w-[min(28rem,90vw)] select-text"
            >
              {hasConversation && (
                <motion.div
                  ref={listRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  data-placement={placement}
                  data-testid="quick-chat-messages"
                  style={{ maxHeight: listHeight }}
                  className={cn(
                    'pointer-events-auto absolute left-0 right-0 overflow-y-auto space-y-3 p-2',
                    'border border-border/60 bg-card/90 shadow-2xl',
                    placement === 'up'
                      ? 'bottom-full rounded-t-2xl border-b-0'
                      : 'top-full rounded-b-2xl border-t-0'
                  )}
                >
                  {messages.map((msg, i) => {
                    if (msg.toolCall) return null
                    return (
                      <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[85%] rounded-xl px-3.5 py-2 text-sm',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : msg.role === 'tool'
                                ? 'bg-muted text-muted-foreground text-xs font-mono'
                                : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="whitespace-pre-wrap">
                            {i === typingIndex ? (
                              <TypewriterText text={msg.content} onDone={() => setTypingIndex(null)} />
                            ) : (
                              msg.content
                            )}
                          </p>
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
                </motion.div>
              )}

              <form
                ref={formRef}
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
                className={cn(
                  'pointer-events-auto flex items-center gap-2 p-2',
                  'border border-border/60 bg-card shadow-2xl',
                  hasConversation
                    ? placement === 'up'
                      ? 'rounded-b-2xl border-t-0'
                      : 'rounded-t-2xl border-b-0'
                    : 'rounded-2xl'
                )}
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={config.enabled ? 'Escribe un mensaje...' : 'Activa la IA en Ajustes'}
                  disabled={!config.enabled || processing || !!pendingAction}
                  aria-label="Mensaje para el asistente"
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Enviar mensaje"
                  disabled={!input.trim() || !config.enabled || processing || !!pendingAction}
                  className="shrink-0 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
