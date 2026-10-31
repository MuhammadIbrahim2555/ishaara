import { describe, expect, it } from 'vitest'
import { getMap, SCREEN_MAPS } from '@/data/maps'
import { ScreenMapSchema } from '@/data/schema'
import waChats from '@/data/maps/wa_chats.json'
import waChat from '@/data/maps/wa_chat.json'
import waPhotoPicker from '@/data/maps/wa_photo_picker.json'
import waPhotoPreview from '@/data/maps/wa_photo_preview.json'

describe('screen maps and Zod schema validation', () => {
  it('validates each JSON map with ScreenMapSchema and checks English fields', () => {
    for (const m of [waChats, waChat, waPhotoPicker, waPhotoPreview]) {
      expect(() => ScreenMapSchema.parse(m)).not.toThrow()
      for (const taskKey of Object.keys(m.tasks)) {
        const steps = m.tasks[taskKey as keyof typeof m.tasks]
        if (steps) {
          for (const step of steps) {
            expect(step.captionEn).toBeDefined()
            expect(typeof step.captionEn).toBe('string')
            expect(step.captionEn.length).toBeGreaterThan(0)
            expect(step.whyEn).toBeDefined()
            expect(typeof step.whyEn).toBe('string')
            expect(step.whyEn.length).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('exports exactly 4 loaded screen maps in SCREEN_MAPS', () => {
    expect(SCREEN_MAPS.length).toBe(4)
    const ids = SCREEN_MAPS.map((m) => m.id)
    expect(ids).toContain('wa_chats')
    expect(ids).toContain('wa_chat')
    expect(ids).toContain('wa_photo_picker')
    expect(ids).toContain('wa_photo_preview')
  })

  it('retrieves maps by id via getMap()', () => {
    const map = getMap('wa_chat')
    expect(map).toBeDefined()
    expect(map?.app).toBe('whatsapp')
    expect(getMap('unknown_id')).toBeUndefined()
  })

  it('rejects invalid maps failing Zod constraints', () => {
    // Missing minHits or invalid id pattern
    const invalidMap = {
      id: 'INVALID-ID',
      app: 'whatsapp',
      titleUr: 'عنوان',
      match: { any: ['test'], minHits: 0 },
      tasks: {},
    }
    const parseResult = ScreenMapSchema.safeParse(invalidMap)
    expect(parseResult.success).toBe(false)
  })
})
