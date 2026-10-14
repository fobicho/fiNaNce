import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Bell, Minus, Square, Copy, X } from 'lucide-react'
import { useThemeStore } from '../stores/theme-store'
import { useNotificationStore } from '../stores/notification-store'
import { Button } from './ui/button'

export function Header() {
  const mode = useThemeStore((s) => s.mode)
  const toggleMode = useThemeStore((s) => s.toggleMode)
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAllRead } = useNotificationStore()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="h-14 border-b border-border flex items-center px-6 bg-background [-webkit-app-region:drag]">
      <div className="flex items-center gap-2 ml-auto [-webkit-app-region:no-drag]">
        <div className="relative" ref={notifRef}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="relative" onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAllRead() }}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </motion.div>
          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground">Notificaciones</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Sin notificaciones
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 text-sm ${n.read ? '' : 'bg-accent/50'}`}>
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowNotifs(false)}>
                    Cerrar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" onClick={toggleMode}>
            <motion.div
              initial={false}
              animate={{ rotate: mode === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {mode === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </motion.div>
          </Button>
        </motion.div>

        <WindowControls />

      </div>
    </header>
  )
}

function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let active = true
    window.api.windowIsMaximized().then((v) => {
      if (active) setMaximized(v)
    })
    const unsubscribe = window.api.onWindowMaximizedChange(setMaximized)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const btn =
    'grid h-14 w-12 place-items-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

  return (
    <div className="flex h-14 -mr-6">
      <button type="button" className={btn} aria-label="Minimizar" onClick={() => window.api.windowMinimize()}>
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label={maximized ? 'Restaurar' : 'Maximizar'}
        onClick={() => window.api.windowToggleMaximize()}
      >
        {maximized ? <Copy className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>
      <button
        type="button"
        className={`${btn} hover:bg-destructive hover:text-destructive-foreground active:bg-destructive/90`}
        aria-label="Cerrar"
        onClick={() => window.api.windowClose()}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
