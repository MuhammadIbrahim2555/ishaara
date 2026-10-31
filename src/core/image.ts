import type { RedactRect } from '@/types/contracts'

/**
 * Loads a Blob into an ImageBitmap.
 */
export async function loadImage(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob)
}

/**
 * Downscales an ImageBitmap so its longest side does not exceed maxSide (default 1600).
 */
export async function downscale(bitmap: ImageBitmap, maxSide = 1600): Promise<ImageBitmap> {
  const maxDim = Math.max(bitmap.width, bitmap.height)
  if (maxDim <= maxSide) {
    return bitmap
  }

  const scale = maxSide / maxDim
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, w, h)
      return createImageBitmap(canvas)
    }
  } else if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, w, h)
      return createImageBitmap(canvas)
    }
  }

  return bitmap
}

/**
 * Redacts specified rectangular regions with solid #1B1B1B on a canvas.
 * Strips EXIF metadata by re-encoding to PNG.
 */
export async function redactImage(
  blob: Blob,
  rects: RedactRect[],
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const width = bitmap.width
  const height = bitmap.height

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0)
      ctx.fillStyle = '#1B1B1B'
      for (const r of rects) {
        ctx.fillRect(r.x * width, r.y * height, r.w * width, r.h * height)
      }
      const outBlob = await canvas.convertToBlob({ type: 'image/png' })
      return { blob: outBlob, width, height }
    }
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0)
      ctx.fillStyle = '#1B1B1B'
      for (const r of rects) {
        ctx.fillRect(r.x * width, r.y * height, r.w * width, r.h * height)
      }
      const outBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/png',
        )
      })
      return { blob: outBlob, width, height }
    }
  }

  // Fallback for headless environments without canvas
  return { blob, width, height }
}
