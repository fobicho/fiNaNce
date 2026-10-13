import { useEffect } from 'react'

type Shortcut = {
  key: string
  ctrl?: boolean
  shift?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()

        if (keyMatch && ctrlMatch && shiftMatch && !e.repeat) {
          e.preventDefault()
          s.handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
