import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useThemeStore } from '../stores/theme-store'
import { SIDEBAR_ACTION_BUTTON } from '../lib/sidebar-width'

const shortcuts = [
  { keys: ['Ctrl', 'N'], description: 'Nueva transacción' },
  { keys: ['Ctrl', 'F'], description: 'Buscar transacciones' },
  { keys: ['Ctrl', 'Espacio'], description: 'Chat rápido de IA' },
]

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const sidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed)
  const size = sidebarCollapsed ? SIDEBAR_ACTION_BUTTON.collapsed : SIDEBAR_ACTION_BUTTON.expanded

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Atajos de teclado"
        title="Atajos de teclado"
        animate={{ width: size.width, height: size.height, fontSize: sidebarCollapsed ? 9 : 14 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="grid place-items-center leading-none rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-bold"
      >
        <span className="leading-none">?</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-start justify-between p-6 pb-0">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Atajos de teclado</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comandos rápidos disponibles
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 pb-8 space-y-3">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
