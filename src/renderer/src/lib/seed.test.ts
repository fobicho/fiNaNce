import { describe, it, expect, beforeEach } from 'vitest'
import { seedRan, clearSeedFlag } from './seed'

describe('seed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seedRan returns false initially', () => {
    expect(seedRan()).toBe(false)
  })

  it('seedRan returns true after flag is set', () => {
    localStorage.setItem('finance-seeded-v2', 'true')
    expect(seedRan()).toBe(true)
  })

  it('clearSeedFlag removes the flag', () => {
    localStorage.setItem('finance-seeded-v2', 'true')
    clearSeedFlag()
    expect(seedRan()).toBe(false)
  })
})
