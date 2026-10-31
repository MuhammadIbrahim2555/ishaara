import { useNavigate } from 'react-router-dom'
import { cn } from '@/ui/cn'
import { IconBack } from '@/ui/icons'
import { S, type Pair } from '@/ui/strings'
import { LangToggle } from './LangToggle'
import { Localized } from './UrduText'

interface BackBarProps {
  title?: Pair
  /** Route to go to. Without it, goes back in history (or home if there is none). */
  to?: string
}

export function BackBar({ title, to }: BackBarProps) {
  const navigate = useNavigate()

  function back() {
    if (to) navigate(to)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        data-control=""
        onClick={back}
        className="flex min-h-14 shrink-0 items-center gap-2 rounded-control border-2 border-teal-900 bg-surface px-5 text-teal-900 shadow-raised transition duration-[180ms] hover:bg-teal-100 motion-safe:active:scale-[0.98]"
      >
        <IconBack className="size-7 ltr:-scale-x-100" />
        <Localized as="span" p={S.back} className="text-ur-body font-bold leading-[1.6]" />
      </button>
      {title && (
        <Localized as="h1" p={title} className={cn('min-w-0 flex-1 text-start text-ur-title')} />
      )}
      <LangToggle compact className="ms-auto" />
    </header>
  )
}
