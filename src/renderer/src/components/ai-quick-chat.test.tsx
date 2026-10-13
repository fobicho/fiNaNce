import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { AiQuickChat, QUICK_CHAT_EVENT } from './ai-quick-chat'
import { useAiStore } from '../stores/ai-store'
import type { AiConfig, AiMessage } from '../lib/ai/types'

const config: AiConfig = {
  provider: 'ollama',
  apiKey: '',
  model: 'llama3.2:3b',
  modelDownloaded: false,
  downloading: false,
  downloadProgress: 0,
  enabled: true
}

function openQuickChat() {
  act(() => {
    window.dispatchEvent(new Event(QUICK_CHAT_EVENT))
  })
}

function setMessages(messages: AiMessage[]) {
  useAiStore.setState({ messages })
}

let formRectSpy: { mockRestore: () => void } | null = null

function mockFormRect(top: number, height = 52) {
  const rect = {
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: 448,
    width: 448,
    height,
    toJSON: () => ({})
  } as DOMRect
  const original = Element.prototype.getBoundingClientRect
  formRectSpy = vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(
      (function (this: Element) {
        return this instanceof HTMLFormElement ? rect : original.call(this)
      }) as unknown as () => DOMRect
    )
}

describe('AiQuickChat', () => {
  const sendMessage = vi.fn(async () => undefined)

  beforeEach(() => {
    sendMessage.mockClear()
    useAiStore.setState({ messages: [], processing: false, config, sendMessage })
  })

  afterEach(() => {
    formRectSpy?.mockRestore()
    formRectSpy = null
  })

  it('permanece oculto hasta que se dispara el atajo', () => {
    render(<AiQuickChat />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openQuickChat()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('enfoca el campo al abrirse y ocupa solo un campo y un botón cuando no hay mensajes', () => {
    render(<AiQuickChat />)
    openQuickChat()

    const input = screen.getByLabelText('Mensaje para el asistente')
    expect(input).toHaveFocus()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('envía el mensaje escrito y limpia el campo', () => {
    render(<AiQuickChat />)
    openQuickChat()

    const input = screen.getByLabelText('Mensaje para el asistente') as HTMLInputElement
    fireEvent.change(input, { target: { value: '¿Cuánto gasté este mes?' } })
    fireEvent.click(screen.getByLabelText('Enviar mensaje'))

    expect(sendMessage).toHaveBeenCalledWith('¿Cuánto gasté este mes?')
    expect(input.value).toBe('')
  })

  it('muestra puntos animados mientras procesa y escribe la respuesta', async () => {
    render(<AiQuickChat />)
    openQuickChat()

    act(() => useAiStore.setState({ processing: true }))
    expect(screen.getByTestId('typing-dots')).toBeInTheDocument()
    expect(screen.queryByText('Pensando...')).not.toBeInTheDocument()

    act(() =>
      useAiStore.setState({
        messages: [
          { role: 'user', content: 'Hola' },
          { role: 'assistant', content: '¿En qué te ayudo?' }
        ],
        processing: false
      })
    )

    expect(screen.queryByText('¿En qué te ayudo?')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('¿En qué te ayudo?')).toBeInTheDocument())
  })

  it('no envía nada cuando el asistente está desactivado', () => {
    useAiStore.setState({ config: { ...config, enabled: false } })
    render(<AiQuickChat />)
    openQuickChat()

    const input = screen.getByLabelText('Mensaje para el asistente') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hola' } })

    expect(input).toBeDisabled()
    expect(screen.getByLabelText('Enviar mensaje')).toBeDisabled()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('muestra los mensajes de la conversación sobre el campo', () => {
    mockFormRect(window.innerHeight - 260)
    setMessages([
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: '¿En qué te ayudo?' }
    ])
    render(<AiQuickChat />)
    openQuickChat()

    expect(screen.getByText('Hola')).toBeInTheDocument()
    expect(screen.getByText('¿En qué te ayudo?')).toBeInTheDocument()
    expect(screen.getByTestId('quick-chat-messages')).toHaveAttribute('data-placement', 'up')
  })

  it('no muestra la burbuja de invocación de herramienta', () => {
    setMessages([
      { role: 'user', content: 'Crea una cuenta' },
      { role: 'assistant', content: '', toolCall: { name: 'addAccount', args: { name: 'Viaje' } } },
      { role: 'tool', content: '✅ Cuenta "Viaje" creada.' },
      { role: 'assistant', content: 'Listo.' }
    ])
    render(<AiQuickChat />)
    openQuickChat()

    expect(screen.queryByText(/Usando/)).not.toBeInTheDocument()
    expect(screen.getByText('✅ Cuenta "Viaje" creada.')).toBeInTheDocument()
    expect(screen.getByText('Listo.')).toBeInTheDocument()
  })

  it('decide el lado al abrir y no lo cambia cuando llega el mensaje', () => {
    mockFormRect(Math.round(window.innerHeight / 2) - 34)
    render(<AiQuickChat />)
    openQuickChat()

    act(() => setMessages([{ role: 'user', content: 'Hola' }]))
    expect(screen.getByTestId('quick-chat-messages')).toHaveAttribute('data-placement', 'down')

    act(() =>
      setMessages([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué te ayudo?' }
      ])
    )
    expect(screen.getByTestId('quick-chat-messages')).toHaveAttribute('data-placement', 'down')
  })

  it('mantiene el panel dentro de la ventana si el cursor está pegado al borde izquierdo', () => {
    mockFormRect(300)
    render(<AiQuickChat />)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 4, clientY: 300 }))
    })
    openQuickChat()

    const left = parseFloat(screen.getByTestId('quick-chat-anchor').style.left)
    expect(left - 448 / 2).toBeGreaterThanOrEqual(0)
    expect(left).toBeGreaterThan(4)
  })

  it('mantiene el panel dentro de la ventana si el cursor está pegado al borde derecho', () => {
    mockFormRect(300)
    render(<AiQuickChat />)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: window.innerWidth - 4, clientY: 300 }))
    })
    openQuickChat()

    const left = parseFloat(screen.getByTestId('quick-chat-anchor').style.left)
    expect(left + 448 / 2).toBeLessThanOrEqual(window.innerWidth)
    expect(left).toBeLessThan(window.innerWidth - 4)
  })

  it('recalcula el lado disponible al redimensionar la ventana', () => {
    setMessages([{ role: 'assistant', content: 'Listo' }])
    render(<AiQuickChat />)
    openQuickChat()

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const list = screen.getByTestId('quick-chat-messages')
    expect(list).toBeInTheDocument()
    expect(list.getAttribute('data-placement')).toMatch(/^(up|down)$/)
  })

  it('coloca el campo con el mouse justo en el centro', () => {
    render(<AiQuickChat />)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }))
    })
    openQuickChat()

    const anchor = screen.getByTestId('quick-chat-anchor')
    expect(anchor).toHaveStyle({ left: '400px', top: '300px' })
    expect(anchor.style.transform).toContain('-50%')
  })

  it('sin movimiento del mouse usa el centro de la ventana', () => {
    render(<AiQuickChat />)
    openQuickChat()

    const anchor = screen.getByTestId('quick-chat-anchor')
    expect(anchor).toHaveStyle({
      left: `${window.innerWidth / 2}px`,
      top: `${window.innerHeight / 2}px`
    })
  })

  it('se cierra al presionar fuera del campo', async () => {
    render(<AiQuickChat />)
    openQuickChat()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('quick-chat-backdrop'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('se cierra con Escape', async () => {
    render(<AiQuickChat />)
    openQuickChat()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('se alterna con el atajo', async () => {
    render(<AiQuickChat />)
    openQuickChat()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    openQuickChat()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
