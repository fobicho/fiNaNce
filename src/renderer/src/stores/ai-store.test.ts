import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAiStore, PROVIDER_DEFAULT_MODELS } from './ai-store'
import type { AiConfig } from '../lib/ai/types'

const tokenHarborConfig: AiConfig = {
  provider: 'tokenharbor',
  apiKey: 'thk_live_test',
  model: 'tokenharbor/qwen3-max',
  modelDownloaded: false,
  downloading: false,
  downloadProgress: 0,
  enabled: true
}

function okResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) }
}

describe('ai-store · Token Harbor', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useAiStore.setState({ messages: [], processing: false, config: tokenHarborConfig })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('llama al endpoint compatible con OpenAI de Token Harbor', async () => {
    fetchMock.mockResolvedValue(okResponse('Hola, ¿en qué te ayudo?'))

    await useAiStore.getState().sendMessage('hola')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://tokenharbor.ai/v1/chat/completions')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer thk_live_test')

    const body = JSON.parse(init.body)
    expect(body.model).toBe('tokenharbor/qwen3-max')
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[body.messages.length - 1]).toEqual({ role: 'user', content: 'hola' })

    expect(body.messages.filter((m: { role: string }) => m.role === 'user')).toHaveLength(1)

    const messages = useAiStore.getState().messages
    expect(messages[messages.length - 1]).toEqual({
      role: 'assistant',
      content: 'Hola, ¿en qué te ayudo?'
    })
    expect(useAiStore.getState().processing).toBe(false)
  })

  it('sin API key no llama a la red y avisa al usuario', async () => {
    useAiStore.setState({ config: { ...tokenHarborConfig, apiKey: '' } })

    await useAiStore.getState().sendMessage('hola')

    expect(fetchMock).not.toHaveBeenCalled()
    const messages = useAiStore.getState().messages
    expect(messages[messages.length - 1].content).toContain('API key de Token Harbor')
  })

  it('muestra el detalle del error del proveedor en lugar de inventar respuestas', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        '{"error":{"message":"Invalid or revoked API key. Rotate your key at https://tokenharbor.ai/dashboard.","code":"invalid_api_key"}}'
    })

    await useAiStore.getState().sendMessage('hola')

    const messages = useAiStore.getState().messages
    const last = messages[messages.length - 1].content
    expect(last.startsWith('❌')).toBe(true)
    expect(last).toContain('Token Harbor error 401')
    expect(last).toContain('Invalid or revoked API key')
    expect(useAiStore.getState().processing).toBe(false)
  })

  it('no reejecuta la misma herramienta si el modelo la vuelve a pedir', async () => {
    const toolCall = JSON.stringify({ _tool: 'navigate', _args: { page: 'cuentas' } })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: toolCall } }] })
    })

    const paths: string[] = []
    const listener = (e: Event) => paths.push((e as CustomEvent<string>).detail)
    window.addEventListener('ai-navigate', listener)

    await useAiStore.getState().sendMessage('llévame a cuentas')

    window.removeEventListener('ai-navigate', listener)

    const messages = useAiStore.getState().messages
    expect(paths).toEqual(['/accounts'])
    expect(useAiStore.getState().processing).toBe(false)
    expect(messages[messages.length - 1].role).toBe('assistant')
  })

  it('OpenAI sigue usando su endpoint y su modelo por defecto', async () => {
    useAiStore.setState({ config: { ...tokenHarborConfig, provider: 'openai', model: '' } })
    fetchMock.mockResolvedValue(okResponse('ok'))

    await useAiStore.getState().sendMessage('hola')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(JSON.parse(init.body).model).toBe(PROVIDER_DEFAULT_MODELS.openai)
  })
})
