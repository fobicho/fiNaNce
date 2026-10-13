import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiMessage, AiProvider, AiConfig, AiPendingAction } from '../lib/ai/types'
export type { AiProvider }
import { executeToolCall, TOOL_DEFINITIONS } from '../lib/ai/tools'
import { buildSystemPrompt } from '../lib/ai/prompt'

interface AiState {
  config: AiConfig
  messages: AiMessage[]
  processing: boolean
  pendingAction: AiPendingAction | null
  setConfig: (config: Partial<AiConfig>) => void
  sendMessage: (content: string) => Promise<void>
  confirmPendingAction: () => Promise<void>
  cancelPendingAction: () => void
  clearMessages: () => void
  appendMessage: (msg: AiMessage) => void
}

/** Modelo por defecto de cada proveedor. */
export const PROVIDER_DEFAULT_MODELS: Record<AiProvider, string> = {
  ollama: 'llama3.2:3b',
  openai: 'gpt-4o-mini',
  tokenharbor: 'tokenharbor/qwen3-max'
}

/** Base compatible con OpenAI de Token Harbor (https://tokenharbor.ai/docs/api/curl). */
const TOKEN_HARBOR_BASE_URL = 'https://tokenharbor.ai/v1'

function toolSignature(toolCall: { name: string; args: Record<string, unknown> }): string {
  const args = toolCall.args || {}
  const keys = Object.keys(args).sort()
  return `${toolCall.name}|${keys.map((k) => `${k}=${JSON.stringify(args[k])}`).join('&')}`
}

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      config: {
        provider: 'ollama',
        apiKey: '',
        model: PROVIDER_DEFAULT_MODELS.ollama,
        modelDownloaded: false,
        downloading: false,
        downloadProgress: 0,
        enabled: false
      },
      messages: [],
      processing: false,
      pendingAction: null,

      setConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...partial }
        })),

      appendMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearMessages: () => set({ messages: [], pendingAction: null }),

      confirmPendingAction: async () => {
        const pending = get().pendingAction
        if (!pending) return
        set({ pendingAction: null, processing: true })
        const result = await executeToolCall(pending.toolCall)
        set((state) => ({
          messages: [...state.messages, { role: 'tool', content: result, toolResult: result }],
          processing: false
        }))
      },

      cancelPendingAction: () =>
        set((state) => ({
          messages: [
            ...state.messages,
            { role: 'assistant', content: 'Acción cancelada. No se realizó ningún cambio.' }
          ],
          pendingAction: null
        })),

      sendMessage: async (content) => {
        const { config } = get()
        if (!config.enabled) return
        if (config.provider !== 'ollama' && !config.apiKey) {
          const providerName = config.provider === 'tokenharbor' ? 'Token Harbor' : 'OpenAI'
          set((state) => ({
            messages: [...state.messages, { role: 'user', content }, { role: 'assistant', content: `❌ No hay API key de ${providerName} configurada. Ve a Ajustes > Asistente IA para configurarla, o cambia al proveedor local (Ollama).` }]
          }))
          return
        }

        const userMsg: AiMessage = { role: 'user', content }
        set((state) => ({ messages: [...state.messages, userMsg], processing: true }))

        try {
          const fullMessages: AiMessage[] = [
            { role: 'system', content: buildSystemPrompt() },
            ...get().messages
          ]

        let attempts = 0
        const maxAttempts = 5
        let lastContent = ''
        const executed = new Set<string>()

        while (attempts < maxAttempts) {
          attempts++

          let response: { content: string; toolCall?: { name: string; args: Record<string, unknown> } }

          if (config.provider === 'openai') {
            response = await callOpenAI(fullMessages, config.apiKey, config.model)
          } else if (config.provider === 'tokenharbor') {
            response = await callTokenHarbor(fullMessages, config.apiKey, config.model)
          } else {
            response = await callOllama(fullMessages)
          }

          if (response.toolCall) {
            const toolCall = response.toolCall
            const signature = toolSignature(toolCall)
            if (executed.has(signature)) {
              set((state) => ({
                messages: [
                  ...state.messages,
                  { role: 'assistant', content: lastContent || 'La acción ya se había realizado.' }
                ],
                processing: false
              }))
              return
            }

            const definition = TOOL_DEFINITIONS.find((t) => t.name === toolCall.name)
            if (definition?.requiresConfirmation) {
              const args = toolCall.args || {}
              const pendingMsg: AiMessage = { role: 'assistant', content: '', toolCall }
              set((state) => ({
                messages: [...state.messages, pendingMsg],
                pendingAction: {
                  toolCall,
                  description: definition.describe ? definition.describe(args) : definition.description
                },
                processing: false
              }))
              return
            }

            executed.add(signature)

            const toolMsg: AiMessage = {
              role: 'assistant',
              content: '',
              toolCall
            }
            set((state) => ({ messages: [...state.messages, toolMsg] }))

            const result = await executeToolCall(toolCall)
            const resultMsg: AiMessage = {
              role: 'tool',
              content: result,
              toolResult: result
            }
            set((state) => ({ messages: [...state.messages, resultMsg] }))
            fullMessages.push(toolMsg, resultMsg)
            lastContent = result
          } else {
            const assistantMsg: AiMessage = { role: 'assistant', content: response.content }
            set((state) => ({ messages: [...state.messages, assistantMsg], processing: false }))
            return
          }
        }

          set((state) => ({
            messages: [...state.messages, { role: 'assistant', content: lastContent }],
            processing: false
          }))
        } catch (e) {
          let errorMsg = e instanceof Error ? e.message : 'Error de conexión'
          const isConnectionError =
            errorMsg.includes('Failed to fetch') ||
            errorMsg.includes('NetworkError') ||
            errorMsg.includes('ECONNREFUSED') ||
            errorMsg.includes('fetch failed')
          if (isConnectionError) {
            errorMsg =
              'No se pudo conectar con el asistente. Revisa tu conexión y la API key en Ajustes > Asistente IA (OpenAI o Token Harbor), o instala Ollama para usar un modelo local.'
          }
          set((state) => ({
            messages: [...state.messages, { role: 'assistant', content: `❌ ${errorMsg}` }],
            processing: false
          }))
        }
      }
    }),
    {
      name: 'finance-ai-store',
      partialize: (state) => ({
        config: { ...state.config, downloading: false, downloadProgress: 0 },
        messages: []
      })
    }
  )
)

