import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import gsap from 'gsap'
import type { Box, FadeLevel } from '../types/contracts'
import { PhoneModel, boxToWorld, phoneLayout } from './parts/PhoneModel'
import { DimOverlay } from './parts/DimOverlay'
import { Finger, Ripple, type AnimState } from './parts/Finger'
import { usePrefersReducedMotion } from './parts/usePrefersReducedMotion'
import { SceneBoundary } from './parts/SceneBoundary'

export interface LessonSceneProps {
  imageUrl: string
  /** Screenshot width / height. */
  imageAspect: number
  boxes: Box[]
  active: number
  level: FadeLevel
  playing: boolean
  slow: boolean
  onStepAnimated?: () => void
}

type Timeline = ReturnType<typeof gsap.timeline>

const FOV = 30
/** Zoom 1 is the rest framing. The other zoom levels are factors relative to it. */
const FULL_ZOOM = 1
/** About 1.8x on the target for level 1 steps. */
const DOLLY_ZOOM = 1.8
/** The 1.2x framing used by levels 2 and 3 and by reduced-motion level 1. */
const CALM_ZOOM = 1.2
/** Share of the frame the phone fills at rest on its tighter axis (8% margin each side). */
const REST_FILL = 0.84
const PRESS_DIP = 0.06
const PRESS_AT = 1.1

/**
 * Camera distance at which the phone fills REST_FILL of the frame on its tighter axis.
 * A portrait phone in a narrow column and a wide desktop canvas both fit with the same margin.
 */
function restDistance(bodyW: number, bodyH: number, aspect: number): number {
  const halfTan = Math.tan((FOV * Math.PI) / 360)
  const byHeight = bodyH / REST_FILL / (2 * halfTan)
  const byWidth = bodyW / REST_FILL / (2 * halfTan * aspect)
  return Math.max(byHeight, byWidth)
}

/** Applies the shared animation state to the R3F camera on each rendered frame. Distance follows the canvas shape. */
function CameraRig({
  stateRef,
  bodyW,
  bodyH,
}: {
  stateRef: RefObject<AnimState>
  bodyW: number
  bodyH: number
}) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)

  // The canvas changed shape: redraw so the rest distance is recomputed.
  useEffect(() => {
    invalidate()
  }, [width, height, bodyW, bodyH, invalidate])

  useFrame(() => {
    const st = stateRef.current
    const aspect = width > 0 && height > 0 ? width / height : 1
    const rest = restDistance(bodyW, bodyH, aspect)
    camera.position.set(st.camX, st.camY, rest / st.zoom)
    camera.lookAt(st.camX, st.camY, 0)
  })
  return null
}

