import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { useThemeStore } from '../stores/theme-store'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar — logo NaN', () => {
  beforeEach(() => {
    useThemeStore.setState({ sidebarCollapsed: false })
  })

  it('muestra la banda cíclica "NaN ·" cuando la sidebar está expandida', () => {
    renderSidebar()

    expect(screen.getAllByText('NaN').length).toBeGreaterThan(1)
    expect(screen.getAllByText('·').length).toBeGreaterThan(1)
  })

  it('al colapsar muestra un solo logo "NaN"', () => {
    useThemeStore.setState({ sidebarCollapsed: true })
    renderSidebar()

    expect(screen.getAllByText('NaN')).toHaveLength(1)
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })
})
