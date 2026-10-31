import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, RoundedBox } from '@react-three/drei'
import type { Group, Texture } from 'three'
import { useTextureSafe } from './parts/useTextureSafe'
import { usePrefersReducedMotion } from './parts/usePrefersReducedMotion'
import { SceneBoundary } from './parts/SceneBoundary'

const DEG = Math.PI / 180
const BOB_PERIOD = 4
const BOB_AMP = 0.08
const SWAY_DEG = 4
const WAVE_DEG = 12
const WAVE_START = 0.6
const WAVE_PERIOD = 1
const WAVE_COUNT = 3

const PHONE_X = -0.35
const SCREEN_W = 0.9
const SCREEN_H = 1.95
const BEZEL = 0.2
const DEPTH = 0.28
const BODY_W = SCREEN_W + BEZEL * 2
const BODY_H = SCREEN_H + BEZEL * 2
const FRONT_Z = DEPTH / 2
const LOGO_MAX = 0.7
const HAND_H = 0.95
const HAND_X = 0.5
const HAND_Y = -0.7

/** Width / height of a loaded texture, or 1 while it is still unknown. */
function textureAspect(tex: Texture | null): number {
  const img = tex?.image as { width?: number; height?: number } | undefined
  const w = img?.width ?? 0
  const h = img?.height ?? 0
  return w > 0 && h > 0 ? w / h : 1
}

function WelcomeContent({ reduced }: { reduced: boolean }) {
  const logo = useTextureSafe('/assets/logo-mark.webp')
  const hand = useTextureSafe('/assets/helper-hand.webp')
  const phoneRef = useRef<Group>(null)
  const handRef = useRef<Group>(null)

  const logoAspect = textureAspect(logo)
  const logoW = logoAspect >= 1 ? LOGO_MAX : LOGO_MAX * logoAspect
  const logoH = logoAspect >= 1 ? LOGO_MAX / logoAspect : LOGO_MAX
  const handAspect = textureAspect(hand)
  const handW = HAND_H * handAspect
  // Hand geometry is offset so the group origin sits at the wrist (bottom-left).
  const handOffset: [number, number, number] = [handW / 2, HAND_H / 2, 0]

  useFrame((state) => {
    if (reduced) return
    const t = state.clock.elapsedTime
    const phone = phoneRef.current
    if (phone) {
      const phase = (t * Math.PI * 2) / BOB_PERIOD
      phone.position.y = Math.sin(phase) * BOB_AMP
      phone.rotation.z = Math.sin(phase + 0.8) * SWAY_DEG * DEG
    }
    const handGroup = handRef.current
    if (handGroup) {
      const w = t - WAVE_START
      const waving = w >= 0 && w < WAVE_COUNT * WAVE_PERIOD
      handGroup.rotation.z = waving ? Math.sin((w * Math.PI * 2) / WAVE_PERIOD) * WAVE_DEG * DEG : 0
    }
  })

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[-3, 4, 5]} intensity={1.1} />

      <group ref={phoneRef} position={[PHONE_X, 0, 0]}>
        <RoundedBox args={[BODY_W, BODY_H, DEPTH]} radius={0.2} smoothness={4}>
          <meshStandardMaterial color="#0F5257" roughness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0, FRONT_Z + 0.002]}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial color="#F3ECE1" toneMapped={false} />
        </mesh>
        {logo && (
          <mesh position={[0, 0, FRONT_Z + 0.004]}>
            <planeGeometry args={[logoW, logoH]} />
            <meshBasicMaterial key={logo.uuid} map={logo} transparent toneMapped={false} />
          </mesh>
        )}
      </group>

      {hand && (
        <group ref={handRef} position={[HAND_X, HAND_Y, 0.1]}>
          <mesh position={handOffset}>
            <planeGeometry args={[handW, HAND_H]} />
            <meshBasicMaterial key={hand.uuid} map={hand} transparent toneMapped={false} />
          </mesh>
        </group>
      )}

      <ContactShadows
        position={[PHONE_X, -BODY_H / 2 - 0.12, 0]}
        opacity={0.35}
        scale={3}
        blur={2.4}
        far={1.2}
        frames={1}
      />
    </>
  )
}

export default function WelcomeScene() {
  const reduced = usePrefersReducedMotion()

  return (
    <SceneBoundary
      fallback={
        <img
          src="/assets/logo-mark.webp"
          alt=""
          style={{ display: 'block', height: 200, margin: '0 auto' }}
        />
      }
    >
      <div style={{ position: 'relative', width: '100%', height: 320 }}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop={reduced ? 'demand' : 'always'}
          camera={{ fov: 30, position: [0, 0, 6] }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <WelcomeContent reduced={reduced} />
        </Canvas>
      </div>
    </SceneBoundary>
  )
}
