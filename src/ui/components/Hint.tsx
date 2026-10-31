import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import type { Pair } from '@/ui/strings'
import { SpeakButton } from './SpeakButton'

type Tone = 'teal' | 'coral' | 'success'

const TONE: Record<Tone, string> = {
  teal: 'bg-teal-100',
  coral: 'bg-coral/15',
  success: 'bg-success/15',
}

interface HintProps {
  /** Text in both languages. Shown and spoken in the current UI language. Preferred. */
  pair?: Pair
  /** Older name for `pair`. */
  text?: Pair
  tone?: Tone
  className?: string
  /** Pre-generated Urdu clip id (phrases.json) for the speak button. */
  voiceId?: string
}

/** Inline panel (never a modal) with a speak button that speaks the current language. */
export function Hint({ pair, text, tone = 'teal', className, voiceId }: HintProps) {
  const lang = useLang()
  const content = pair ?? text
  if (!content) return null
  return (
    <div
      role="status"
      className={cn('flex items-center gap-4 rounded-panel p-4 text-ink', TONE[tone], className)}
    >
      <p {...langAttrs(lang)} className={cn('min-w-0 flex-1', bodyClass(lang))}>
        {content[lang]}
      </p>
      <SpeakButton pair={content} voiceId={voiceId} />
    </div>
  )
}
