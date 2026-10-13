import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AiChat } from './ai-chat'
import { useAiStore } from '../stores/ai-store'
import { useThemeStore } from '../stores/theme-store'
import type { AiConfig } from '../lib/ai/types'

const config: AiConfig = {
  provider: 'ollama',
  apiKey: '',
  model: 'llama3.2:3b',
  modelDownloaded: false,
  downloading: false,
  downloadProgress: 0,
  enabled: true
}

describe('AiChat', () => {
  beforeEach(() => {
    useAiStore.setState({
      messages: [],
      processing: false,
      pendingAction: null,
      config,
      sendMessage: vi.fn(async () => undefined)
    })
    useThemeStore.setState({ sidebarCollapsed: false })
  })

  it('se abre con su botón y se cierra al presionar fuera', async () => {
    render(<AiChat />)
    fireEvent.click(screen.getByLabelText('Abrir asistente IA'))
    expect(screen.getByText('NaNbot')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    await waitFor(() => expect(screen.queryByText('NaNbot')).not.toBeInTheDocument())
  })

  it('no se cierra al presionar dentro del panel', () => {
    render(<AiChat />)
    fireEvent.click(screen.getByLabelText('Abrir asistente IA'))

    fireEvent.mouseDown(screen.getByPlaceholderText('Escribe un mensaje...'))

    expect(screen.getByText('NaNbot')).toBeInTheDocument()
  })

  it('cambia de tamaño al colapsar y expandir la sidebar', async () => {
    render(<AiChat />)
    const button = screen.getByLabelText('Abrir asistente IA')
    await waitFor(() => expect(button.style.width).toBe('90px'))

    act(() => useThemeStore.setState({ sidebarCollapsed: true }))
    await waitFor(() => expect(button.style.width).toBe('20px'))

    act(() => useThemeStore.setState({ sidebarCollapsed: false }))
    await waitFor(() => expect(button.style.width).toBe('90px'))
  })

  it('muestra botones Sí/No cuando hay una acción pendiente', () => {
    const confirm = vi.fn(async () => undefined)
    const cancel = vi.fn()
    useAiStore.setState({
      pendingAction: {
        toolCall: { name: 'addCategory', args: { name: 'Viajes' } },
        description: 'Crear la categoría "Viajes"'
      },
      confirmPendingAction: confirm,
      cancelPendingAction: cancel
    })

    render(<AiChat />)
    fireEvent.click(screen.getByLabelText('Abrir asistente IA'))

    expect(screen.getByText('¿Confirmas esta acción?')).toBeInTheDocument()
    expect(screen.getByText('Crear la categoría "Viajes"')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(confirm).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(cancel).toHaveBeenCalled()
  })

  it('no se cierra al presionar su propio botón, que alterna', async () => {
    render(<AiChat />)
    fireEvent.click(screen.getByLabelText('Abrir asistente IA'))

    fireEvent.mouseDown(screen.getByLabelText('Cerrar asistente'))
    expect(screen.getByText('NaNbot')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Cerrar asistente'))
    await waitFor(() => expect(screen.queryByText('NaNbot')).not.toBeInTheDocument())
  })
})
