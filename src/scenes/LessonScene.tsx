import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import gsap from 'gsap'
import type { Group, Mesh } from 'three'
import type { Box, FadeLevel } from '../types/contracts'
import { PhoneModel, boxToWorld, phoneLayout } from './parts/PhoneModel'
import { DimOverlay } from './parts/DimOverlay'
import {
  HAND_WIDTH_RATIO,
  RealHand,
  Ripple,
  applyHandPose,
  type AnimState,
  type HandPose,
} from './parts/Finger'
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
/** Share of the frame the phone fills at rest, per axis. Leaves room below and right for the hand. */
const REST_FILL_H = 0.64
const REST_FILL_W = 0.72
/** Rest framing: the phone centre sits this share of the frame above and left of the canvas centre. */
const REST_UP = 0.12
const REST_LEFT = 0.08
/** Level 1 dolly: the camera centre sits this many hand widths down-right of the target. */
const DOLLY_AIM = 0.35
/** Hand travel time, then a short hover before the press. */
const TRAVEL_S = 1.1
const HOVER_S = 0.25
const PRESS_AT = TRAVEL_S + HOVER_S
/** How long the pressed frame stays on screen during a motion step. */
const PRESS_HOLD_S = 0.25
/** Reduced motion: how long the pressed frame shows on the target. */
const REDUCED_PRESS_MS = 400

/**
 * Camera distance at which the phone fits its REST_FILL share of the frame on each axis.
 * A portrait phone in a narrow column and a wide desktop canvas both fit with the same margin.
 */
function restDistance(bodyW: number, bodyH: number, aspect: number): number {
  const halfTan = Math.tan((FOV * Math.PI) / 360)
  const byHeight = bodyH / REST_FILL_H / (2 * halfTan)
  const byWidth = bodyW / REST_FILL_W / (2 * halfTan * aspect)
  return Math.max(byHeight, byWidth)
}

/**
 * Camera offset that puts the phone at its rest spot (up and left of centre) at the given zoom.
 * Scaled by the visible frame size, so the spot stays the same share of the canvas at any zoom.
 */
function restOffset(rest: number, zoom: number, aspect: number): { x: number; y: number } {
  const halfTan = Math.tan((FOV * Math.PI) / 360)
  const visH = 2 * (rest / zoom) * halfTan
  return { x: REST_LEFT * visH * aspect, y: -REST_UP * visH }
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
  const size = useThree((s) => s.size)

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

  const handW = layout.screenW * HAND_WIDTH_RATIO
  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1
  const rest = restDistance(layout.bodyW, layout.bodyH, aspect)
  const stateRef = useRef<AnimState>({
    camX: 0,
    camY: 0,
    zoom: FULL_ZOOM,
    rippleOn: false,
    ripple: 0,
  })
  const handPoseRef = useRef<HandPose>({ t: 0, press: 0 })
  const handRef = useRef<Group>(null)
  const shadowRef = useRef<Mesh>(null)
  const [pressed, setPressed] = useState(false)
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

  // Level 1, motion on: dolly in, hand travels in, hovers, presses, ripple, then done.
  useEffect(() => {
    if (level !== 1 || reduced || !hasBox) return
    const st = stateRef.current
    const hand = handPoseRef.current
    hand.t = 0
    hand.press = 0
    st.rippleOn = false
    st.ripple = 0

    const tl = gsap.timeline({
      paused: !playingRef.current,
      onComplete: () => doneRef.current?.(),
    })
    tl.to(
      st,
      {
        camX: tx + DOLLY_AIM * handW,
        camY: ty - DOLLY_AIM * handW,
        zoom: DOLLY_ZOOM,
        duration: 0.9,
        ease: 'expo.out',
        onUpdate: () => invalidate(),
      },
      0,
    )
    tl.to(hand, { t: 1, duration: TRAVEL_S, ease: 'expo.out', onUpdate: () => invalidate() }, 0)
    tl.to(hand, { press: 1, duration: 0.12, ease: 'power2.in', onUpdate: () => invalidate() }, PRESS_AT)
    tl.call(
      () => {
        setPressed(true)
        invalidate()
      },
      undefined,
      PRESS_AT,
    )
    tl.call(
      () => {
        setPressed(false)
        invalidate()
      },
      undefined,
      PRESS_AT + PRESS_HOLD_S,
    )
    tl.to(hand, { press: 0, duration: 0.14, ease: 'power2.out', onUpdate: () => invalidate() }, PRESS_AT + PRESS_HOLD_S)
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
      setPressed(false)
    }
  }, [active, level, reduced, hasBox, tx, ty, handW, invalidate])

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
      // Reduced motion: no travel, no dolly. The hand rests on the target and a static ring shows.
      handPoseRef.current.t = 1
      handPoseRef.current.press = 0
      st.rippleOn = true
      st.ripple = 0
    }

    const z = level === 3 ? FULL_ZOOM : CALM_ZOOM
    const off = restOffset(rest, z, aspect)
    if (reduced) {
      st.camX = off.x
      st.camY = off.y
      st.zoom = z
      invalidate()
      return
    }
    const tw = gsap.to(st, {
      camX: off.x,
      camY: off.y,
      zoom: z,
      duration: 0.9,
      ease: 'expo.out',
      onUpdate: () => invalidate(),
    })
    invalidate()
    return () => {
      tw.kill()
    }
  }, [level, reduced, hasBox, tx, ty, rest, aspect, invalidate])

  // Reduced motion: the pressed frame shows on the target for a moment, then the open hand.
  useEffect(() => {
    if (!reduced || level !== 1 || !hasBox) return
    setPressed(true)
    const id = window.setTimeout(() => setPressed(false), REDUCED_PRESS_MS)
    return () => {
      window.clearTimeout(id)
      setPressed(false)
    }
  }, [reduced, level, hasBox, active])

  // Levels 2 and 3 (and reduced motion) have no timeline, so report done straight away.
  useEffect(() => {
    const animated = level === 1 && !reduced && hasBox
    if (animated || !playingRef.current) return
    const id = window.setTimeout(() => doneRef.current?.(), 0)
    return () => window.clearTimeout(id)
  }, [active, level, reduced, hasBox])

  // Places the hand group on every rendered frame, so it lands correctly as soon as it mounts.
  useFrame(() => {
    const g = handRef.current
    if (!g) return
    applyHandPose(g, shadowRef.current, handPoseRef.current, target, handW, layout.frontZ)
  })

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
      {hasBox && level === 1 && (
        <RealHand handRef={handRef} shadowRef={shadowRef} pressed={pressed} width={handW} />
      )}
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
