import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, cn, generateId } from './utils'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })
})

describe('formatCurrency', () => {
  it('prefixes the symbol for peso currencies with no decimals', () => {
    expect(formatCurrency(1234.56)).toBe('$1.235')
    expect(formatCurrency(1234.56, 'CLP')).toBe('$1.235')
    expect(formatCurrency(1234.56, 'COP')).toBe('$1.235')
  })

  it('suffixes the symbol for USD and keeps two decimals', () => {
    expect(formatCurrency(99.99, 'USD')).toBe('99,99$')
    expect(formatCurrency(1234.56, 'USD')).toBe('1.234,56$')
  })

  it('suffixes the euro sign', () => {
    expect(formatCurrency(99.99, 'EUR')).toBe('99,99€')
  })

  it('keeps the sign out of the formatted number', () => {
    expect(formatCurrency(-1234.56, 'CLP')).toBe('$1.235')
  })
})

describe('formatDate', () => {
  it('formats date in es-MX locale', () => {
    const d = new Date(2026, 5, 15)
    const result = formatDate(d)
    expect(result).toContain('jun')
  })
})

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
