import { useEffect, useRef } from 'react'
import { useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import type { Pair } from '@/ui/strings'
import type { Lang } from '@/ui/store'

export interface SpeakOptions {
  /** Pre-generated Urdu clip id (phrases.json id or lesson step key). Urdu only. */
  voiceId?: string
  /** Language to speak in. Defaults to the current UI language. */
  lang?: Lang
}

export interface UseSpeak {
  /** Speaks pair.ur (Urdu voice service) or pair.en (browser English voice). Resolves when done or stopped. */
  speak: (pair: Pair, opts?: SpeakOptions) => Promise<void>
  /** Stops Urdu and English playback. */
  stop: () => void
  /** Urdu: true (SpeakButton checks the voice source). English: browser speechSynthesis exists. */
  canSpeak: boolean
}

/** The one English utterance in flight, as its resolver. Only one plays at a time. */
let pendingEnglish: (() => void) | null = null

function hasSpeechSynthesis(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function stopEnglish(): void {
  const resolve = pendingEnglish
  pendingEnglish = null
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel()
  resolve?.()
}

function speakEnglish(text: string): Promise<void> {
  if (!text || !hasSpeechSynthesis()) return Promise.resolve()
  stopEnglish()
  return new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      if (pendingEnglish === done) pendingEnglish = null
      resolve()
    }
    pendingEnglish = done
    try {
      const synth = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.lang = 'en-US'
      const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      }
      utterance.onend = done
      utterance.onerror = done
      synth.speak(utterance)
    } catch {
      done()
    }
  })
}

function stopAllSpeech(): void {
  services.voice.stop()
  stopEnglish()
}

/** Speaks the current UI language. Playback started by this hook stops when its component unmounts. */
export function useSpeak(): UseSpeak {
  const uiLang = useLang()
  const activeRef = useRef(false)

  useEffect(() => {
    return () => {
      if (activeRef.current) stopAllSpeech()
    }
  }, [])

  async function speak(pair: Pair, opts: SpeakOptions = {}): Promise<void> {
    const lang = opts.lang ?? uiLang
    activeRef.current = true
    try {
      if (lang === 'ur') await services.voice.speak(pair.ur, { id: opts.voiceId })
      else await speakEnglish(pair.en)
    } finally {
      activeRef.current = false
    }
  }

  function stop(): void {
    activeRef.current = false
    stopAllSpeech()
  }

  return {
    speak,
    stop,
    canSpeak: uiLang === 'ur' ? true : hasSpeechSynthesis(),
  }
}
