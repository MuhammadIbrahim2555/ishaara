import type { OcrResult, SafetyReason } from '@/types/contracts'
import { containsPhrase, normalise } from './text'

export const OTP_KEYWORDS = [
  'otp',
  'one time password',
  'one-time',
  'verification code',
  'او ٹی پی',
] as const

export const PIN_KEYWORDS = ['pin', 'mpin', 'm-pin', 'پن', 'ایم پن'] as const

export const PASSWORD_KEYWORDS = ['password', 'passcode', 'پاس ورڈ'] as const

export const CARD_KEYWORDS = ['cvv', 'card number', 'کارڈ نمبر'] as const

/**
 * Detects sensitive financial or authentication content (OTP, PIN, Password, Card)
 * in OCR results to trigger an immediate calm safety stop.
 */
export function detectSensitive(ocr: OcrResult): { reason: SafetyReason; matched: string } | null {
  const text = ocr.fullText || ocr.words.map((w) => w.text).join(' ')
  const norm = normalise(text)
  if (!norm) return null

  for (const kw of OTP_KEYWORDS) {
    if (containsPhrase(norm, kw)) {
      return { reason: 'otp', matched: kw }
    }
  }

  for (const kw of PIN_KEYWORDS) {
    if (containsPhrase(norm, kw)) {
      return { reason: 'pin', matched: kw }
    }
  }

  for (const kw of PASSWORD_KEYWORDS) {
    if (containsPhrase(norm, kw)) {
      return { reason: 'password', matched: kw }
    }
  }

  for (const kw of CARD_KEYWORDS) {
    if (containsPhrase(norm, kw)) {
      return { reason: 'card', matched: kw }
    }
  }

  return null
}
