import { useRef, useState, type PointerEvent } from 'react'
import type { RedactRect } from '@/types/contracts'
import { cn } from '@/ui/cn'
import { useLang } from '@/ui/i18n'
import { S } from '@/ui/strings'

interface RedactEditorProps {
  imageUrl: string
  rects: RedactRect[]
  /** On: dragging draws a box. Off: the page scrolls normally. */
  drawing: boolean
  onChange: (next: RedactRect[]) => void
}

/** Ignore accidental taps smaller than this (normalised). */
const MIN_SIDE = 0.02

type Point = { x: number; y: number }

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function rectBetween(a: Point, b: Point): RedactRect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

function boxStyle(r: RedactRect) {
  return { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }
}

/** Screenshot fitted in a frame; drag on it to draw solid dark boxes (normalised 0..1). */
export function RedactEditor({ imageUrl, rects, drawing, onChange }: RedactEditorProps) {
  const lang = useLang()
  const frameRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<Point | null>(null)
  const [aspect, setAspect] = useState(0.5)
  const [draft, setDraft] = useState<RedactRect | null>(null)

  function pointAt(e: PointerEvent<HTMLDivElement>): Point {
    const el = frameRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!drawing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointAt(e)
    startRef.current = p
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const start = startRef.current
    if (start) setDraft(rectBetween(start, pointAt(e)))
  }

  function finish(e: PointerEvent<HTMLDivElement>, commit: boolean) {
    const start = startRef.current
    startRef.current = null
    setDraft(null)
    if (!start || !commit) return
    const next = rectBetween(start, pointAt(e))
    if (next.w >= MIN_SIDE && next.h >= MIN_SIDE) onChange([...rects, next])
  }

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
      className={cn(
        'relative mx-auto select-none overflow-hidden rounded-panel bg-surface-sunk shadow-raised',
        drawing && 'touch-none cursor-crosshair',
      )}
      style={{ aspectRatio: aspect, width: `min(100%, ${(60 * aspect).toFixed(2)}dvh)` }}
    >
      <img
        src={imageUrl}
        alt={S.yourScreen[lang]}
        draggable={false}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget
          if (w && h) setAspect(w / h)
        }}
        className="pointer-events-none block size-full object-fill"
      />
      {rects.map((r, i) => (
        <div key={i} className="absolute rounded-[4px] bg-[#1B1B1B]" style={boxStyle(r)} />
      ))}
      {draft && <div className="absolute bg-[#1B1B1B]/60 outline-[3px] -outline-offset-[3px] outline-dashed outline-saffron" style={boxStyle(draft)} />}
    </div>
  )
}
