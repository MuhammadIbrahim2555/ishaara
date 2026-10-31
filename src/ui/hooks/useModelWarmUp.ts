import { useEffect } from 'react'
import { services } from '@/ui/services'

/**
 * Starts loading the OCR model after the first paint and two seconds of quiet.
 * Whisper and Florence load on demand, so they are not warmed here.
 */
export function useModelWarmUp(): void {
  useEffect(() => {
    let timer: number | undefined
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        services.engine.warmUp(['ocr']).catch(() => {})
      }, 2000)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])
}
