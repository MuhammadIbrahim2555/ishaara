/**
 * Normalises text for multilingual OCR matching (Urdu and English).
 * Applies NFKC, lowercase, Arabic diacritic removal, Urdu/Arabic variant unification,
 * whitespace collapsing, and punctuation stripping.
 */
export function normalise(s: string): string {
  if (!s) return ''
  return (
    s
      .normalize('NFKC')
      .toLowerCase()
      // Strip Arabic diacritics (fathatan to sukun, dagger alif)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Unify Urdu / Arabic letter variants
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[هةۃ]/g, 'ہ')
      // Strip punctuation while preserving letter/number characters and converting punctuation to space
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Splits normalised text into individual word tokens.
 */
export function tokens(s: string): string[] {
  if (!s) return []
  return s.trim().split(/\s+/).filter(Boolean)
}

/**
 * Checks whether a phrase is present in normalised haystack text on token boundaries.
 * Prevents false positives like 'pin' matching inside 'shopping'.
 */
export function containsPhrase(haystackNorm: string, phrase: string): boolean {
  const pTokens = tokens(normalise(phrase))
  if (pTokens.length === 0) return false
  const hTokens = tokens(haystackNorm)
  if (hTokens.length < pTokens.length) return false

  for (let i = 0; i <= hTokens.length - pTokens.length; i++) {
    let match = true
    for (let j = 0; j < pTokens.length; j++) {
      if (hTokens[i + j] !== pTokens[j]) {
        match = false
        break
      }
    }
    if (match) return true
  }
  return false
}
