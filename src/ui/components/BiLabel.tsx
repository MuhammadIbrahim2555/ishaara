import { cn } from '@/ui/cn'
import { langAttrs, useLang } from '@/ui/i18n'
import type { Pair } from '@/ui/strings'

interface BiLabelProps {
  label: Pair
  className?: string
}

/**
 * One line of text in the current UI language only. The other language is never shown.
 * Urdu (Nastaliq) gets line-height 2 and 0.1em padding so descenders are not clipped.
 */
export function BiLabel({ label, className }: BiLabelProps) {
  const lang = useLang()
  return (
    <span
      {...langAttrs(lang)}
      className={cn(
        'block text-center text-btn font-bold',
        lang === 'ur' ? 'py-[0.1em] leading-[2]' : 'leading-snug',
        className,
      )}
    >
      {label[lang]}
    </span>
  )
}
