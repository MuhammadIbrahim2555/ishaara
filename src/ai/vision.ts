import type { Box, Target } from '@/types/contracts'

export interface VisionWorker {
  ground(
    img: Blob,
    phrase: string
  ): Promise<{ boxes: [number, number, number, number][]; width: number; height: number }>
}

export interface VisionModels {
  worker: VisionWorker
}

export type VisionFn = (
  img: Blob,
  phrase: string,
  near?: [number, number]
) => Promise<Target | null>

/**
 * Creates a vision grounding function backed by Florence-2.
 * Converts pixel boxes to normalized coordinates, filters out boxes exceeding
 * 40% area, selects the closest box to `near` (or first box), assigns confidence,
 * and handles all errors gracefully without throwing.
 */
export function createVision(models: VisionModels): VisionFn {
  return async (
    img: Blob,
    phrase: string,
    near?: [number, number]
  ): Promise<Target | null> => {
    try {
      const result = await models.worker.ground(img, phrase)
      const { boxes, width, height } = result

      if (width <= 0 || height <= 0 || !boxes || boxes.length === 0) {
        return null
      }

      // Convert each box from pixel coordinates [x0, y0, x1, y1] to normalized 0..1 Box
      const validBoxes: Box[] = []
      for (const [x0, y0, x1, y1] of boxes) {
        const x = Math.max(0, x0 / width)
        const y = Math.max(0, y0 / height)
        const w = Math.min(1 - x, (x1 - x0) / width)
        const h = Math.min(1 - y, (y1 - y0) / height)

        if (w <= 0 || h <= 0) {
          continue
        }

        // Drop any box larger than 40% of the image area
        if (w * h > 0.4) {
          continue
        }

        validBoxes.push({ x, y, w, h })
      }

      if (validBoxes.length === 0) {
        return null
      }

      let chosenBox: Box
      let confidence: number

      if (near) {
        const [targetX, targetY] = near
        let minDistance = Infinity
        let bestBox = validBoxes[0]

        for (const box of validBoxes) {
          const centerX = box.x + box.w / 2
          const centerY = box.y + box.h / 2
          const distance = Math.hypot(centerX - targetX, centerY - targetY)
          if (distance < minDistance) {
            minDistance = distance
            bestBox = box
          }
        }

        chosenBox = bestBox
        confidence = minDistance <= 0.2 ? 0.8 : 0.55
      } else {
        chosenBox = validBoxes[0]
        confidence = 0.6
      }

      return {
        box: chosenBox,
        source: 'vision',
        confidence,
        label: phrase,
      }
    } catch {
      return null
    }
  }
}
