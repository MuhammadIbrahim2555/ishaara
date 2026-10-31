import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGeminiSpeech,
  isSmartVoiceEnabled,
  SMART_VOICE_STORAGE_KEY,
} from '@/ai/geminiSpeech'
import type { SpeechResult, SpeechService } from '@/types/contracts'

describe('createGeminiSpeech service', () => {
  let mockFallback: SpeechService
  let fallbackTranscribe: (audio: Blob) => Promise<SpeechResult>

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()

    fallbackTranscribe = vi.fn(async (_audio: Blob): Promise<SpeechResult> => ({
      text: 'fallback transcript',
      task: 'video_call',
      confidence: 0.7,
      source: 'whisper',
    }))

    mockFallback = {
      transcribe: fallbackTranscribe,
      mode: () => 'whisper',
      setOnline: vi.fn(),
    }
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('checks isSmartVoiceEnabled with localStorage (default unset is false, "on" is true, "off" is false)', () => {
    expect(isSmartVoiceEnabled()).toBe(false)

    localStorage.setItem(SMART_VOICE_STORAGE_KEY, 'off')
    expect(isSmartVoiceEnabled()).toBe(false)

    localStorage.setItem(SMART_VOICE_STORAGE_KEY, 'on')
    expect(isSmartVoiceEnabled()).toBe(true)
  })

  it('maps successful 200 JSON response to SpeechResult with source: "gemini"', async () => {
    const fakeBlob = new Blob(['dummy audio content'], { type: 'audio/webm' })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        transcript: 'تصویر کیسے بھیجیں',
        task: 'photo',
        replyUr: 'ٹھیک ہے، تصویر بھیجنا سکھاتے ہیں',
        replyEn: "Okay, let's learn how to send a photo",
        confidence: 0.95,
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => true,
    })

    expect(speech.mode()).toBe('gemini')

    const result = await speech.transcribe(fakeBlob)

    expect(result).toEqual({
      text: 'تصویر کیسے بھیجیں',
      task: 'photo',
      replyUr: 'ٹھیک ہے، تصویر بھیجنا سکھاتے ہیں',
      replyEn: "Okay, let's learn how to send a photo",
      confidence: 0.95,
      source: 'gemini',
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(fallbackTranscribe).not.toHaveBeenCalled()
  })

  it('falls back to Whisper when smart voice is disabled', async () => {
    const fakeBlob = new Blob(['dummy audio'], { type: 'audio/webm' })
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => false,
    })

    expect(speech.mode()).toBe('whisper')

    const result = await speech.transcribe(fakeBlob)

    expect(result.source).toBe('whisper')
    expect(result.text).toBe('fallback transcript')
    expect(fallbackTranscribe).toHaveBeenCalledWith(fakeBlob)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falls back to Whisper when offline via setOnline(false) or navigator.onLine', async () => {
    const fakeBlob = new Blob(['dummy audio'], { type: 'audio/webm' })
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => true,
    })

    speech.setOnline(false)
    expect(speech.mode()).toBe('whisper')

    const result = await speech.transcribe(fakeBlob)

    expect(result.source).toBe('whisper')
    expect(fallbackTranscribe).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falls back to Whisper when endpoint returns 503 not-configured', async () => {
    const fakeBlob = new Blob(['dummy audio'], { type: 'audio/webm' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'not-configured' }),
      }),
    )

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => true,
    })

    const result = await speech.transcribe(fakeBlob)

    expect(result.source).toBe('whisper')
    expect(fallbackTranscribe).toHaveBeenCalledTimes(1)
  })

  it('falls back to Whisper on 500/502 upstream errors', async () => {
    const fakeBlob = new Blob(['dummy audio'], { type: 'audio/webm' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'upstream' }),
      }),
    )

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => true,
    })

    const result = await speech.transcribe(fakeBlob)

    expect(result.source).toBe('whisper')
    expect(fallbackTranscribe).toHaveBeenCalledTimes(1)
  })

  it('falls back to Whisper on network error or timeout', async () => {
    const fakeBlob = new Blob(['dummy audio'], { type: 'audio/webm' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const speech = createGeminiSpeech({
      fallback: mockFallback,
      isEnabled: () => true,
    })

    const result = await speech.transcribe(fakeBlob)

    expect(result.source).toBe('whisper')
    expect(fallbackTranscribe).toHaveBeenCalledTimes(1)
  })
})
