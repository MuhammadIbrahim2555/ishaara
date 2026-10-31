import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { S } from '@/ui/strings'
import { useUiStore, type Lang } from '@/ui/store'

interface LangToggleProps {
  /** 44px tall (for the BackBar). Default 48px. */
  compact?: boolean
  className?: string
}

/** Each option names itself in its own language. */
const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ur', label: S.langUr.ur },
  { value: 'en', label: S.langEn.en },
]

/** Segmented Urdu / English switch. Sets settings.lang; html lang and dir follow in App. */
export function LangToggle({ compact = false, className }: LangToggleProps) {
  const lang = useLang()
  const setSettings = useUiStore((s) => s.setSettings)
  return (
    <div
      role="group"
      aria-label={S.language[lang]}
      className={cn('inline-flex gap-1 rounded-pill bg-surface-sunk p-1', className)}
    >
      {OPTIONS.map((option) => {
        const active = option.value === lang
        return (
          <button
            key={option.value}
            type="button"
            data-control=""
            aria-pressed={active}
            onClick={() => setSettings({ lang: option.value })}
            {...langAttrs(option.value)}
            className={cn(
              'flex items-center justify-center rounded-pill px-4 font-bold transition-colors duration-[180ms]',
              compact ? 'min-h-11' : 'min-h-12',
              bodyClass(option.value),
              active ? 'bg-teal-900 text-page' : 'bg-transparent text-teal-900 hover:bg-surface',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
