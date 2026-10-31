import phrasesJson from './phrases.json'
import phrasesEnJson from './phrases.en.json'

/**
 * Fixed UI phrases with stable IDs and Urdu text for spoken voice output and UI prompts.
 */
export const PHRASES: Record<string, string> = phrasesJson
export const PHRASES_EN: Record<string, string> = phrasesEnJson

export type PhraseId = keyof typeof PHRASES

export function phraseText(id: string, lang: 'ur' | 'en'): string {
  if (lang === 'en') {
    return PHRASES_EN[id] || PHRASES[id] || id
  }
  return PHRASES[id] || id
}

