import { motion, useReducedMotion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowRightLeft, PiggyBank, Tags,
  Settings, ChevronsRight, Landmark, Repeat, Target, BarChart3
} from 'lucide-react'
import { cn } from '../lib/utils'
import { warmRoute, type RoutePath } from '../lib/routes'
import { SIDEBAR_WIDTH } from '../lib/sidebar-width'
import { useThemeStore } from '../stores/theme-store'
import { HelpButton } from './help-button'
import { AiChat } from './ai-chat'

const navItems: { to: RoutePath; icon: React.ElementType; label: string }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowRightLeft, label: 'Transacciones' },
  { to: '/recurring', icon: Repeat, label: 'Recurrentes' },
  { to: '/accounts', icon: Landmark, label: 'Cuentas' },
  { to: '/budgets', icon: PiggyBank, label: 'Presupuestos' },
  { to: '/categories', icon: Tags, label: 'Categorías' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/settings', icon: Settings, label: 'Ajustes' }
]

const LOGO_REPEAT = 5

function LogoSequence({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <span aria-hidden={ariaHidden || undefined} className="inline-flex shrink-0">
      {Array.from({ length: LOGO_REPEAT }).map((_, i) => (
        <span key={i} className="inline-flex shrink-0 items-center">
          <span>NaN</span>
          <span className="mx-3 opacity-50">·</span>
        </span>
      ))}
    </span>
  )
}

export function Sidebar() {
  const sidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar)
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <aside
      style={{ width: sidebarCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
      className="h-screen shrink-0 flex flex-col border-r border-border bg-sidebar overflow-hidden transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]"
    >
      <div className="h-14 border-b border-border shrink-0 relative overflow-hidden">
        <span
          className="absolute top-1/2 font-bold tracking-tight leading-none whitespace-nowrap select-none text-foreground text-5xl transition-[left,transform] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            left: sidebarCollapsed ? '50%' : 12,
            transform: sidebarCollapsed ? 'translate(-50%, -50%) scale(0.5)' : 'translateY(-50%) scale(1)'
          }}
        >
          {sidebarCollapsed ? (
            'NaN'
          ) : (
            <motion.span
              className="inline-flex"
              animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 10 }}
            >
              <LogoSequence />
              <LogoSequence ariaHidden />
            </motion.span>
          )}
        </span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => warmRoute(item.to)}
              onFocus={() => warmRoute(item.to)}
            >
              <div
                className={cn(
                  'flex items-center gap-3 px-[14px] py-2.5 rounded-lg text-sm font-medium relative',
                  'transition-[color,background-color] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]',
                  isActive
                    ? 'text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-sidebar-accent" />
                )}
                <item.icon className="w-5 h-5 shrink-0 relative z-10" />
                <span
                  className={cn(
                    'relative z-10 whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]',
                    sidebarCollapsed ? 'max-w-0 opacity-0 translate-x-2' : 'max-w-[160px] opacity-100 translate-x-0'
                  )}
                >
                  {item.label}
                </span>
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div className="shrink-0 flex items-center justify-center py-2 px-3 gap-1">
        <HelpButton />
        <AiChat />
      </div>

      <div className="shrink-0 p-3 border-t border-border">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
          className="flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronsRight
            className="w-4 h-4 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          />
        </motion.button>
      </div>
    </aside>
  )
}