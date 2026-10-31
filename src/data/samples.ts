export interface SampleScreen {
  id: string
  titleUr: string
  url: string
}

export const SAMPLE_SCREENS: SampleScreen[] = [
  { id: 'wa_chats', titleUr: 'چیٹس کی فہرست', url: '/samples/wa_chats.svg' },
  { id: 'wa_chat', titleUr: 'بات چیت', url: '/samples/wa_chat.svg' },
  { id: 'wa_photo_picker', titleUr: 'تصویر کا انتخاب', url: '/samples/wa_photo_picker.svg' },
  {
    id: 'wa_photo_preview',
    titleUr: 'تصویر دیکھیں اور بھیجیں',
    url: '/samples/wa_photo_preview.svg',
  },
]

/**
 * Loads an SVG sample file from its URL and rasterises it to PNG via canvas so OCR receives a bitmap.
 */
export async function loadSampleBlob(url: string): Promise<Blob> {
  const resp = await fetch(url)
  const svgText = await resp.text()

  if (
    typeof Image !== 'undefined' &&
    (typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined')
  ) {
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const blobUrl = URL.createObjectURL(svgBlob)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = (e) => reject(e)
        img.src = blobUrl
      })

      const w = img.naturalWidth || 390
      const h = img.naturalHeight || 844

      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          return await canvas.convertToBlob({ type: 'image/png' })
        }
      }

      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Canvas rasterize failed'))),
              'image/png',
            )
          })
        }
      }
    } catch {
      // In non-DOM test runners, fallback to svg blob
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }

  return new Blob([svgText], { type: 'image/png' })
}
