import type { OcrResult, ScreenMap } from '@/types/contracts'
import { containsPhrase, normalise } from './text'

/**
 * Matches an OCR result against a set of screen maps.
 * Score equals the number of match.any phrases found.
 * A screen is rejected if any match.none phrase is present or score < minHits.
 * Highest score wins, with ties resolved by map order.
 */
export function matchScreen(
  ocr: OcrResult,
  maps: ScreenMap[],
): { map: ScreenMap; score: number } | null {
  const text = ocr.fullText || ocr.words.map((w) => w.text).join(' ')
  const norm = normalise(text)
  if (!norm) return null

  let best: { map: ScreenMap; score: number } | null = null

  for (const map of maps) {
    // Check match.none exclusions
    if (map.match.none && map.match.none.length > 0) {
      const hasExcluded = map.match.none.some((phrase) => containsPhrase(norm, phrase))
      if (hasExcluded) {
        continue
      }
    }

    // Count score from match.any
    let score = 0
    for (const phrase of map.match.any) {
      if (containsPhrase(norm, phrase)) {
        score++
      }
    }

    // Check minHits requirement
    if (score < map.match.minHits) {
      continue
    }

    // Highest score wins; ties keep the earlier map
    if (!best || score > best.score) {
      best = { map, score }
    }
  }

  return best
}
