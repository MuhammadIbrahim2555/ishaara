import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVoice } from '@/ai/voice'
import {
  isUrduText,
  manifestEntry,
  pickBrowserVoice,
  pickSource,
  speechLangFor,
  voiceKey,
} from '@/core/voiceSelect'

describe('voiceKey', () => {
  it('extracts base key from file paths with extensions', () => {
    expect(voiceKey('wa_photo_2.mp3')).toBe('wa_photo_2')
    expect(voiceKey('/voice/wa_video_1.wav')).toBe('wa_video_1')
    expect(voiceKey('nested/path/to/clip.ogg')).toBe('clip')
    expect(voiceKey('welcome')).toBe('welcome')
  })
})

describe('pickSource priority (pregen -> MMS for Urdu -> browser for English -> none)', () => {
  const manifest = {
    wa_photo_2: { file: 'wa_photo_2.wav', text: 'کیمرہ' },
  }

  it('prefers a pre-generated clip when the id is in the manifest', () => {
    expect(
      pickSource({
        id: 'wa_photo_2',
        manifest,
        text: 'کیمرہ',
        mmsAvailable: true,
        browserSpeech: true,
      })
    ).toBe('pregen')
  })

  it('uses MMS for any Urdu text that has no clip', () => {
    expect(
      pickSource({
        id: 'unknown_step_phrase',
        manifest,
        text: 'کوئی اور جملہ',
        mmsAvailable: true,
        browserSpeech: true,
      })
    ).toBe('mms')
  })

  it('treats missing text as Urdu', () => {
    expect(pickSource({ manifest, mmsAvailable: true, browserSpeech: false })).toBe('mms')
  })

  it('does not fall back to the browser for Urdu text when MMS is unavailable', () => {
    expect(
      pickSource({
        id: 'unknown_step_phrase',
        manifest,
        text: 'کوئی اور جملہ',
        mmsAvailable: false,
        browserSpeech: true,
      })
    ).toBe('none')
  })

  it('uses speechSynthesis for English text', () => {
    expect(
      pickSource({
        manifest,
        text: 'Tap the camera',
        mmsAvailable: true,
        browserSpeech: true,
      })
    ).toBe('browser')
  })

  it('selects none for English text when speechSynthesis is unavailable', () => {
    expect(
      pickSource({
        manifest,
        text: 'Tap the camera',
        mmsAvailable: true,
        browserSpeech: false,
      })
    ).toBe('none')
  })

  it('does not treat prototype members as pregen clips', () => {
    expect(
      pickSource({ id: 'constructor', manifest: {}, mmsAvailable: false, browserSpeech: false })
    ).toBe('none')
    expect(
      pickSource({ id: 'toString', manifest: {}, mmsAvailable: true, browserSpeech: false })
    ).toBe('mms')
  })

  it('manifestEntry reads only own properties', () => {
    expect(manifestEntry({}, 'constructor')).toBeUndefined()
    expect(manifestEntry(manifest, 'wa_photo_2')).toEqual(manifest.wa_photo_2)
  })
})

describe('browser language selection', () => {
  it('detects Urdu script and English text', () => {
    expect(isUrduText('کیمرہ')).toBe(true)
    expect(isUrduText('Camera')).toBe(false)
    expect(speechLangFor('کیمرہ دبائیں')).toBe('ur')
    expect(speechLangFor('Tap the camera')).toBe('en')
  })

  it('picks the voice whose lang starts with the wanted prefix', () => {
    const voices = [
      { lang: 'ur-PK', name: 'b' },
      { lang: 'en-US', name: 'a' },
    ]
    expect(pickBrowserVoice(voices, 'en')?.name).toBe('a')
    expect(pickBrowserVoice(voices, 'ur')?.name).toBe('b')
    expect(pickBrowserVoice([{ lang: 'fr-FR' }], 'en')).toBeUndefined()
  })
})

describe('createVoice (browser and network APIs stubbed)', () => {
  const manifest = {
    wa_photo_2: { file: 'wa_photo_2.wav' },
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (window as unknown as Record<string, unknown>).speechSynthesis
  })

  function stubManifest(data: unknown = manifest): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => data }))
    )
  }

  function stubSpeechSynthesis(voices: { lang: string }[] = []) {
    const speak = vi.fn((u: { onend: (() => void) | null }) => {
      u.onend?.()
    })
    const synth = {
      speak,
      cancel: vi.fn(),
      getVoices: () => voices,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: synth,
      configurable: true,
    })
    return synth
  }

  function stubUtterance(): void {
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string
        lang = ''
        voice: unknown = null
        rate = 1
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        constructor(text: string) {
          this.text = text
        }
      }
    )
  }

  it('source() returns pregen for a manifest id, mms for other Urdu ids, none without a model or speech', async () => {
    stubManifest()
    stubSpeechSynthesis()
    const withModel = createVoice({ worker: { tts: vi.fn(async () => null) } })
    expect(await withModel.source('wa_photo_2')).toBe('pregen')
    expect(await withModel.source('unknown_phrase')).toBe('mms')

    const noModel = createVoice()
    expect(await noModel.source('unknown_phrase')).toBe('none')
  })

  it('makes no request for a runtime model: only the manifest is fetched', async () => {
    stubManifest()
    stubSpeechSynthesis()
    const voice = createVoice({ worker: { tts: vi.fn(async () => null) } })
    await voice.source('unknown_phrase')
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/voice/manifest.json')
  })

  it('speaks Urdu text through the MMS worker model, not speechSynthesis', async () => {
    stubManifest()
    const synth = stubSpeechSynthesis([{ lang: 'ur-PK' }])
    stubUtterance()
    const tts = vi.fn(async () => ({ audio: new Float32Array(8), sampling_rate: 16000 }))
    const createUrl = vi.fn(() => 'blob:mms')
    const revoke = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createUrl
    URL.revokeObjectURL = revoke
    class FakeAudio {
      constructor(public src: string) {}
      listeners: Record<string, () => void> = {}
      addEventListener(name: string, fn: () => void) {
        this.listeners[name] = fn
      }
      removeEventListener() {}
      play() {
        this.listeners.ended?.()
        return Promise.resolve()
      }
      pause() {}
      currentTime = 0
    }
    vi.stubGlobal('Audio', FakeAudio)

    try {
      await createVoice({ worker: { tts } }).speak('کیمرہ دبائیں', { id: 'unknown_phrase' })
      expect(tts).toHaveBeenCalledWith('کیمرہ دبائیں')
      expect(createUrl).toHaveBeenCalledTimes(1)
      expect(synth.speak).not.toHaveBeenCalled()
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  it('speaks English text with speechSynthesis and an en voice', async () => {
    stubManifest()
    const synth = stubSpeechSynthesis([{ lang: 'ur-PK' }, { lang: 'en-GB' }])
    stubUtterance()
    const tts = vi.fn(async () => null)
    await createVoice({ worker: { tts } }).speak('Tap the camera', { id: 'unknown_phrase' })
    expect(tts).not.toHaveBeenCalled()
    const utterance = synth.speak.mock.calls[0][0] as unknown as { lang: string }
    expect(utterance.lang).toBe('en-GB')
  })
})
