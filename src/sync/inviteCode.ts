export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generates an 8-character invite code using crypto.getRandomValues
 * from the unambiguous 32-character alphabet.
 */
export function newInviteCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length]
  }
  return code
}

/**
 * Normalises an input code: uppercase, strips whitespace and dashes,
 * validates against the alphabet and exact length (8 chars).
 * Returns null if any invalid character is present or length != 8.
 */
export function normaliseCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '')
  if (cleaned.length !== 8) {
    return null
  }
  for (const ch of cleaned) {
    if (!INVITE_ALPHABET.includes(ch)) {
      return null
    }
  }
  return cleaned
}

/**
 * Formats an 8-character invite code into ABCD-EFGH presentation.
 */
export function formatCode(code: string): string {
  const clean = code.replace(/[\s-]/g, '').toUpperCase()
  if (clean.length <= 4) {
    return clean
  }
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
}
