import type { SpeechResult, SpeechService, TaskId } from '@/types/contracts'

export const SMART_VOICE_STORAGE_KEY = 'ishaara.smartVoice.v1'

/**
 * Returns true only if the user explicitly turned smart voice on in settings.
 * Unset or 'off' evaluates to false.
 */
export function isSmartVoiceEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false
    }
    return localStorage.getItem(SMART_VOICE_STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export interface CreateGeminiSpeechOptions {
  fallback: SpeechService
  isEnabled?: () => boolean
  endpoint?: string
}

export function createGeminiSpeech(options: CreateGeminiSpeechOptions): SpeechService {
  const { fallback, isEnabled = isSmartVoiceEnabled, endpoint = '/api/voice' } = options

  let onlineOverride: boolean | null = null

  function checkOnline(): boolean {
    if (onlineOverride !== null) {
      return onlineOverride
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine
    }
    return true
  }

  return {
    async transcribe(audio: Blob): Promise<SpeechResult> {
      const enabled = isEnabled()
      const online = checkOnline()

      if (!enabled || !online) {
        return fallback.transcribe(audio)
      }

      const controller = new AbortController()
      // Longer than the server's 25 s model-fallback budget, so the server can finish its chain.
      const timeoutId = setTimeout(() => controller.abort(), 28_000)

      try {
        const contentType = audio.type || 'audio/webm'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
          },
          body: audio,
          signal: controller.signal,
        })

        if (!res.ok) {
          // 503 (not-configured), 5xx, or other HTTP errors -> fallback to Whisper
          return fallback.transcribe(audio)
        }

        const data = (await res.json()) as {
          transcript?: string
          task?: TaskId | null
          replyUr?: string
          replyEn?: string
          confidence?: number
        }

        return {
          text: typeof data.transcript === 'string' ? data.transcript : '',
          task: (data.task as TaskId) || null,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0,
          replyUr: data.replyUr,
          replyEn: data.replyEn,
          source: 'gemini',
        }
      } catch {
        // Network error, abort/timeout -> fallback to Whisper
        return fallback.transcribe(audio)
      } finally {
        clearTimeout(timeoutId)
      }
    },

    mode(): 'gemini' | 'whisper' {
      return isEnabled() && checkOnline() ? 'gemini' : 'whisper'
    },

    setOnline(enabled: boolean): void {
      onlineOverride = enabled
      fallback.setOnline(enabled)
    },
  }
}
