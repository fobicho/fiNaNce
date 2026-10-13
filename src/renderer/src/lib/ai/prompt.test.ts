import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'

describe('buildSystemPrompt', () => {
  it('limita el asistente al ámbito de la app y las finanzas personales', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('## Ámbito')
    expect(prompt).toMatch(/fuera de ese ámbito/i)
    expect(prompt).toMatch(/no realices la tarea ajena/i)
    expect(prompt).toMatch(/solo atiendes consultas dentro del ámbito de la app/i)
  })
})
