import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAiStore } from './ai-store'
import { useFinanceStore } from './finance-store'
import type { AiConfig } from '../lib/ai/types'

const config: AiConfig = {
  provider: 'tokenharbor',
  apiKey: 'thk_test',
  model: 'tokenharbor/qwen3-max',
  modelDownloaded: false,
  downloading: false,
  downloadProgress: 0,
  enabled: true
}

function toolCallResponse(name: string, args: Record<string, unknown>) {
  const content = JSON.stringify({ _tool: name, _args: args })
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) }
}

function textResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) }
}

describe('ai-store · confirmación de acciones', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useAiStore.setState({ messages: [], processing: false, pendingAction: null, config })
    useFinanceStore.setState({ transactions: [], budgets: [], categories: [], accounts: [], goals: [] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pausa y pide confirmación en lugar de ejecutar la acción', async () => {
    fetchMock.mockResolvedValue(toolCallResponse('addCategory', { name: 'Viajes' }))

    await useAiStore.getState().sendMessage('crea la categoría Viajes')

    const state = useAiStore.getState()
    expect(state.pendingAction).not.toBeNull()
    expect(state.pendingAction?.toolCall.name).toBe('addCategory')
    expect(state.pendingAction?.description).toContain('Viajes')
    expect(state.processing).toBe(false)
    expect(useFinanceStore.getState().categories).toHaveLength(0)
  })

  it('ejecuta la acción cuando el usuario confirma', async () => {
    fetchMock.mockResolvedValue(toolCallResponse('addCategory', { name: 'Viajes' }))
    await useAiStore.getState().sendMessage('crea la categoría Viajes')

    await useAiStore.getState().confirmPendingAction()

    expect(useAiStore.getState().pendingAction).toBeNull()
    expect(useFinanceStore.getState().categories.some((c) => c.name === 'Viajes')).toBe(true)
    expect(useAiStore.getState().messages.at(-1)?.role).toBe('tool')
  })

  it('no ejecuta nada cuando el usuario cancela', async () => {
    fetchMock.mockResolvedValue(toolCallResponse('addCategory', { name: 'Viajes' }))
    await useAiStore.getState().sendMessage('crea la categoría Viajes')

    useAiStore.getState().cancelPendingAction()

    expect(useAiStore.getState().pendingAction).toBeNull()
    expect(useFinanceStore.getState().categories).toHaveLength(0)
    expect(useAiStore.getState().messages.at(-1)?.content).toMatch(/cancelada/i)
  })

  it('no pide confirmación para herramientas de solo lectura', async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse('getSummary', {}))
      .mockResolvedValueOnce(textResponse('Listo'))

    await useAiStore.getState().sendMessage('¿cómo van mis finanzas?')

    expect(useAiStore.getState().pendingAction).toBeNull()
  })
})
