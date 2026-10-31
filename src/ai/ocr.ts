import { createWorker, PSM, type Worker as TesseractWorker } from 'tesseract.js'
import type { Bbox, Block, LoggerMessage } from 'tesseract.js'
import type { Box, LoadProgress, OcrResult, OcrWord } from '@/types/contracts'

export type OcrFn = (img: Blob) => Promise<OcrResult>

export interface OcrClient {
  recognize: OcrFn
  init: () => Promise<void>
  terminate: () => void
}

const LANGS = ['eng', 'urd']
/** tesseract.js OEM.LSTM_ONLY. */
const OEM_LSTM_ONLY = 1
/** OCR input width range in px: small screenshots are upscaled, large ones downscaled. */
const MIN_OCR_WIDTH = 1100
const MAX_OCR_WIDTH = 1600
/** Luminance percentiles mapped to 0 and 255 by the contrast stretch. */
const CONTRAST_LOW = 0.05
const CONTRAST_HIGH = 0.95
/** Applied as v^(1/OCR_GAMMA): 0.8 darkens light-grey UI text. */
const OCR_GAMMA = 0.8
const MIN_CONFIDENCE = 30
const RECOGNIZE_TIMEOUT_MS = 60_000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1)
}

/** Converts a tesseract pixel bbox to a normalised box relative to the image size. */
function toBox(bbox: Bbox, width: number, height: number): Box {
  const x0 = clamp(bbox.x0, 0, width)
  const y0 = clamp(bbox.y0, 0, height)
  const x1 = clamp(bbox.x1, x0, width)
  const y1 = clamp(bbox.y1, y0, height)
  return {
    x: x0 / width,
    y: y0 / height,
    w: (x1 - x0) / width,
    h: (y1 - y0) / height,
  }
}

/** Flattens blocks -> paragraphs -> lines -> words, dropping low-confidence words. */
function flattenWords(blocks: Block[] | null | undefined, width: number, height: number): OcrWord[] {
  const words: OcrWord[] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = (word.text || '').trim()
          const confidence = word.confidence ?? 0
          if (!text || confidence < MIN_CONFIDENCE) continue
          words.push({ text, box: toBox(word.bbox, width, height), confidence })
        }
      }
    }
  }
  return words
}

/**
 * Grayscale, then stretch luminance so the 5th-95th percentile spans 0-255, then darken
 * with OCR_GAMMA (v^(1/OCR_GAMMA)). Works in place on RGBA pixels. No hard threshold,
 * so anti-aliased light-grey text keeps its shape.
 */
function enhanceForOcr(pixels: Uint8ClampedArray): void {
  const pixelCount = pixels.length / 4
  const luma = new Uint8ClampedArray(pixelCount)
  const histogram = new Uint32Array(256)
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4
    const y = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
    luma[p] = y
    histogram[y]++
  }
  const low = percentile(histogram, pixelCount, CONTRAST_LOW)
  const high = percentile(histogram, pixelCount, CONTRAST_HIGH)
  const span = high - low
  const lut = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    const t = span > 0 ? clamp01((v - low) / span) : v / 255
    lut[v] = Math.round(255 * Math.pow(t, 1 / OCR_GAMMA))
  }
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4
    const g = lut[luma[p]]
    pixels[i] = g
    pixels[i + 1] = g
    pixels[i + 2] = g
  }
}

/** Returns the first luminance value at which the cumulative share reaches `fraction`. */
function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction
  let seen = 0
  for (let v = 0; v < 256; v++) {
    seen += histogram[v]
    if (seen >= target) return v
  }
  return 255
}

/** Applies enhanceForOcr to a 2D canvas context in place. */
function enhanceContext(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const image = ctx.getImageData(0, 0, width, height)
  enhanceForOcr(image.data)
  ctx.putImageData(image, 0, 0)
}

/**
 * Draws the bitmap at the given size, enhances it for OCR and encodes it as PNG
 * (OffscreenCanvas, else a DOM canvas).
 */
async function renderForOcr(source: ImageBitmap, width: number, height: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)
    enhanceContext(ctx, width, height)
    return canvas.convertToBlob({ type: 'image/png' })
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  enhanceContext(ctx, width, height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas PNG encode failed'))),
      'image/png'
    )
  })
}

