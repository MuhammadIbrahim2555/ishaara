import type { TranslateService } from '@/types/contracts'
import { UI_DICTIONARY } from '@/data/uiDictionary'

export interface TranslateWorker {
  translate(text: string): Promise<string | null>
}

export interface TranslateModels {
  worker?: TranslateWorker
}

function dictionaryLookup(key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(UI_DICTIONARY, key)
    ? UI_DICTIONARY[key]
    : undefined
}

/**
 * Creates the translation service.
 * Priority: Cache -> Dictionary (whole phrase) -> Dictionary (word-by-word)
 *           -> local Opus-MT model via worker -> original text.
 * Dictionary hits are instant and need no model.
 */
export function createTranslate(models?: TranslateModels): TranslateService {
  const cache = new Map<string, string>()

  return {
    async toUrdu(text: string): Promise<string> {
      if (cache.has(text)) {
        return cache.get(text)!
      }

      const trimmed = text.trim()
      if (!trimmed) {
        return ''
      }

      // Whole phrase match (case-insensitive)
      const whole = dictionaryLookup(trimmed.toLowerCase())
      if (whole) {
        cache.set(text, whole)
        return whole
      }

      // Word-by-word: every word must be in the dictionary
      const words = trimmed.split(/\s+/).filter(Boolean)
      const translatedWords: string[] = []
      let allMatched = words.length > 0
      for (const word of words) {
        const match = dictionaryLookup(word.toLowerCase())
        if (!match) {
          allMatched = false
          break
        }
        translatedWords.push(match)
      }
      if (allMatched) {
        const result = translatedWords.join(' ')
        cache.set(text, result)
        return result
      }

      // Opus-MT model (local). Null or a thrown error falls back to the original text.
      if (models?.worker?.translate) {
        try {
          const translated = await models.worker.translate(text)
          if (translated !== null && translated !== undefined) {
            cache.set(text, translated)
            return translated
          }
        } catch {
          // Worker failed: the worker already emitted status 'error'
        }
      }

      cache.set(text, text)
      return text
    },
  }
}
