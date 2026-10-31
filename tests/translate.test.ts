import { describe, expect, it, vi } from 'vitest'
import { createTranslate } from '@/ai/translate'

describe('createTranslate', () => {
  it('translates exact dictionary matches case-insensitively', async () => {
    const translate = createTranslate()
    expect(await translate.toUrdu('Camera')).toBe('کیمرہ')
    expect(await translate.toUrdu('camera')).toBe('کیمرہ')
    expect(await translate.toUrdu('Send Money')).toBe('پیسے بھیجیں')
  })

  it('translates word-by-word when all words are present in dictionary', async () => {
    const translate = createTranslate()
    // 'send' -> 'بھیجیں', 'photo' -> 'تصویر'
    expect(await translate.toUrdu('Send Photo')).toBe('بھیجیں تصویر')
  })

  it('falls back to worker translation for non-dictionary phrases', async () => {
    const worker = {
      translate: vi.fn(async (text: string) => `ترجمہ: ${text}`),
    }
    const translate = createTranslate({ worker })
    const res = await translate.toUrdu('Rare English medical term')
    expect(res).toBe('ترجمہ: Rare English medical term')
    expect(worker.translate).toHaveBeenCalledTimes(1)

    // Cached on subsequent lookup
    const cached = await translate.toUrdu('Rare English medical term')
    expect(cached).toBe('ترجمہ: Rare English medical term')
    expect(worker.translate).toHaveBeenCalledTimes(1)
  })

  it('falls back to original text when worker returns null or errors', async () => {
    const worker = {
      translate: vi.fn(async () => null),
    }
    const translate = createTranslate({ worker })
    const res = await translate.toUrdu('Unknown completely untranslatable')
    expect(res).toBe('Unknown completely untranslatable')
  })
})
