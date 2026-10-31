import type { Box, MapStep, OcrResult, Target } from '@/types/contracts'
import { normalise, tokens } from './text'

/**
 * Computes the minimum bounding box enclosing all provided boxes.
 */
export function unionBox(boxes: Box[]): Box {
  if (boxes.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 }
  }
  const minX = Math.min(...boxes.map((b) => b.x))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxX = Math.max(...boxes.map((b) => b.x + b.w))
  const maxY = Math.max(...boxes.map((b) => b.y + b.h))
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  }
}

/**
 * Expands a box by a padding margin on all sides.
 */
export function padBox(b: Box, pad: number): Box {
  return {
    x: b.x - pad,
    y: b.y - pad,
    w: b.w + pad * 2,
    h: b.h + pad * 2,
  }
}

/**
 * Clamps a normalised bounding box so x, y and (x+w, y+h) stay within [0, 1].
 */
export function clampBox(b: Box): Box {
  const x = Math.max(0, Math.min(1, b.x))
  const y = Math.max(0, Math.min(1, b.y))
  const right = Math.max(x, Math.min(1, b.x + b.w))
  const bottom = Math.max(y, Math.min(1, b.y + b.h))
  return {
    x,
    y,
    w: Math.max(0, right - x),
    h: Math.max(0, bottom - y),
  }
}

/**
 * Resolves the interactive screen target for a map step given OCR word detections.
 * 1. Checks anchor.text for consecutive word matches.
 * 2. Falls back to anchor.fallback coordinate.
 * 3. Falls back to screen centre (0.5, 0.5).
 */
export function resolveTarget(step: MapStep, ocr: OcrResult): Target {
  // (1) anchor.text search
  if (step.anchor.text && step.anchor.text.length > 0) {
    for (const phrase of step.anchor.text) {
      const pTokens = tokens(normalise(phrase))
      if (pTokens.length === 0) continue

      for (let i = 0; i <= ocr.words.length - pTokens.length; i++) {
        let match = true
        for (let j = 0; j < pTokens.length; j++) {
          const wordToken = normalise(ocr.words[i + j].text)
          if (wordToken !== pTokens[j]) {
            match = false
            break
          }
        }

        if (match) {
          const matchedWords = ocr.words.slice(i, i + pTokens.length)
          const rawBox = unionBox(matchedWords.map((w) => w.box))
          const padded = padBox(rawBox, 0.01)
          const box = clampBox(padded)

          return {
            box,
            source: 'map-text',
            confidence: 0.95,
            label: phrase,
          }
        }
      }
    }
  }

  // (2) anchor.fallback
  if (step.anchor.fallback) {
    const [cx, cy] = step.anchor.fallback
    const box = clampBox({
      x: cx - 0.14 / 2,
      y: cy - 0.07 / 2,
      w: 0.14,
      h: 0.07,
    })

    return {
      box,
      source: 'map-fallback',
      confidence: 0.7,
      label: step.labelEn,
    }
  }

  // (3) Default screen centre
  const box = clampBox({
    x: 0.5 - 0.14 / 2,
    y: 0.5 - 0.07 / 2,
    w: 0.14,
    h: 0.07,
  })

  return {
    box,
    source: 'map-fallback',
    confidence: 0.2,
    label: step.labelEn,
  }
}
