import { useEffect, useRef } from 'react'
import { Hint } from '@/ui/components/Hint'
import { cn } from '@/ui/cn'
import { langAttrs, useLang } from '@/ui/i18n'
import type { VoiceAnswer } from '@/ui/hooks/useVoiceQuery'
import { useSpeak } from '@/ui/hooks/useSpeak'
import { SMART_VOICE_COPY } from '@/ui/smartVoice'

interface VoiceReplyPanelProps {
  answer: VoiceAnswer
}

/**
 * The spoken reply from the mic, in a calm teal panel, with a small chip showing where it was
 * understood. Speaks once per answer. The mic tap is the user's action, so autoplay is fine here.
 */
export function VoiceReplyPanel({ answer }: VoiceReplyPanelProps) {
  const lang = useLang()
  const { speak } = useSpeak()
  const speakRef = useRef(speak)
  useEffect(() => {
    speakRef.current = speak
  })

  // Keyed on the answer object so a StrictMode double effect run does not speak twice.
  const spokenRef = useRef<VoiceAnswer | null>(null)
  useEffect(() => {
    if (spokenRef.current === answer) return
    spokenRef.current = answer
    void speakRef.current({ ur: answer.ur, en: answer.en })
  }, [answer])

  const chip =
    answer.source === 'gemini'
      ? SMART_VOICE_COPY.chipGemini
      : answer.source === 'whisper'
        ? SMART_VOICE_COPY.chipWhisper
        : null

  return (
    <div className="flex flex-col gap-2">
      {chip && (
        <span
          {...langAttrs(lang)}
          className={cn(
            'self-start rounded-pill border border-teal-900 px-3 py-1 text-label font-bold text-teal-900',
            lang === 'ur' && 'leading-[2]',
          )}
        >
          {chip[lang]}
        </span>
      )}
      <Hint pair={{ ur: answer.ur, en: answer.en }} />
    </div>
  )
}
