import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { Sprite, Texture } from 'three'
import { useTextureSafe } from './parts/useTextureSafe'
import { usePrefersReducedMotion } from './parts/usePrefersReducedMotion'
import { SceneBoundary } from './parts/SceneBoundary'

export interface ShabashBurstProps {
  onDone?: () => void
}

const COUNT = 14
const DURATION = 1.6
const FADE_START = 1.0
const GRAVITY = 3.5
const START_Y = -0.3

interface Particle {
  vx: number
  vy: number
  scale: number
  spin: number
}

/** Random burst for each star. Reduced motion gives one still star. */
function makeParticles(reduced: boolean): Particle[] {
  if (reduced) return [{ vx: 0, vy: 0, scale: 0.5, spin: 0 }]
  return Array.from({ length: COUNT }, () => ({
    vx: (Math.random() * 2 - 1) * 1.6,
    vy: 2.6 + Math.random() * 1.6,
    scale: 0.32 + Math.random() * 0.22,
    spin: (Math.random() * 2 - 1) * 1.5,
  }))
}

interface BurstProps {
  texture: Texture | null
  reduced: boolean
}

function Burst({ texture, reduced }: BurstProps) {
  const invalidate = useThree((s) => s.invalidate)
  const particles = useMemo(() => makeParticles(reduced), [reduced])
  const spriteRefs = useRef<(Sprite | null)[]>([])
  const startRef = useRef<number | null>(null)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (startRef.current === null) startRef.current = now
    const t = now - startRef.current
    const g = reduced ? 0 : GRAVITY
    const y0 = reduced ? 0 : START_Y
    const fade =
      t < FADE_START ? 1 : Math.max(0, 1 - (t - FADE_START) / (DURATION - FADE_START))

    particles.forEach((p, i) => {
      const sprite = spriteRefs.current[i]
      if (!sprite) return
      sprite.position.set(p.vx * t, y0 + p.vy * t - 0.5 * g * t * t, 0)
      sprite.material.rotation = p.spin * t
      sprite.material.opacity = fade
    })

    if (t < DURATION) invalidate()
  })

  // No texture means nothing is drawn; onDone still fires from the parent timer.
  if (!texture) return null

  return (
    <>
      {particles.map((p, i) => (
        <sprite
          key={i}
          ref={(el: Sprite | null) => {
            spriteRefs.current[i] = el
          }}
          scale={p.scale}
        >
          <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

function BurstContent({ reduced }: { reduced: boolean }) {
  const star = useTextureSafe('/assets/icon-star.webp')
  return <Burst texture={star} reduced={reduced} />
}

/** Clay stars burst up from the centre and fade out. Calls onDone after 1.6 s. */
export default function ShabashBurst({ onDone }: ShabashBurstProps) {
  const reduced = usePrefersReducedMotion()
  const doneRef = useRef(onDone)

  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const id = window.setTimeout(() => doneRef.current?.(), DURATION * 1000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <SceneBoundary fallback={null}>
      <div style={{ position: 'relative', width: '100%', height: 300, pointerEvents: 'none' }} aria-hidden="true">
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
          camera={{ fov: 30, position: [0, 0, 6] }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <BurstContent reduced={reduced} />
        </Canvas>
      </div>
    </SceneBoundary>
  )
}
