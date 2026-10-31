import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import type { PhoneLayout } from './PhoneModel'
import { HAND_ANCHOR } from './handAnchor'
import { useTextureSafe } from './useTextureSafe'

/** Mutable animation state shared by the lesson timeline and the 3D parts. */
export interface AnimState {
  camX: number
  camY: number
  /** Camera zoom: 1 = rest framing (phone fills most of the frame), larger = closer. */
  zoom: number
  rippleOn: boolean
  /** 0..1 ripple progress. */
  ripple: number
}

/** Hand progress, written by the lesson timeline and applied to the hand group each frame. */
export interface HandPose {
  /** 0 = start of the curved path (bottom-right, above the glass), 1 = resting on the target. */
  t: number
  /** 0 = open, 1 = pressed against the glass. */
  press: number
}

export interface TargetPoint {
  x: number
  y: number
}

/** Hand width as a share of the phone screen width. 1.0 = life-size. */
export const HAND_WIDTH_RATIO = 1.0

const POINT_URL = '/assets/hand-point.webp'
const PRESS_URL = '/assets/hand-press.webp'
/** Press frame's fingertip sits this far right of the open frame's, as a share of the picture width. */
const PRESS_SHIFT_U = 0.0088
/** Start of the path, as offsets from the target in hand widths. */
const START_OFFSET = { x: 1.2, y: -1.1 }
/** Bezier control point, in hand widths from the target. Bows the path towards the right. */
const CURVE_CONTROL = { x: 0.9, y: -0.2 }
/** Height above the glass, in scene units. */
const START_Z = 0.25
const REST_Z = 0.04
const PRESS_Z = 0.01
const START_ROT = 0.25
const PRESS_SCALE = 0.97
const SHADOW_SCALE = 1.04
const SHADOW_Z = -0.002
const SHADOW_LOOSE = { x: 0.04, y: -0.06, opacity: 0.22 }
const SHADOW_TIGHT = { x: 0.015, y: -0.02, opacity: 0.35 }
const SAFFRON = '#E8A33D'

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Plane size and centre offset that puts the fingertip at the group origin. */
function handGeometry(width: number): { height: number; x: number; y: number } {
  const height = width / HAND_ANCHOR.aspect
  return {
    height,
    x: width * (0.5 - HAND_ANCHOR.u),
    y: -height * (0.5 - HAND_ANCHOR.v),
  }
}

/**
 * Moves the hand group and tightens its contact shadow for the given pose.
 * The group origin is the fingertip, so the tip lands on the target.
 */
export function applyHandPose(
  group: Group,
  shadow: Mesh | null,
  pose: HandPose,
  target: TargetPoint,
  width: number,
  frontZ: number,
): void {
  const t = clamp01(pose.t)
  const p = clamp01(pose.press)
  const inv = 1 - t
  const w = width

  // Quadratic curve from the start offset to the target (the target itself is the end point).
  group.position.set(
    target.x + inv * inv * START_OFFSET.x * w + 2 * inv * t * CURVE_CONTROL.x * w,
    target.y + inv * inv * START_OFFSET.y * w + 2 * inv * t * CURVE_CONTROL.y * w,
    frontZ + lerp(START_Z, REST_Z, t) + lerp(0, PRESS_Z - REST_Z, p),
  )
  group.rotation.z = START_ROT * inv
  group.scale.setScalar(lerp(1, PRESS_SCALE, p))

  if (shadow) {
    const { x, y } = handGeometry(w)
    shadow.position.set(
      x + w * lerp(SHADOW_LOOSE.x, SHADOW_TIGHT.x, p),
      y + w * lerp(SHADOW_LOOSE.y, SHADOW_TIGHT.y, p),
      SHADOW_Z,
    )
    const mat = shadow.material as MeshBasicMaterial
    mat.opacity = lerp(SHADOW_LOOSE.opacity, SHADOW_TIGHT.opacity, p)
  }
}

interface RealHandProps {
  handRef: RefObject<Group | null>
  shadowRef: RefObject<Mesh | null>
  /** Shows the pressed frame while true. */
  pressed: boolean
  /** Plane width in scene units. */
  width: number
}

/**
 * Photoreal hand billboard with a soft contact shadow behind it. The group
 * origin is the fingertip; the lesson timeline moves the group and the shadow.
 */
export function RealHand({ handRef, shadowRef, pressed, width }: RealHandProps) {
  const point = useTextureSafe(POINT_URL)
  const press = useTextureSafe(PRESS_URL)
  const { height, x, y } = handGeometry(width)
  const handX = pressed ? x - PRESS_SHIFT_U * width : x

  // Memoised so React never rewrites the shadow position; the timeline owns it after mount.
  const shadowPos = useMemo(
    () => [x + SHADOW_LOOSE.x * width, y + SHADOW_LOOSE.y * width, SHADOW_Z] as [number, number, number],
    [x, y, width],
  )

  if (!point || !press) return null
  const map = pressed ? press : point

  return (
    <group ref={handRef}>
      <mesh ref={shadowRef} position={shadowPos} scale={SHADOW_SCALE} renderOrder={5}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color="black"
          map={map}
          transparent
          opacity={SHADOW_LOOSE.opacity}
          alphaTest={0.02}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[handX, y, 0]} renderOrder={6}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={map}
          transparent
          alphaTest={0.02}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

interface RippleProps {
  stateRef: RefObject<AnimState>
  target: TargetPoint
  layout: PhoneLayout
}

/** Ring at the target that scales 1 to 2.2 and fades as the finger presses. */
export function Ripple({ stateRef, target, layout }: RippleProps) {
  const ringRef = useRef<Mesh>(null)
  const matRef = useRef<MeshBasicMaterial>(null)
  const k = layout.k

  useFrame(() => {
    const m = ringRef.current
    const mat = matRef.current
    if (!m || !mat) return
    const st = stateRef.current
    m.visible = st.rippleOn
    if (!st.rippleOn) return
    const p = clamp01(st.ripple)
    m.scale.setScalar(1 + 1.2 * p)
    mat.opacity = 1 - p
  })

  return (
    <mesh ref={ringRef} position={[target.x, target.y, layout.frontZ + 0.02]} renderOrder={2}>
      <ringGeometry args={[0.14 * k, 0.18 * k, 32]} />
      <meshBasicMaterial ref={matRef} color={SAFFRON} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