async function callOpenAI(
  messages: AiMessage[],
  apiKey: string,
  model: string
): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
  return callChatCompletions(
    'https://api.openai.com/v1/chat/completions',
    'OpenAI',
    messages,
    apiKey,
    model || PROVIDER_DEFAULT_MODELS.openai
  )
}

/** Token Harbor expone el mismo esquema de Chat Completions que OpenAI. */
async function callTokenHarbor(
  messages: AiMessage[],
  apiKey: string,
  model: string
): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
  return callChatCompletions(
    `${TOKEN_HARBOR_BASE_URL}/chat/completions`,
    'Token Harbor',
    messages,
    apiKey,
    model || PROVIDER_DEFAULT_MODELS.tokenharbor
  )
}

async function callChatCompletions(
  url: string,
  providerLabel: string,
  messages: AiMessage[],
  apiKey: string,
  model: string
): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
  const mapped = messages.map((m) => ({
    role: m.role === 'tool' ? 'user' as const : m.role,
    content: m.toolResult ? `Resultado: ${m.toolResult}` : m.content
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: mapped, temperature: 0.3 })
  })

  if (!res.ok) {
    const err = await res.text()
    let detail = err
    try {
      const parsed = JSON.parse(err)
      detail = parsed?.error?.message || parsed?.error || parsed?.message || err
    } catch {
      // La API no devolvió JSON: se usa el texto tal cual.
    }
    throw new Error(`${providerLabel} error ${res.status}: ${detail}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return parseResponse(text)
}

async function callOllama(
  messages: AiMessage[]
): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
  const mapped = messages.map((m) => ({
    role: m.role === 'tool' ? 'user' as const : m.role,
    content: m.toolResult ? `Resultado de la operación: ${m.toolResult}\n\nContinúa con el usuario en español.` : m.content
  }))

  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2:3b', messages: mapped, stream: false, temperature: 0.3 })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.message?.content || ''
  return parseResponse(text)
}

function parseResponse(text: string): { content: string; toolCall?: { name: string; args: Record<string, unknown> } } {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed._tool) {
      return { content: '', toolCall: { name: parsed._tool, args: parsed._args || {} } }
    }
  } catch {}
  return { content: trimmed }
}
