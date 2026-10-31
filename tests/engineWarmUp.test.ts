import { describe, expect, it, vi } from 'vitest'
import type { LoadProgress } from '@/types/contracts'
import { createEngine } from '@/core/engine'
import { createLibrary } from '@/core/library'

describe('engine.warmUp OCR', () => {
  const library = createLibrary()

  it('calls ocrInit instead of recognising a blank image when ocrInit is provided', async () => {
    const ocr = vi.fn(async () => {
      throw new Error('should not recognise')
    })
    const ocrInit = vi.fn(async () => {})
    const engine = createEngine({ ocr, ocrInit, library })
    const events: LoadProgress[] = []
    engine.onProgress((e) => events.push(e))

    await engine.warmUp(['ocr'])

    expect(ocrInit).toHaveBeenCalledTimes(1)
    expect(ocr).not.toHaveBeenCalled()
    expect(events.at(-1)).toMatchObject({ model: 'ocr', status: 'ready' })
    expect(events.some((e) => e.status === 'error')).toBe(false)
  })

  it('emits error when ocrInit fails', async () => {
    const engine = createEngine({
      ocr: async () => {
        throw new Error('unused')
      },
      ocrInit: async () => {
        throw new Error('worker failed')
      },
      library,
    })
    const events: LoadProgress[] = []
    engine.onProgress((e) => events.push(e))

    await engine.warmUp(['ocr'])

    expect(events.at(-1)).toMatchObject({ model: 'ocr', status: 'error', message: 'worker failed' })
  })

  it('falls back to a blank-blob recognise when ocrInit is absent', async () => {
    const ocr = vi.fn(async () => {
      throw new Error('blank image')
    })
    const engine = createEngine({ ocr, library })

    await engine.warmUp(['ocr'])

    expect(ocr).toHaveBeenCalledTimes(1)
  })
})
