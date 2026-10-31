import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import type { PhoneLayout } from './PhoneModel'

/** Mutable animation state shared by the lesson timeline and the 3D parts. */
export interface AnimState {
  camX: number
  camY: number
  /** Camera zoom: 1 = rest framing (phone fills most of the frame), larger = closer. */
  zoom: number
  /** Finger is shown only on level 1 steps. */
  fingerOn: boolean
  /** 0 = start of the curved path (bottom-right), 1 = resting on the target. */
  fingerP: number
  /** Press depth towards the glass, already scaled by the layout. */
  dip: number
  rippleOn: boolean
  /** 0..1 ripple progress. */
  ripple: number
}

export interface TargetPoint {
  x: number
  y: number
}

const TILT = (35 * Math.PI) / 180
/** Rotation so the finger body points from the tip towards the bottom-right. */
const FINGER_ANGLE = Math.atan2(-Math.sin(TILT), -Math.cos(TILT))
const TIP_R = 0.16
const CAP_LEN = 0.9
const CLAY = '#C99A74'
const SAFFRON = '#E8A33D'

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

interface FingerProps {
  stateRef: RefObject<AnimState>
  target: TargetPoint
  layout: PhoneLayout
}

/**
 * Clay finger. The group pivot is the fingertip, so the tip sits exactly on
 * the target. Travels along a quadratic curve from the bottom-right.
 */
export function Finger({ stateRef, target, layout }: FingerProps) {
  const groupRef = useRef<Group>(null)
  const k = layout.k

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const st = stateRef.current
    g.visible = st.fingerOn
    if (!st.fingerOn) return

    const p = clamp01(st.fingerP)
    const u = 1 - p
    const restZ = layout.frontZ + TIP_R * k * 1.2
    const p0x = target.x + 2.4 * k
    const p0y = target.y - 2.2 * k
    const p0z = restZ + 1.3 * k
    const p1x = target.x + 1.4 * k
    const p1y = target.y - 0.7 * k
    const p1z = restZ + 0.8 * k

    const x = u * u * p0x + 2 * u * p * p1x + p * p * target.x
    const y = u * u * p0y + 2 * u * p * p1y + p * p * target.y
    const z = u * u * p0z + 2 * u * p * p1z + p * p * restZ
    g.position.set(x, y, z - st.dip)
  })

  return (
    <group ref={groupRef} rotation={[0, 0, FINGER_ANGLE]}>
      <group scale={k}>
        <mesh position={[0, CAP_LEN / 2 + TIP_R, 0]}>
          <capsuleGeometry args={[TIP_R, CAP_LEN, 4, 16]} />
          <meshStandardMaterial color={CLAY} roughness={0.9} />
        </mesh>
        <mesh>
          <sphereGeometry args={[TIP_R, 16, 12]} />
          <meshStandardMaterial color={CLAY} roughness={0.9} />
        </mesh>
      </group>
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
