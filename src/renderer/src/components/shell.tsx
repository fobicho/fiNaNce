import { useLocation } from 'react-router-dom'
import { ErrorBoundary } from './error-boundary'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-3 flex flex-col [scrollbar-gutter:stable] [overflow-anchor:none]">
          <ErrorBoundary resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
