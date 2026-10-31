import { RoundedBox } from '@react-three/drei'
import type { Box } from '../../types/contracts'
import { useTextureSafe } from './useTextureSafe'

/**
 * Scene units. The brief's screen height (3.2) is scaled by SCENE_SCALE so the
 * whole phone fits the z=6, fov 30 frame (visible height there is about 3.2).
 */
const SCENE_SCALE = 0.8
const SCREEN_H = 3.2 * SCENE_SCALE
const BEZEL = 0.18
const DEPTH = 0.26
const RADIUS = 0.2
const MAX_BODY_W = 2.4
const MAX_BODY_H = 2.8
const FALLBACK_ASPECT = 9 / 19.5

export interface PhoneLayout {
  /** Uniform shrink factor applied to the whole phone (1 = full size). */
  k: number
  screenW: number
  screenH: number
  bodyW: number
  bodyH: number
  depth: number
  bezel: number
  radius: number
  /** z coordinate of the glass surface. */
  frontZ: number
}

/** Centre-based rectangle in scene units on the screen plane. */
export interface WorldRect {
  x: number
  y: number
  w: number
  h: number
}

/** Computes phone dimensions from the screenshot aspect (width / height). */
export function phoneLayout(aspect: number): PhoneLayout {
  const a = Number.isFinite(aspect) && aspect > 0.05 ? aspect : FALLBACK_ASPECT
  const screenH0 = SCREEN_H
  const screenW0 = screenH0 * a
  const bodyW0 = screenW0 + 2 * BEZEL
  const bodyH0 = screenH0 + 2 * BEZEL
  const k = Math.min(1, MAX_BODY_W / bodyW0, MAX_BODY_H / bodyH0)

  const screenW = screenW0 * k
  const screenH = screenH0 * k
  const bezel = BEZEL * k
  const depth = DEPTH * k
  return {
    k,
    screenW,
    screenH,
    bodyW: screenW + 2 * bezel,
    bodyH: screenH + 2 * bezel,
    depth,
    bezel,
    radius: RADIUS * k,
    frontZ: depth / 2,
  }
}

/**
 * Converts a normalised Box (0..1, top-left origin) into a centre-based rect
 * on the screen plane. The screen is centred on the origin and y points up,
 * so the y axis is inverted relative to the image.
 */
export function boxToWorld(box: Box, layout: PhoneLayout): WorldRect {
  return {
    x: (box.x + box.w / 2 - 0.5) * layout.screenW,
    y: (0.5 - (box.y + box.h / 2)) * layout.screenH,
    w: box.w * layout.screenW,
    h: box.h * layout.screenH,
  }
}

interface PhoneModelProps {
  imageUrl: string
  layout: PhoneLayout
}

/** Teal clay phone body with the screenshot on its glass. */
export function PhoneModel({ imageUrl, layout }: PhoneModelProps) {
  const tex = useTextureSafe(imageUrl)

  return (
    <group>
      <RoundedBox args={[layout.bodyW, layout.bodyH, layout.depth]} radius={layout.radius} smoothness={4}>
        <meshStandardMaterial color="#0F5257" roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0, layout.frontZ + 0.002]}>
        <planeGeometry args={[layout.screenW, layout.screenH]} />
        {/* Keyed so the material is rebuilt when the texture arrives or changes. */}
        <meshBasicMaterial
          key={tex ? tex.uuid : 'fallback'}
          map={tex}
          color={tex ? '#ffffff' : '#F3ECE1'}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
