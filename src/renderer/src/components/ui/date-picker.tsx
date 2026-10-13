import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

interface DatePickerProps {
  value?: Date
  onChange: (date: Date) => void
  className?: string
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value || new Date())
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropdownHeight = 380
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)),
      width: 320,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 })
    })
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  function handleClick() {
    if (!open) {
      updatePosition()
    }
    setOpen(!open)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length % 7 !== 0) days.push(null)

  const isSelected = (day: number) =>
    value &&
    value.getDate() === day &&
    value.getMonth() === month &&
    value.getFullYear() === year

  const isToday = (day: number) => {
    const now = new Date()
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm transition-all duration-200 hover:border-muted-foreground/30"
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span>
          {value
            ? value.toLocaleDateString('es-MX', { dateStyle: 'medium' })
            : 'Seleccionar fecha'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={dropdownStyle}
            className="rounded-xl border border-border bg-card shadow-xl p-5 h-[360px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS.map((d) => (
                <span key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 flex-1 content-start">
              {days.map((day, i) =>
                day ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const d = new Date(year, month, day)
                      onChange(d)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-9 h-9 rounded-lg text-sm transition-colors',
                      isSelected(day)
                        ? 'bg-primary text-primary-foreground font-medium'
                        : isToday(day)
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'hover:bg-accent text-foreground'
                    )}
                  >
                    {day}
                  </button>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
