import { useEffect, useRef, useState } from 'react'
import { cn } from '@/ui/cn'
import { useSpeak } from '@/ui/hooks/useSpeak'
import { useLang } from '@/ui/i18n'
import { IconSpeaker } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import type { Lang } from '@/ui/store'

interface SpeakButtonProps {
  /** Text in both languages, spoken in the current UI language. Preferred. */
  pair?: Pair
  /** Urdu-only text (older callers). Always spoken in Urdu. */
  text?: string
  /** Clip id: a phrases.json id, or a lesson step key (`<voice file>` or `<voice file>_why`). Urdu only. */
  voiceId?: string
  className?: string
}

/**
 * 48px round speaker button.
 * With `pair`, speaks the current language: Urdu through the voice service, English through the browser voice.
 * Urdu is hidden when the voice service has no source for this id (pre-generated, MMS or browser Urdu).
 * English is hidden when speechSynthesis is missing. Tap again to stop.
 */
export function SpeakButton({ pair, text, voiceId, className }: SpeakButtonProps) {
  const uiLang = useLang()
  const speakLang: Lang = pair ? uiLang : 'ur'
  const content: Pair = pair ?? { ur: text ?? '', en: '' }
  const { speak, stop, canSpeak } = useSpeak()
  // Visible by default; the async source check hides it when no Urdu source exists.
  const [urAvailable, setUrAvailable] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const runRef = useRef(0)
  const playingRef = useRef(false)

  useEffect(() => {
    if (speakLang !== 'ur') return
    let alive = true
    const check = () => {
      services.voice.source(voiceId).then(
        (source) => {
          if (alive) setUrAvailable(source !== 'none')
        },
        () => {
          if (alive) setUrAvailable(false)
        },
      )
    }
    check()
    // Browser Urdu voices load asynchronously; re-check when they arrive.
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    synth?.addEventListener?.('voiceschanged', check)
    return () => {
      alive = false
      synth?.removeEventListener?.('voiceschanged', check)
    }
  }, [voiceId, speakLang])

  const available = speakLang === 'ur' ? urAvailable : canSpeak
  if (!available) return null

  async function run() {
    const runId = ++runRef.current
    playingRef.current = true
    setSpeaking(true)
    try {
      await speak(content, { voiceId, lang: speakLang })
    } finally {
      if (runRef.current === runId) {
        playingRef.current = false
        setSpeaking(false)
      }
    }
  }

  function onPress() {
    if (playingRef.current) {
      stop()
      return
    }
    void run()
  }

  return (
    <button
      type="button"
      data-control=""
      onClick={onPress}
      aria-label={S.listen[uiLang]}
      aria-pressed={speaking}
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-teal-900 bg-surface text-teal-900 shadow-raised transition-colors duration-[180ms] hover:bg-teal-100',
        speaking && 'bg-teal-100',
        className,
      )}
    >
      <IconSpeaker className="size-7" />
    </button>
  )
}
