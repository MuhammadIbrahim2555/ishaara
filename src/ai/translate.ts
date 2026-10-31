import type { TranslateService } from '@/types/contracts'
import { UI_DICTIONARY } from '@/data/uiDictionary'

export interface TranslateWorker {
  translate(text: string): Promise<string | null>
}

export interface TranslateModels {
  worker?: TranslateWorker
}

/**
 * Creates the translation service.
 * Priority: Cache -> Dictionary (whole text) -> Dictionary (word-by-word) -> Worker Opus-MT -> Original text.
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

      // Check whole text match in dictionary (case-insensitive)
      const lower = trimmed.toLowerCase()
      if (UI_DICTIONARY[lower]) {
        const result = UI_DICTIONARY[lower]
        cache.set(text, result)
        return result
      }

      // Word-by-word match: split text by whitespace into words
      const words = trimmed.split(/\s+/).filter(Boolean)
      if (words.length > 0) {
        const translatedWords: string[] = []
        let allMatched = true
        for (const word of words) {
          const match = UI_DICTIONARY[word.toLowerCase()]
          if (match) {
            translatedWords.push(match)
          } else {
            allMatched = false
            break
          }
        }
        if (allMatched && translatedWords.length === words.length) {
          const result = translatedWords.join(' ')
          cache.set(text, result)
          return result
        }
      }

      // Fall back to worker translation if provided
      if (models?.worker?.translate) {
        try {
          const translated = await models.worker.translate(text)
          if (translated !== null && translated !== undefined) {
            cache.set(text, translated)
            return translated
          }
        } catch {
          // Worker threw or failed: proceed to fallback
        }
      }

      // Fall back to original text
      cache.set(text, text)
      return text
    },
  }
}
