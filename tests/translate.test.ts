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

  it('does not call the model for dictionary phrases', async () => {
    const worker = { translate: vi.fn(async () => 'model output') }
    const translate = createTranslate({ worker })
    expect(await translate.toUrdu('Camera')).toBe('کیمرہ')
    expect(await translate.toUrdu('Send Photo')).toBe('بھیجیں تصویر')
    expect(worker.translate).not.toHaveBeenCalled()
  })

  it('falls back to the Opus-MT worker for non-dictionary phrases and caches the result', async () => {
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

  it('falls back to original text when the model returns null or throws', async () => {
    const nullWorker = { translate: vi.fn(async () => null) }
    expect(
      await createTranslate({ worker: nullWorker }).toUrdu('Unknown completely untranslatable')
    ).toBe('Unknown completely untranslatable')

    const throwingWorker = {
      translate: vi.fn(async (): Promise<string | null> => {
        throw new Error('model failed')
      }),
    }
    expect(
      await createTranslate({ worker: throwingWorker }).toUrdu('Another untranslatable phrase')
    ).toBe('Another untranslatable phrase')
  })

  it('returns the original text with no worker and does not match prototype members', async () => {
    const translate = createTranslate()
    expect(await translate.toUrdu('Rare English medical term')).toBe('Rare English medical term')
    expect(await translate.toUrdu('constructor')).toBe('constructor')
  })

  it('returns an empty string for blank input', async () => {
    expect(await createTranslate().toUrdu('   ')).toBe('')
  })
})
