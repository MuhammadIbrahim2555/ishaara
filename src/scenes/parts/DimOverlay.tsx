import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, type MeshBasicMaterial } from 'three'
import type { Box } from '../../types/contracts'
import type { PhoneLayout } from './PhoneModel'

export type OverlayMode = 'dim' | 'ring'

interface DimOverlayProps {
  /** dim: darkens the screen with a hole at the target. ring: outline only, pulses while playing. */
  mode: OverlayMode
  box: Box
  layout: PhoneLayout
  playing: boolean
  reduced: boolean
}

const SAFFRON = '#E8A33D'
const DIM_FILL = 'rgba(31,42,43,0.55)'
const MAX_SIDE = 768

function canvasSize(layout: PhoneLayout): { W: number; H: number } {
  const ratio = layout.screenW / layout.screenH
  return ratio >= 1
    ? { W: MAX_SIDE, H: Math.max(64, Math.round(MAX_SIDE / ratio)) }
    : { W: Math.max(64, Math.round(MAX_SIDE * ratio)), H: MAX_SIDE }
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  b: { x: number; y: number; w: number; h: number },
  mode: OverlayMode,
): void {
  const long = Math.max(W, H)
  const line = Math.max(4, Math.round(long * 0.012))
  const glow = line * 2.5
  const x = b.x * W
  const y = b.y * H
  const w = b.w * W
  const h = b.h * H
  const r = Math.min(Math.max(Math.min(w, h) * 0.22, 8), long * 0.06)

  ctx.clearRect(0, 0, W, H)

  if (mode === 'dim') {
    ctx.fillStyle = DIM_FILL
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'destination-out'
    roundRectPath(ctx, x, y, w, h, r)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  // Saffron glow on the hole edge (dim) or around the target (ring).
  const pad = mode === 'ring' ? line * 1.5 : 0
  ctx.save()
  ctx.strokeStyle = SAFFRON
  ctx.lineWidth = line
  ctx.shadowColor = SAFFRON
  ctx.shadowBlur = glow
  roundRectPath(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, r + pad)
  ctx.stroke()
  ctx.stroke()
  ctx.restore()
}

/**
 * Canvas-textured plane laid over the screen. Dim mode darkens everything
 * except the target; ring mode draws a saffron outline that pulses while playing.
 */
export function DimOverlay({ mode, box, layout, playing, reduced }: DimOverlayProps) {
  const invalidate = useThree((s) => s.invalidate)
  const { W, H } = canvasSize(layout)
  const bx = box.x
  const by = box.y
  const bw = box.w
  const bh = box.h

  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return c
  }, [W, H])
  const texture = useMemo(() => new CanvasTexture(canvas), [canvas])
  const matRef = useRef<MeshBasicMaterial>(null)
  const playingRef = useRef(playing)
  const phaseRef = useRef(0)

  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawOverlay(ctx, W, H, { x: bx, y: by, w: bw, h: bh }, mode)
    texture.needsUpdate = true
    invalidate()
  }, [canvas, texture, W, H, mode, bx, by, bw, bh, invalidate])

  // Only the ring pulses, and only while the lesson is playing.
  useFrame((state, dt) => {
    const m = matRef.current
    if (!m || mode !== 'ring') return
    if (reduced || !playingRef.current) {
      m.opacity = 1
      return
    }
    phaseRef.current += Math.min(dt, 0.1)
    const wave = 0.5 + 0.5 * Math.sin((phaseRef.current / 1.4) * Math.PI * 2)
    m.opacity = 0.55 + 0.45 * wave
    state.invalidate()
  })

  return (
    <mesh position={[0, 0, layout.frontZ + 0.006]} renderOrder={1}>
      <planeGeometry args={[layout.screenW, layout.screenH]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
