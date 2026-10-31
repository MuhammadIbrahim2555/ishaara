import { useEffect, useRef, useState } from 'react'
import type { LoadProgress, TaskId } from '@/types/contracts'
import { services } from '@/ui/services'

export type VoiceQuery =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'busy' }
  | { kind: 'matched'; text: string; task: TaskId }
  | { kind: 'unmatched'; text: string }
  | { kind: 'denied' }
  | { kind: 'error' }

/** A recording stops by itself after this long. */
export const MAX_RECORD_MS = 6000

/** Preferred recording formats, first supported one wins (Safari uses mp4). */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

function isPermissionError(err: unknown): boolean {
  return (
    err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
  )
}

/**
 * Tap-to-talk recording for the Home mic. Records with MediaRecorder, stops at MAX_RECORD_MS or
 * on a second tap, then transcribes through services.speech. Never navigates by itself.
 */
export function useVoiceQuery() {
  const [query, setQuery] = useState<VoiceQuery>({ kind: 'idle' })
  const [whisperProgress, setWhisperProgress] = useState<number | null>(null)

  // idle | opening (asking for the mic) | recording | busy (stopping or transcribing)
  const phaseRef = useRef<'idle' | 'opening' | 'recording' | 'busy'>('idle')
  const sessionRef = useRef(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const aliveRef = useRef(true)

  function setIfAlive(next: VoiceQuery) {
    if (aliveRef.current) setQuery(next)
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  async function finish(type: string) {
    const blob = new Blob(chunksRef.current, { type })
    chunksRef.current = []
    recorderRef.current = null
    releaseMic()
    if (blob.size === 0) {
      phaseRef.current = 'idle'
      setIfAlive({ kind: 'unmatched', text: '' })
      return
    }
    phaseRef.current = 'busy'
    setIfAlive({ kind: 'busy' })
    let next: VoiceQuery
    try {
      const result = await services.speech.transcribe(blob)
      next = result.task
        ? { kind: 'matched', text: result.text, task: result.task }
        : { kind: 'unmatched', text: result.text }
    } catch {
      next = { kind: 'unmatched', text: '' }
    }
    phaseRef.current = 'idle'
    if (aliveRef.current) setQuery(next)
  }

  async function start(): Promise<void> {
    if (phaseRef.current !== 'idle') return
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
    if (!media?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setIfAlive({ kind: 'error' })
      return
    }

    const session = ++sessionRef.current
    phaseRef.current = 'opening'
    setIfAlive({ kind: 'listening' })

    let stream: MediaStream
    try {
      stream = await media.getUserMedia({ audio: true })
    } catch (err) {
      if (session !== sessionRef.current) return
      phaseRef.current = 'idle'
      setIfAlive({ kind: isPermissionError(err) ? 'denied' : 'error' })
      return
    }
    // Cancelled while the permission prompt was open, or unmounted.
    if (session !== sessionRef.current || !aliveRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    streamRef.current = stream
    const preferred = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream)
    } catch {
      releaseMic()
      phaseRef.current = 'idle'
      setIfAlive({ kind: 'error' })
      return
    }

    const type = recorder.mimeType || preferred || 'audio/webm'
    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      clearTimer()
      void finish(type)
    }
    recorderRef.current = recorder
    phaseRef.current = 'recording'
    recorder.start()
    timerRef.current = window.setTimeout(() => stop(), MAX_RECORD_MS)
  }

  function stop(): void {
    if (phaseRef.current === 'opening') {
      // Cancel before the recorder exists: start() releases the stream it was given.
      sessionRef.current++
      phaseRef.current = 'idle'
      setIfAlive({ kind: 'idle' })
      return
    }
    if (phaseRef.current !== 'recording') return
    clearTimer()
    phaseRef.current = 'busy'
    setIfAlive({ kind: 'busy' })
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  function toggle(): void {
    if (phaseRef.current === 'opening' || phaseRef.current === 'recording') stop()
    else void start()
  }

  useEffect(() => {
    aliveRef.current = true
    const off = services.models.onProgress((event: LoadProgress) => {
      if (event.model !== 'whisper') return
      setWhisperProgress(event.status === 'downloading' ? event.progress : null)
    })
    return () => {
      aliveRef.current = false
      off()
      clearTimer()
      sessionRef.current++
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder) {
        recorder.onstop = null
        if (recorder.state !== 'inactive') recorder.stop()
      }
      releaseMic()
      phaseRef.current = 'idle'
    }
  }, [])

  return { query, whisperProgress, start, stop, toggle }
}