/**
 * Decodes the blob, resizes it so its width is within MIN_OCR_WIDTH..MAX_OCR_WIDTH
 * (aspect kept), enhances it for OCR and re-encodes it as PNG. The bitmap is always
 * closed. Boxes are normalised against the prepared size, so they match the original.
 * Original size is returned so the caller can report it.
 */
async function prepareImage(
  img: Blob
): Promise<{ blob: Blob; width: number; height: number; origWidth: number; origHeight: number }> {
  const bitmap = await createImageBitmap(img)
  try {
    const origWidth = bitmap.width
    const origHeight = bitmap.height
    if (origWidth < 1 || origHeight < 1) throw new Error('Image has no pixels')

    const width = clamp(origWidth, MIN_OCR_WIDTH, MAX_OCR_WIDTH)
    const height = Math.max(1, Math.round((origHeight * width) / origWidth))
    const blob = await renderForOcr(bitmap, width, height)
    return { blob, width, height, origWidth, origHeight }
  } finally {
    bitmap.close()
  }
}

function withTimeout<T>(task: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout()
      reject(new Error('ocr-timeout'))
    }, ms)
    task.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/**
 * Creates an OCR client that runs tesseract.js on the main thread.
 * Tesseract does the recognition inside its own Web Worker, so the UI stays responsive.
 * Emits LoadProgress lifecycle notifications for model 'ocr'.
 */
export function createOcrClient(onProgress?: (e: LoadProgress) => void): OcrClient {
  let workerPromise: Promise<TesseractWorker> | null = null

  function emit(e: Omit<LoadProgress, 'model'>): void {
    onProgress?.({ model: 'ocr', ...e })
  }

  function logger(m: LoggerMessage): void {
    // Covers 'loading language traineddata' and 'recognizing text' progress (0..1).
    emit({ status: 'downloading', progress: clamp01(m.progress), message: m.status })
  }

  function getWorker(): Promise<TesseractWorker> {
    if (!workerPromise) {
      // Sparse text (PSM 11) reads scattered UI labels better than the default paragraph mode.
      const created = createWorker(LANGS, OEM_LSTM_ONLY, { logger }).then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        })
        return worker
      })
      workerPromise = created
      // createWorker can stay pending forever on load failure, so drop the cache on rejection.
      created.catch(() => {
        if (workerPromise === created) workerPromise = null
      })
    }
    return workerPromise
  }

  /** Forgets the current tesseract worker so the next call creates a fresh one. */
  function resetWorker(): void {
    const pending = workerPromise
    workerPromise = null
    if (pending) {
      void pending.then((w) => w.terminate()).catch(() => {})
    }
  }

  async function runRecognition(img: Blob): Promise<OcrResult> {
    const worker = await getWorker()
    const prepared = await prepareImage(img)
    // Word-level output: blocks are flattened below; text is kept for fullText.
    const { data } = await worker.recognize(prepared.blob, {}, { text: true, blocks: true })
    return {
      words: flattenWords(data.blocks, prepared.width, prepared.height),
      fullText: data.text || '',
      width: prepared.origWidth,
      height: prepared.origHeight,
    }
  }

  return {
    async init(): Promise<void> {
      try {
        emit({ status: 'downloading', progress: 0.3, message: 'Loading OCR language models (eng, urd)...' })
        await getWorker()
        emit({ status: 'ready', progress: 1.0, message: 'OCR models ready' })
      } catch (err) {
        emit({ status: 'error', progress: 0, message: err instanceof Error ? err.message : String(err) })
        throw err
      }
    },

    async recognize(img: Blob): Promise<OcrResult> {
      emit({ status: 'downloading', progress: 0.6, message: 'Processing screenshot OCR...' })
      try {
        const result = await withTimeout(runRecognition(img), RECOGNIZE_TIMEOUT_MS, resetWorker)
        emit({ status: 'ready', progress: 1.0, message: 'OCR analysis complete' })
        return result
      } catch (err) {
        emit({ status: 'error', progress: 0, message: err instanceof Error ? err.message : String(err) })
        throw err
      }
    },

    terminate(): void {
      resetWorker()
    },
  }
}
