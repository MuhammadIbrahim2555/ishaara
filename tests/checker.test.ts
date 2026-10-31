import { describe, expect, it } from 'vitest'
import type { Lesson, OcrResult } from '@/types/contracts'
import { evaluateCheck } from '@/core/checker'
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

describe('evaluateCheck verification', () => {
  const dummyLesson: Lesson = {
    id: 'l1',
    task: 'photo',
    app: 'whatsapp',
    createdAt: 1000,
    updatedAt: 1000,
    level: 1,
    completed: false,
    parts: [
      {
        screenId: 'wa_chat',
        image: new Blob(),
        width: 390,
        height: 844,
        steps: [
          {
            index: 0,
            target: {
              box: { x: 0.86, y: 0.94, w: 0.14, h: 0.07 },
              source: 'map-fallback',
              confidence: 0.7,
              label: 'Camera',
            },
            captionUr: 'کیمرہ',
            whyUr: 'وجہ',
            expectNext: 'wa_photo_picker',
          },
        ],
      },
    ],
  }

  it('evaluates PASS when next screen matches expectNext (wa_photo_picker)', () => {
    const ocr = makeOcr('Recents All Photos Albums')
    const res = evaluateCheck({ lesson: dummyLesson, ocr, maps: SCREEN_MAPS })

    expect(res.kind).toBe('pass')
    if (res.kind === 'pass') {
      expect(res.screen.id).toBe('wa_photo_picker')
      // wa_photo_picker has steps for photo, so done should be false
      expect(res.done).toBe(false)
    }
  })

  it('evaluates PASS with done = true when target screen has no steps for the task', () => {
    // If expectNext points to a screen with no steps or last step
    const finalLesson: Lesson = {
      ...dummyLesson,
      parts: [
        {
          screenId: 'wa_photo_preview',
          image: new Blob(),
          width: 390,
          height: 844,
          steps: [
            {
              index: 0,
              target: {
                box: { x: 0.9, y: 0.93, w: 0.14, h: 0.07 },
                source: 'map-text',
                confidence: 0.95,
                label: 'Send',
              },
              captionUr: 'بھیجیں',
              whyUr: 'وجہ',
              expectNext: 'wa_chat', // after sending, returns to chat
            },
          ],
        },
      ],
    }
    // Modify wa_chat copy where task has no steps to test done=true
    const customMaps = SCREEN_MAPS.map((m) =>
      m.id === 'wa_chat' ? { ...m, tasks: { ...m.tasks, photo: [] } } : m,
    )
    const ocr = makeOcr('Type a message')
    const res = evaluateCheck({ lesson: finalLesson, ocr, maps: customMaps })
    expect(res.kind).toBe('pass')
    if (res.kind === 'pass') {
      expect(res.done).toBe(true)
    }
  })

  it('evaluates HINT when user is still on the same screen (wa_chat)', () => {
    const ocr = makeOcr('Type a message')
    const res = evaluateCheck({ lesson: dummyLesson, ocr, maps: SCREEN_MAPS })

    expect(res.kind).toBe('hint')
    if (res.kind === 'hint') {
      expect(res.step.captionUr).toBe('کیمرہ')
    }
  })

  it('evaluates UNKNOWN when matched screen is neither expected nor current', () => {
    const ocr = makeOcr('Chats Updates Communities Calls')
    const res = evaluateCheck({ lesson: dummyLesson, ocr, maps: SCREEN_MAPS })
    expect(res.kind).toBe('unknown')
  })

  describe('final step without expectNext (photo preview -> Send)', () => {
    const previewLesson: Lesson = {
      ...dummyLesson,
      parts: [
        {
          screenId: 'wa_photo_preview',
          image: new Blob(),
          width: 390,
          height: 844,
          steps: [
            {
              index: 0,
              target: {
                box: { x: 0.9, y: 0.93, w: 0.14, h: 0.07 },
                source: 'map-text',
                confidence: 0.95,
                label: 'Send',
              },
              captionUr: 'بھیجیں',
              whyUr: 'وجہ',
            },
          ],
        },
      ],
    }

    it('passes with done = true when the user is back in chat after Send', () => {
      const ocr = makeOcr('Type a message')
      const res = evaluateCheck({ lesson: previewLesson, ocr, maps: SCREEN_MAPS })
      expect(res.kind).toBe('pass')
      if (res.kind === 'pass') {
        expect(res.screen.id).toBe('wa_chat')
        expect(res.done).toBe(true)
      }
    })

    it('gives a hint when the user is still on the preview screen', () => {
      const ocr = makeOcr('Add a caption')
      const res = evaluateCheck({ lesson: previewLesson, ocr, maps: SCREEN_MAPS })
      expect(res.kind).toBe('hint')
      if (res.kind === 'hint') {
        expect(res.step.captionUr).toBe('بھیجیں')
      }
    })

    it('returns unknown when the screen matches no known map', () => {
      const ocr = makeOcr('Settings Privacy Notifications')
      const res = evaluateCheck({ lesson: previewLesson, ocr, maps: SCREEN_MAPS })
      expect(res.kind).toBe('unknown')
    })
  })
})
