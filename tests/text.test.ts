import { describe, expect, it } from 'vitest'
import { containsPhrase, normalise, tokens } from '@/core/text'

describe('text normalisation and matching', () => {
  it('normalises NFKC and lowercases', () => {
    expect(normalise('HELLO World')).toBe('hello world')
    expect(normalise('CAMERA')).toBe('camera')
  })

  it('strips Arabic diacritics', () => {
    // Fatha, damma, kasra, shadda, sukun, dagger alif
    const textWithHarakat = 'مُحَمَّدٌ'
    expect(normalise(textWithHarakat)).toBe('محمد')
  })

  it('unifies Urdu/Arabic variants', () => {
    // ي / ى -> ی
    expect(normalise('علي')).toBe('علی')
    expect(normalise('مصطفى')).toBe('مصطفی')
    // ك -> ک
    expect(normalise('كتاب')).toBe('کتاب')
    // ه / ة -> ہ
    expect(normalise('مدینة')).toBe('مدینہ')
    expect(normalise('شہر')).toBe('شہر')
  })

  it('collapses whitespace and strips punctuation', () => {
    expect(normalise('  hello,   world!  -- test. ')).toBe('hello world test')
    expect(normalise('پیغام، لکھیں!')).toBe('پیغام لکھیں')
  })

  it('matches phrases on token boundaries only (pin vs shopping)', () => {
    const haystack = normalise('I am shopping for a new pin')
    expect(containsPhrase(haystack, 'pin')).toBe(true)
    expect(containsPhrase(normalise('I went shopping today'), 'pin')).toBe(false)
    expect(containsPhrase(normalise('my spin is fast'), 'pin')).toBe(false)
  })

  it('matches multi-word phrases across tokens', () => {
    const haystack = normalise('Please type a message here')
    expect(containsPhrase(haystack, 'type a message')).toBe(true)
    expect(containsPhrase(haystack, 'message here')).toBe(true)
    expect(containsPhrase(haystack, 'type here')).toBe(false)
  })

  it('handles tokens extraction', () => {
    expect(tokens('  a  b   c ')).toEqual(['a', 'b', 'c'])
    expect(tokens('')).toEqual([])
  })
})
