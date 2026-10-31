import { describe, expect, it } from 'vitest'
import type { OcrResult } from '@/types/contracts'
import { matchScreen } from '@/core/matcher'
import { SCREEN_MAPS } from '@/data/maps'

function makeOcr(fullText: string): OcrResult {
  return {
    fullText,
    words: fullText
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({
        text,
        box: { x: 0, y: 0, w: 0.1, h: 0.05 },
        confidence: 90,
      })),
    width: 390,
    height: 844,
  }
}

describe('screen matcher', () => {
  it('matches wa_chats with English keywords and satisfies minHits 2', () => {
    const ocr = makeOcr('Chats Updates Calls Communities Beta Beti')
    const res = matchScreen(ocr, SCREEN_MAPS)
    expect(res).not.toBeNull()
    expect(res?.map.id).toBe('wa_chats')
    expect(res?.score).toBeGreaterThanOrEqual(2)
  })

  it('rejects wa_chats if match.none phrase (type a message) is present', () => {
    const ocr = makeOcr('Chats Updates Calls Type a message')
    const res = matchScreen(ocr, SCREEN_MAPS)
    // wa_chats must be rejected because "type a message" is in its match.none
    expect(res?.map.id).not.toBe('wa_chats')
    expect(res?.map.id).toBe('wa_chat')
  })

  it('matches wa_chat with Urdu phrase پیغام لکھیں', () => {
    const ocr = makeOcr('بیٹا پیغام لکھیں کیمرہ')
    const res = matchScreen(ocr, SCREEN_MAPS)
    expect(res).not.toBeNull()
    expect(res?.map.id).toBe('wa_chat')
  })

  it('matches wa_photo_picker with Recents and Photos', () => {
    const ocr = makeOcr('Recents All Photos Albums')
    const res = matchScreen(ocr, SCREEN_MAPS)
    expect(res).not.toBeNull()
    expect(res?.map.id).toBe('wa_photo_picker')
  })

  it('matches wa_photo_preview with Add a caption', () => {
    const ocr = makeOcr('Add a caption Send')
    const res = matchScreen(ocr, SCREEN_MAPS)
    expect(res).not.toBeNull()
    expect(res?.map.id).toBe('wa_photo_preview')
  })

  it('returns null when minHits is not satisfied or no map matches', () => {
    const ocr = makeOcr('Some completely unknown screen with random words')
    const res = matchScreen(ocr, SCREEN_MAPS)
    expect(res).toBeNull()
  })

  it('resolves ties by picking the first map in the array', () => {
    const maps = [
      {
        id: 'map_1',
        app: 'whatsapp' as const,
        titleUr: 'Title 1',
        match: { any: ['common_word'], minHits: 1 },
        tasks: {},
      },
      {
        id: 'map_2',
        app: 'whatsapp' as const,
        titleUr: 'Title 2',
        match: { any: ['common_word'], minHits: 1 },
        tasks: {},
      },
    ]
    const ocr = makeOcr('common_word')
    const res = matchScreen(ocr, maps)
    expect(res?.map.id).toBe('map_1')
  })
})
