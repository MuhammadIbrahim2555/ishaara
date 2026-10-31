import { useEffect, useState } from 'react'
import { services } from '@/ui/services'

/**
 * Urdu rendering of an English label, or null while translating, when there is no label,
 * or when translation gives nothing.
 */
export function useTranslatedLabel(labelEn: string | undefined): string | null {
  const [done, setDone] = useState<{ source: string; urdu: string | null } | null>(null)

  useEffect(() => {
    if (!labelEn) return
    let alive = true
    services.translate.toUrdu(labelEn).then(
      (urdu) => {
        if (alive) setDone({ source: labelEn, urdu: urdu || null })
      },
      () => {
        if (alive) setDone({ source: labelEn, urdu: null })
      },
    )
    return () => {
      alive = false
    }
  }, [labelEn])

  if (!labelEn || !done || done.source !== labelEn) return null
  return done.urdu
}
