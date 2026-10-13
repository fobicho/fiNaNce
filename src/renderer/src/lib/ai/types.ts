export type AiProvider = 'ollama' | 'openai' | 'tokenharbor'

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCall?: AiToolCall
  toolResult?: string
}

export interface AiToolCall {
  name: string
  args: Record<string, unknown>
}

export interface AiToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  requiresConfirmation?: boolean
  describe?: (args: Record<string, unknown>) => string
  execute: (args: Record<string, unknown>) => Promise<string>
}

export interface AiPendingAction {
  toolCall: AiToolCall
  description: string
}

export interface AiConfig {
  provider: AiProvider
  apiKey: string
  model: string
  modelDownloaded: boolean
  downloading: boolean
  downloadProgress: number
  enabled: boolean
}

export interface AiChatRequest {
  messages: AiMessage[]
  provider: AiProvider
  model: string
  apiKey?: string
}

export interface AiChatResponse {
  content: string
  toolCall?: AiToolCall
}
