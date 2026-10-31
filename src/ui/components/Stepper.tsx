import { cn } from '@/ui/cn'
import { langAttrs, useLang } from '@/ui/i18n'

interface StepperProps {
  /** 1-based step number */
  current: number
  total: number
}

/** "قدم 1 / 3" or "Step 1 / 3", with dots. The active dot is a wider teal pill. Dots follow the reading direction. */
export function Stepper({ current, total }: StepperProps) {
  const lang = useLang()
  const label = lang === 'ur' ? `قدم ${current} / ${total}` : `Step ${current} / ${total}`
  return (
    <div {...langAttrs(lang)} className="flex flex-col items-center gap-3">
      <p className="text-label font-bold text-ink-soft">{label}</p>
      <div aria-hidden="true" className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 rounded-pill transition-[width,background-color] duration-[180ms]',
              i + 1 === current ? 'w-8 bg-teal-900' : 'w-2.5 bg-surface-sunk',
            )}
          />
        ))}
      </div>
    </div>
  )
}
