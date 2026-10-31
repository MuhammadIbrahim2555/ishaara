import type { VoiceService, VoiceSource } from '@/types/contracts'
import { pcmToWav } from '@/ai/audio'
import {
  manifestEntry,
  pickBrowserVoice,
  pickSource,
  speechLangFor,
  voiceKey,
} from '@/core/voiceSelect'

export interface VoiceWorker {
  tts?(text: string): Promise<{ audio: Float32Array; sampling_rate: number } | null>
}

export interface VoiceModels {
  worker?: VoiceWorker
}

/**
 * Creates the voice service. Order: pre-generated clip (instant) -> on-device
 * Urdu MMS-TTS for Urdu text -> browser speechSynthesis for English text -> silent.
 * Never throws.
 */
export function createVoice(models?: VoiceModels): VoiceService {
  let cachedManifest: Record<string, unknown> | null = null
  let manifestPromise: Promise<Record<string, unknown>> | null = null

  let currentAudio: HTMLAudioElement | null = null
  let currentAudioUrl: string | null = null
  let currentEndResolver: (() => void) | null = null

  async function getManifest(): Promise<Record<string, unknown>> {
    if (cachedManifest !== null) {
      return cachedManifest
    }
    if (manifestPromise !== null) {
      return manifestPromise
    }

    manifestPromise = (async () => {
      try {
        if (typeof fetch === 'undefined') {
          cachedManifest = {}
          return cachedManifest
        }
        const response = await fetch('/voice/manifest.json')
        if (!response.ok) {
          cachedManifest = {}
          return cachedManifest
        }
        const data = await response.json()
        if (data && typeof data === 'object') {
          cachedManifest = data as Record<string, unknown>
        } else {
          cachedManifest = {}
        }
        return cachedManifest
      } catch {
        cachedManifest = {}
        return cachedManifest
      } finally {
        manifestPromise = null
      }
    })()

    return manifestPromise
  }

  function hasBrowserSpeech(): boolean {
    try {
      return typeof window !== 'undefined' && Boolean(window.speechSynthesis)
    } catch {
      return false
    }
  }

  function stop(): void {
    if (currentAudio) {
      try {
        currentAudio.pause()
        currentAudio.currentTime = 0
      } catch {
        // ignore
      }
      currentAudio = null
    }

    if (currentAudioUrl) {
      try {
        URL.revokeObjectURL(currentAudioUrl)
      } catch {
        // ignore
      }
      currentAudioUrl = null
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }

    if (currentEndResolver) {
      const resolve = currentEndResolver
      currentEndResolver = null
      resolve()
    }
  }

  function playAudio(src: string, blobUrlToRevoke?: string): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        if (typeof Audio === 'undefined') {
          if (blobUrlToRevoke) {
            try {
              URL.revokeObjectURL(blobUrlToRevoke)
            } catch {
              // ignore
            }
          }
          resolve()
          return
        }

        const audio = new Audio(src)
        currentAudio = audio
        if (blobUrlToRevoke) {
          currentAudioUrl = blobUrlToRevoke
        }

        let settled = false
        const cleanup = () => {
          if (settled) return
          settled = true
          if (currentAudio === audio) {
            currentAudio = null
          }
          if (blobUrlToRevoke) {
            if (currentAudioUrl === blobUrlToRevoke) {
              currentAudioUrl = null
            }
            try {
              URL.revokeObjectURL(blobUrlToRevoke)
            } catch {
              // ignore
            }
          }
          if (currentEndResolver === onResolve) {
            currentEndResolver = null
          }
          audio.removeEventListener('ended', handleEnd)
          audio.removeEventListener('error', handleError)
        }

        const onResolve = () => {
          cleanup()
          resolve()
        }
        currentEndResolver = onResolve

        const handleEnd = () => onResolve()
        const handleError = () => onResolve()

        audio.addEventListener('ended', handleEnd)
        audio.addEventListener('error', handleError)

        const playPromise = audio.play?.()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            onResolve()
          })
        }
      } catch {
        if (blobUrlToRevoke) {
          try {
            URL.revokeObjectURL(blobUrlToRevoke)
          } catch {
            // ignore
          }
        }
        resolve()
      }
    })
  }

  function speakInBrowser(text: string, rate?: number): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = rate ?? 0.9

        // English text -> an 'en' voice when installed, otherwise the 'en' language tag.
        const lang = speechLangFor(text)
        let voices: SpeechSynthesisVoice[] = []
        try {
          voices = synth.getVoices?.() ?? []
        } catch {
          voices = []
        }
        const voice = pickBrowserVoice(voices, lang)
        if (voice) {
          utterance.voice = voice
          utterance.lang = voice.lang
        } else {
          utterance.lang = lang
        }

        let settled = false
        const cleanup = () => {
          if (settled) return
          settled = true
          if (currentEndResolver === onResolve) {
            currentEndResolver = null
          }
          utterance.onend = null
          utterance.onerror = null
        }

        const onResolve = () => {
          cleanup()
          resolve()
        }
        currentEndResolver = onResolve

        utterance.onend = () => onResolve()
        utterance.onerror = () => onResolve()

        synth.speak(utterance)
      } catch {
        resolve()
      }
    })
  }

  return {
    async speak(text: string, opts?: { id?: string; rate?: number }): Promise<void> {
      try {
        stop()

        const manifest = await getManifest()
        const source = pickSource({
          id: opts?.id,
          manifest,
          text,
          mmsAvailable: typeof models?.worker?.tts === 'function',
          browserSpeech: hasBrowserSpeech(),
        })

        if (source === 'none') {
          return
        }

        if (source === 'pregen' && opts?.id) {
          const entry =
            manifestEntry(manifest, opts.id) !== undefined
              ? manifestEntry(manifest, opts.id)
              : manifestEntry(manifest, voiceKey(opts.id))

          let filename: string
          if (typeof entry === 'object' && entry !== null && 'file' in entry) {
            filename = String((entry as { file: unknown }).file)
          } else if (typeof entry === 'string') {
            filename = entry
          } else {
            filename = `${voiceKey(opts.id)}.wav`
          }

          const src = filename.startsWith('/voice/')
            ? filename
            : filename.startsWith('voice/')
              ? `/${filename}`
              : `/voice/${filename.replace(/^\/+/, '')}`

          await playAudio(src)
          return
        }

        if (source === 'mms') {
          if (!models?.worker?.tts) {
            return
          }
          // A load or inference failure is emitted as status 'error' by the worker; no audio then.
          const result = await models.worker.tts(text)
          if (!result || !result.audio) {
            return
          }
          const wav = pcmToWav(result.audio, result.sampling_rate)
          const blob = new Blob([wav], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          await playAudio(url, url)
          return
        }

        if (source === 'browser') {
          if (!hasBrowserSpeech()) {
            return
          }
          await speakInBrowser(text, opts?.rate)
        }
      } catch {
        // Never throws: always resolves cleanly
      }
    },

    stop(): void {
      stop()
    },

    async source(id?: string): Promise<VoiceSource> {
      try {
        const manifest = await getManifest()
        return pickSource({
          id,
          manifest,
          mmsAvailable: typeof models?.worker?.tts === 'function',
          browserSpeech: hasBrowserSpeech(),
        })
      } catch {
        return 'none'
      }
    },
  }
}
