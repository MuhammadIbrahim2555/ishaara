import { describe, expect, it } from 'vitest'
import type { OcrResult } from '@/types/contracts'
import {
  CARD_KEYWORDS,
  detectSensitive,
  OTP_KEYWORDS,
  PASSWORD_KEYWORDS,
  PIN_KEYWORDS,
} from '@/core/safety'

function makeOcr(fullText: string): OcrResult {
  return {
    fullText,
    words: fullText
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({
        text,
        box: { x: 0, y: 0, w: 0.1, h: 0.05 },
        confidence: 90,
      })),
    width: 390,
    height: 844,
  }
}

describe('safety keyword detection', () => {
  it('detects OTP keywords in English and Urdu', () => {
    expect(detectSensitive(makeOcr('Your one time password is 458921'))).toEqual({
      reason: 'otp',
      matched: 'one time password',
    })
    expect(detectSensitive(makeOcr('Enter your verification code'))).toEqual({
      reason: 'otp',
      matched: 'verification code',
    })
    expect(detectSensitive(makeOcr('آپ کا او ٹی پی 1234 ہے'))).toEqual({
      reason: 'otp',
      matched: 'او ٹی پی',
    })
  })

  it('detects PIN keywords including MPIN and Urdu', () => {
    expect(detectSensitive(makeOcr('Enter your 4 digit pin'))).toEqual({
      reason: 'pin',
      matched: 'pin',
    })
    expect(detectSensitive(makeOcr('JazzCash mpin enter karein'))).toEqual({
      reason: 'pin',
      matched: 'mpin',
    })
    expect(detectSensitive(makeOcr('اپنا پن کوڈ درج کریں'))).toEqual({
      reason: 'pin',
      matched: 'پن',
    })
  })

  it('detects Password keywords', () => {
    expect(detectSensitive(makeOcr('Enter your password to continue'))).toEqual({
      reason: 'password',
      matched: 'password',
    })
    expect(detectSensitive(makeOcr('اپنا پاس ورڈ لکھیں'))).toEqual({
      reason: 'password',
      matched: 'پاس ورڈ',
    })
  })

  it('detects Card / CVV keywords', () => {
    expect(detectSensitive(makeOcr('Please enter CVV on the back'))).toEqual({
      reason: 'card',
      matched: 'cvv',
    })
    expect(detectSensitive(makeOcr('کارڈ نمبر درج کریں'))).toEqual({
      reason: 'card',
      matched: 'کارڈ نمبر',
    })
  })

  it('does not trigger on safe ordinary text', () => {
    expect(detectSensitive(makeOcr('Chats Updates Communities Calls'))).toBeNull()
    expect(detectSensitive(makeOcr('Type a message'))).toBeNull()
    expect(detectSensitive(makeOcr('I am spinning around shopping'))).toBeNull()
  })

  it('exports all keyword lists as expected', () => {
    expect(OTP_KEYWORDS).toContain('otp')
    expect(PIN_KEYWORDS).toContain('pin')
    expect(PASSWORD_KEYWORDS).toContain('password')
    expect(CARD_KEYWORDS).toContain('cvv')
  })
})
