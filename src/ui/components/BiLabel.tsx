import { cn } from '@/ui/cn'
import { langAttrs, otherLang, useLang } from '@/ui/i18n'
import type { Pair } from '@/ui/strings'

interface BiLabelProps {
  label: Pair
  className?: string
}

/** Primary label in the UI language, with the other language as a smaller sub-label. */
export function BiLabel({ label, className }: BiLabelProps) {
  const lang = useLang()
  const other = otherLang(lang)
  return (
    <span className={cn('flex flex-col items-center gap-0.5 text-center', className)}>
      <span {...langAttrs(lang)} className="text-btn font-bold leading-[1.6]">
        {label[lang]}
      </span>
      <span
        {...langAttrs(other)}
        className={other === 'en' ? 'font-latin text-sub leading-snug' : 'text-label leading-[1.9]'}
      >
        {label[other]}
      </span>
    </span>
  )
}
