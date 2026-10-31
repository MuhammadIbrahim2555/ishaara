import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function matchQuery(): MediaQueryList | null {
  try {
    return typeof window !== 'undefined' ? window.matchMedia(QUERY) : null
  } catch {
    return null
  }
}

/** Tracks prefers-reduced-motion and updates live when the OS setting changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => matchQuery()?.matches === true)

  useEffect(() => {
    const mq = matchQuery()
    if (!mq) return
    const onChange = (): void => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
