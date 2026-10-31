import { describe, expect, it } from 'vitest'
import type { MapStep, OcrResult } from '@/types/contracts'
import { clampBox, padBox, resolveTarget, unionBox } from '@/core/targets'

describe('target resolution and bounding box math', () => {
  it('unionBox computes bounding box of multiple boxes', () => {
    const b1 = { x: 0.1, y: 0.2, w: 0.1, h: 0.1 }
    const b2 = { x: 0.3, y: 0.4, w: 0.2, h: 0.2 }
    const union = unionBox([b1, b2])
    expect(union.x).toBeCloseTo(0.1)
    expect(union.y).toBeCloseTo(0.2)
    expect(union.w).toBeCloseTo(0.4) // max 0.5 - min 0.1 = 0.4
    expect(union.h).toBeCloseTo(0.4) // max 0.6 - min 0.2 = 0.4
  })

  it('padBox adds margin around a box', () => {
    const box = { x: 0.2, y: 0.2, w: 0.2, h: 0.2 }
    const padded = padBox(box, 0.01)
    expect(padded.x).toBeCloseTo(0.19)
    expect(padded.y).toBeCloseTo(0.19)
    expect(padded.w).toBeCloseTo(0.22)
    expect(padded.h).toBeCloseTo(0.22)
  })

  it('clampBox clamps boxes that spill beyond 0..1 edges', () => {
    const overflow = { x: -0.05, y: 0.95, w: 0.2, h: 0.2 }
    const clamped = clampBox(overflow)
    expect(clamped.x).toBe(0)
    expect(clamped.y).toBe(0.95)
    expect(clamped.w).toBeCloseTo(0.15)
    expect(clamped.h).toBeCloseTo(0.05)
  })

  it('resolves consecutive multi-word text anchor into a padded union box', () => {
    const step: MapStep = {
      anchor: { text: ['take photo', 'camera'] },
      voice: 'v.mp3',
      captionUr: 'تصویر لیں',
      whyUr: 'وجہ',
    }
    const ocr: OcrResult = {
      fullText: 'Please take photo now',
      words: [
        { text: 'Please', box: { x: 0.1, y: 0.1, w: 0.1, h: 0.05 }, confidence: 95 },
        { text: 'take', box: { x: 0.25, y: 0.1, w: 0.08, h: 0.05 }, confidence: 95 },
        { text: 'photo', box: { x: 0.34, y: 0.1, w: 0.08, h: 0.05 }, confidence: 95 },
        { text: 'now', box: { x: 0.45, y: 0.1, w: 0.05, h: 0.05 }, confidence: 95 },
      ],
      width: 1000,
      height: 1000,
    }

    const target = resolveTarget(step, ocr)
    expect(target.source).toBe('map-text')
    expect(target.confidence).toBe(0.95)
    expect(target.label).toBe('take photo')
    // Union of take [0.25, 0.1, 0.08, 0.05] (right 0.33) and photo [0.34, 0.1, 0.08, 0.05] (right 0.42)
    // Union: x: 0.25, w: 0.17. Padded by 0.01: x: 0.24, w: 0.19
    expect(target.box.x).toBeCloseTo(0.24)
    expect(target.box.w).toBeCloseTo(0.19)
  })

  it('falls back to anchor.fallback coordinate when text is not found', () => {
    const step: MapStep = {
      anchor: { text: ['nonexistent'], fallback: [0.86, 0.94] },
      voice: 'v.mp3',
      captionUr: 'کیمرہ',
      whyUr: 'وجہ',
      labelEn: 'Camera',
    }
    const ocr: OcrResult = {
      fullText: 'Random text',
      words: [{ text: 'Random', box: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 }, confidence: 90 }],
      width: 390,
      height: 844,
    }

    const target = resolveTarget(step, ocr)
    expect(target.source).toBe('map-fallback')
    expect(target.confidence).toBe(0.7)
    expect(target.label).toBe('Camera')
    expect(target.box.x).toBeCloseTo(0.86 - 0.14 / 2)
    expect(target.box.y).toBeCloseTo(0.94 - 0.07 / 2)
    expect(target.box.w).toBeCloseTo(0.14)
    expect(target.box.h).toBeCloseTo(0.07)
  })

  it('falls back to screen centre (0.5, 0.5) when no text or fallback exists', () => {
    const step: MapStep = {
      anchor: {},
      voice: 'v.mp3',
      captionUr: 'دبائیں',
      whyUr: 'وجہ',
    }
    const ocr: OcrResult = {
      fullText: '',
      words: [],
      width: 390,
      height: 844,
    }

    const target = resolveTarget(step, ocr)
    expect(target.source).toBe('map-fallback')
    expect(target.confidence).toBe(0.2)
    expect(target.box.x).toBeCloseTo(0.5 - 0.14 / 2)
    expect(target.box.y).toBeCloseTo(0.5 - 0.07 / 2)
  })
})
