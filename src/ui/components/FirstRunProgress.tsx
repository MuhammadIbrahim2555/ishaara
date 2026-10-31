import { useEffect, useState } from 'react'
import type { LoadProgress } from '@/types/contracts'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'

/** Text in the current UI language only. Body text gets bodyClass. */
function Copy({ p, className }: { p: Pair; className?: string }) {
  const lang = useLang()
  return (
    <p {...langAttrs(lang)} className={cn(bodyClass(lang), className)}>
      {p[lang]}
    </p>
  )
}

/** Shown under the Thinking spinner while the on-device OCR model is being prepared. */
export function FirstRunProgress() {
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    return services.engine.onProgress((event: LoadProgress) => {
      if (event.model !== 'ocr') return
      if (event.status === 'downloading') setProgress(event.progress)
      else setProgress(null)
    })
  }, [])

  if (progress === null) return null
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
      <Copy p={S.firstRunPrep} />
      <progress
        className="h-3 w-full overflow-hidden rounded-pill [&::-webkit-progress-bar]:bg-surface-sunk [&::-webkit-progress-value]:bg-teal-900 [&::-moz-progress-bar]:bg-teal-900"
        value={percent}
        max={100}
        aria-label={`${percent}%`}
      />
      <span className="text-sub">{percent}%</span>
    </div>
  )
}