function LessonContent(props: LessonSceneProps) {
  const { imageUrl, imageAspect, boxes, active, level, playing, slow, onStepAnimated } = props
  const reduced = usePrefersReducedMotion()
  const invalidate = useThree((s) => s.invalidate)

  const layout = useMemo(() => phoneLayout(imageAspect), [imageAspect])
  const box: Box | undefined = boxes[active]
  const hasBox = box !== undefined
  const bx = box?.x ?? 0
  const by = box?.y ?? 0
  const bw = box?.w ?? 0
  const bh = box?.h ?? 0
  const target = useMemo(() => boxToWorld({ x: bx, y: by, w: bw, h: bh }, layout), [bx, by, bw, bh, layout])
  const tx = target.x
  const ty = target.y

  const stateRef = useRef<AnimState>({
    camX: 0,
    camY: 0,
    zoom: FULL_ZOOM,
    fingerOn: false,
    fingerP: 0,
    dip: 0,
    rippleOn: false,
    ripple: 0,
  })
  const tlRef = useRef<Timeline | null>(null)
  const playingRef = useRef(playing)
  const slowRef = useRef(slow)
  const doneRef = useRef(onStepAnimated)

  // Keep the latest props in refs so timelines are not rebuilt on every render.
  useEffect(() => {
    playingRef.current = playing
    slowRef.current = slow
    doneRef.current = onStepAnimated
  })

  // Level 1, motion on: dolly in, finger travels, presses, ripple, then done.
  useEffect(() => {
    if (level !== 1 || reduced || !hasBox) return
    const st = stateRef.current
    const k = layout.k
    st.fingerOn = true
    st.fingerP = 0
    st.dip = 0
    st.rippleOn = false
    st.ripple = 0

    const tl = gsap.timeline({
      paused: !playingRef.current,
      onComplete: () => doneRef.current?.(),
    })
    tl.to(st, { camX: tx, camY: ty, zoom: DOLLY_ZOOM, duration: 0.9, ease: 'expo.out', onUpdate: () => invalidate() }, 0)
    tl.to(st, { fingerP: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: () => invalidate() }, 0)
    tl.to(st, { dip: PRESS_DIP * k, duration: 0.12, ease: 'power2.in', onUpdate: () => invalidate() }, PRESS_AT)
    tl.to(st, { dip: 0, duration: 0.14, ease: 'power2.out', onUpdate: () => invalidate() }, PRESS_AT + 0.12)
    tl.fromTo(
      st,
      { ripple: 0 },
      {
        ripple: 1,
        duration: 0.6,
        ease: 'sine.out',
        onStart: () => {
          st.rippleOn = true
        },
        onUpdate: () => invalidate(),
        onComplete: () => {
          st.rippleOn = false
        },
      },
      PRESS_AT,
    )
    tl.timeScale(slowRef.current ? 0.6 : 1)
    tlRef.current = tl
    invalidate()

    return () => {
      tl.kill()
      tlRef.current = null
    }
  }, [active, level, reduced, hasBox, tx, ty, layout.k, invalidate])

  // Pause or resume the running step.
  useEffect(() => {
    const tl = tlRef.current
    if (!tl) return
    if (playing) tl.play()
    else tl.pause()
  }, [playing])

  useEffect(() => {
    tlRef.current?.timeScale(slow ? 0.6 : 1)
  }, [slow])

  // Camera and finger for everything that is not the animated level 1 step.
  useEffect(() => {
    const animated = level === 1 && !reduced && hasBox
    if (animated) return
    const st = stateRef.current

    if (level === 1 && hasBox) {
      // Reduced motion: no travel, no dolly. Finger and a static ring rest on the target.
      st.fingerOn = true
      st.fingerP = 1
      st.dip = 0
      st.rippleOn = true
      st.ripple = 0
    } else {
      st.fingerOn = false
    }

    const z = level === 3 ? FULL_ZOOM : CALM_ZOOM
    if (reduced) {
      st.camX = 0
      st.camY = 0
      st.zoom = z
      invalidate()
      return
    }
    const tw = gsap.to(st, {
      camX: 0,
      camY: 0,
      zoom: z,
      duration: 0.9,
      ease: 'expo.out',
      onUpdate: () => invalidate(),
    })
    invalidate()
    return () => {
      tw.kill()
    }
  }, [level, reduced, hasBox, tx, ty, invalidate])

  // Levels 2 and 3 (and reduced motion) have no timeline, so report done straight away.
  useEffect(() => {
    const animated = level === 1 && !reduced && hasBox
    if (animated || !playingRef.current) return
    const id = window.setTimeout(() => doneRef.current?.(), 0)
    return () => window.clearTimeout(id)
  }, [active, level, reduced, hasBox])

  const shadowKey = `${layout.bodyW.toFixed(3)}x${layout.bodyH.toFixed(3)}`

  return (
    <>
      <CameraRig stateRef={stateRef} bodyW={layout.bodyW} bodyH={layout.bodyH} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-3, 4, 5]} intensity={1.1} />

      <PhoneModel imageUrl={imageUrl} layout={layout} />

      {hasBox && level === 1 && (
        <DimOverlay mode="dim" box={box} layout={layout} playing={playing} reduced={reduced} />
      )}
      {hasBox && level === 2 && (
        <DimOverlay mode="ring" box={box} layout={layout} playing={playing} reduced={reduced} />
      )}
      {hasBox && level === 1 && <Finger stateRef={stateRef} target={target} layout={layout} />}
      {hasBox && level === 1 && <Ripple stateRef={stateRef} target={target} layout={layout} />}

      <ContactShadows
        key={shadowKey}
        position={[0, -layout.bodyH / 2 - 0.12, 0]}
        opacity={0.35}
        scale={layout.bodyW * 2.6}
        blur={2.4}
        far={1.2}
        frames={1}
      />
    </>
  )
}

export default function LessonScene(props: LessonSceneProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneBoundary
        fallback={<img src={props.imageUrl} alt="" style={{ display: 'block', width: '100%', height: 'auto' }} />}
      >
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
          camera={{ fov: FOV, position: [0, 0, 6] }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <LessonContent {...props} />
        </Canvas>
      </SceneBoundary>
    </div>
  )
}
