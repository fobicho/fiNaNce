import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Input } from './input'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ElementType
  color?: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = true,
  className
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((o) => o.value === value)

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

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
    const dropdownHeight = 280
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
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
      setSearch('')
    }
    setOpen(!open)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center justify-between w-full h-10 px-3 rounded-lg border border-border bg-background text-sm transition-all duration-200 hover:border-muted-foreground/30',
          !selected && 'text-muted-foreground'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selected?.icon && (
            <selected.icon className="w-4 h-4 shrink-0" style={{ color: selected.color }} />
          )}
          {selected?.color && !selected.icon && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span className="truncate">{selected?.label || placeholder}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={dropdownStyle}
            className="rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {searchable && (
              <div className="p-2 pb-0">
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin resultados
                </p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors',
                      option.value === value
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/50'
                    )}
                  >
                    {option.icon && (
                      <option.icon className="w-4 h-4 shrink-0" style={{ color: option.color }} />
                    )}
                    {option.color && !option.icon && (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="flex-1 text-left">{option.label}</span>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
