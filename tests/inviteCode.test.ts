import { describe, expect, it } from 'vitest'
import {
  INVITE_ALPHABET,
  formatCode,
  newInviteCode,
  normaliseCode,
} from '@/sync/inviteCode'

describe('inviteCode utilities', () => {
  it('generates an 8-character code from the defined alphabet', () => {
    const code = newInviteCode()
    expect(code).toHaveLength(8)
    for (const char of code) {
      expect(INVITE_ALPHABET.includes(char)).toBe(true)
    }
  })

  it('generates unique random codes on repeated calls', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 50; i++) {
      codes.add(newInviteCode())
    }
    expect(codes.size).toBe(50)
  })

  it('normalises codes with lowercase, whitespace, and hyphens', () => {
    expect(normaliseCode('abcd-efgh')).toBe('ABCDEFGH')
    expect(normaliseCode('  abcd   efgh  ')).toBe('ABCDEFGH')
    expect(normaliseCode('ab-cd-ef-gh')).toBe('ABCDEFGH')
  })

  it('rejects codes with invalid characters outside the alphabet', () => {
    // 0, 1, I, O are excluded from INVITE_ALPHABET
    expect(normaliseCode('ABCDEF01')).toBeNull()
    expect(normaliseCode('ABCDEFGI')).toBeNull()
    expect(normaliseCode('ABCDEFGO')).toBeNull()
    expect(normaliseCode('ABCD@FGH')).toBeNull()
  })

  it('rejects codes with incorrect lengths', () => {
    expect(normaliseCode('ABCDEFG')).toBeNull()
    expect(normaliseCode('ABCDEFGHI')).toBeNull()
    expect(normaliseCode('')).toBeNull()
  })

  it('formats codes with a hyphen separator ABCD-EFGH', () => {
    expect(formatCode('ABCDEFGH')).toBe('ABCD-EFGH')
    expect(formatCode('abcd-efgh')).toBe('ABCD-EFGH')
    expect(formatCode('abcd efgh')).toBe('ABCD-EFGH')
  })
})
