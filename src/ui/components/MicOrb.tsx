import { motion, useReducedMotion } from 'motion/react'
import { phraseText } from '@/data/phrases'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconMic } from '@/ui/icons'
import { S, type Pair } from '@/ui/strings'
import { SpeakButton } from './SpeakButton'

interface MicOrbProps {
  listening: boolean
  /** The recording is being transcribed: the orb is disabled and shows the thinking label. */
  busy?: boolean
  onToggle: () => void
}

/** The spoken "listening" prompt in both languages. */
const LISTENING: Pair = { ur: phraseText('listening', 'ur'), en: phraseText('listening', 'en') }

/** Text in the current UI language only. Body text gets bodyClass. */
function Copy({ p, className }: { p: Pair; className?: string }) {
  const lang = useLang()
  return (
    <p {...langAttrs(lang)} className={cn(bodyClass(lang), className)}>
      {p[lang]}
    </p>
  )
}

/** 112px teal orb. Tap to start or stop. While listening, saffron rings pulse outward. */
export function MicOrb({ listening, busy = false, onToggle }: MicOrbProps) {
  const reduce = useReducedMotion()
  const lang = useLang()
  const label = busy ? S.understanding : listening ? S.micListening : S.micIdle

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex size-48 items-center justify-center">
        {listening &&
          !reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute size-28 rounded-full bg-saffron"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.75, opacity: 0 }}
              transition={{ duration: 1.8, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
        {listening && reduce && (
          <span aria-hidden="true" className="absolute size-32 rounded-full ring-4 ring-saffron" />
        )}
        {busy && (
          <span
            aria-hidden="true"
            className="absolute size-36 rounded-full border-[6px] border-saffron/30 border-t-saffron motion-safe:animate-spin"
          />
        )}
        <button
          type="button"
          data-control=""
          aria-pressed={listening}
          aria-label={label[lang]}
          disabled={busy}
          onClick={onToggle}
          className={cn(
            'relative flex size-28 items-center justify-center rounded-full bg-teal-900 text-white shadow-lifted transition duration-[180ms] hover:bg-teal-700 motion-safe:active:scale-[0.97] disabled:opacity-70',
            listening && 'ring-4 ring-saffron',
          )}
        >
          <IconMic className="size-9" />
        </button>
      </div>
      <div aria-live="polite" className="flex items-center justify-center gap-3">
        <Copy p={label} className="text-center" />
        {listening && <SpeakButton pair={LISTENING} voiceId="listening" />}
      </div>
    </div>
  )
}
