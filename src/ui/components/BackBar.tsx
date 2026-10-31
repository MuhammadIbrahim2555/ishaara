import { useNavigate } from 'react-router-dom'
import { cn } from '@/ui/cn'
import { useLang } from '@/ui/i18n'
import { IconBack } from '@/ui/icons'
import { S, type Pair } from '@/ui/strings'
import { LangToggle } from './LangToggle'
import { Localized } from './UrduText'

interface BackBarProps {
  title?: Pair
  /** Route to go to. Without it, goes back in history (or home if there is none). */
  to?: string
}

/**
 * Row 1: back button (start) and the language switch (end). Row 2: the title on its own full-width line,
 * so long Urdu titles wrap normally instead of being squeezed between the two.
 */
export function BackBar({ title, to }: BackBarProps) {
  const navigate = useNavigate()
  const lang = useLang()

  function back() {
    if (to) navigate(to)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }

  return (
    <header className="flex flex-col gap-2 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          data-control=""
          onClick={back}
          className="flex min-h-14 shrink-0 items-center gap-2 rounded-control border-2 border-teal-900 bg-surface px-4 text-teal-900 shadow-raised transition duration-[180ms] hover:bg-teal-100 motion-safe:active:scale-[0.98]"
        >
          <IconBack className="size-7 ltr:-scale-x-100" />
          <Localized as="span" p={S.back} className="text-ur-body font-bold leading-[2]" />
        </button>
        <LangToggle compact />
      </div>
      {title && (
        <Localized
          as="h1"
          p={title}
          className={cn(
            'w-full text-start font-bold',
            lang === 'ur' ? 'text-[1.625rem] leading-[2]' : 'text-[1.5rem] leading-snug',
          )}
        />
      )}
    </header>
  )
}
