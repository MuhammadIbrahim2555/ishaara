import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import type { Box, FadeLevel } from '@/types/contracts'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { S, type Pair } from '@/ui/strings'
import { BigButton } from './BigButton'
import { SpeakButton } from './SpeakButton'

const HAND = '/assets/helper-hand.webp'
/** Fingertip of helper-hand.webp as a fraction of the picture (top-left is 0,0). */
const TIP_X = 0.24
const TIP_Y = 0.18
/** Media area height: fills most of the viewport but stays within 420-720px. */
export const MEDIA_HEIGHT = 'clamp(420px, 62vh, 720px)'

type Timeline = ReturnType<typeof gsap.timeline>

function boxRect(box: Box) {
  return { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }
}

function boxCentre(box: Box) {
  return { left: `${(box.x + box.w / 2) * 100}%`, top: `${(box.y + box.h / 2) * 100}%` }
}

/** Text in the current UI language only. Titles get the heading size; body text gets bodyClass. */
function Copy({ p, variant = 'body', className }: { p: Pair; variant?: 'title' | 'body'; className?: string }) {
  const lang = useLang()
  const size =
    variant === 'title'
      ? lang === 'ur'
        ? 'text-ur-title'
        : 'text-[1.75rem] font-bold leading-snug'
      : bodyClass(lang)
  return (
    <p {...langAttrs(lang)} className={cn(size, className)}>
      {p[lang]}
    </p>
  )
}

export interface LessonPlayer2DProps {
  imageUrl: string
  boxes: Box[]
  /** Index of the step to show. The parent advances it. */
  active: number
  level: FadeLevel
  playing: boolean
  slow: boolean
  /** Called when the current step's animation has finished. */
  onStepAnimated?: () => void
  /** Level 3 only: the learner asks for the outline hint (switches to level 2). */
  onAskHint?: () => void
}

/**
 * Flat lesson player for simple mode, no WebGL, or the fallback when the 3D scene fails.
 * Level 1: spotlight, hand presses the target. Level 2: pulsing outline only. Level 3: plain image.
 */
export function LessonPlayer2D({
  imageUrl,
  boxes,
  active,
  level,
  playing,
  slow,
  onStepAnimated,
  onAskHint,
}: LessonPlayer2DProps) {
  const reduce = useReducedMotion()
  const [aspect, setAspect] = useState(0.5)
  const spotRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLImageElement>(null)
  const rippleRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<Timeline | null>(null)
  const placedRef = useRef(false)
  const live = useRef({ playing, slow, onStepAnimated })

  useEffect(() => {
    live.current = { playing, slow, onStepAnimated }
  })

  // Build the animation for the current step. Runs when the step or level changes.
  useEffect(() => {
    const spot = spotRef.current
    const box = boxes[active]
    if (!spot || !box || level === 3) {
      tlRef.current = null
      return
    }
    const rect = boxRect(box)
    const at = boxCentre(box)
    const hand = handRef.current
    const ripple = rippleRef.current

    if (!placedRef.current || reduce) gsap.set(spot, rect)
    placedRef.current = true

    const tl = gsap.timeline({
      paused: !live.current.playing,
      onComplete: () => live.current.onStepAnimated?.(),
    })
    tl.timeScale(live.current.slow ? 0.6 : 1)

    if (level === 1) {
      if (hand) gsap.set(hand, { xPercent: -TIP_X * 100, yPercent: -TIP_Y * 100 })
      if (ripple) gsap.set(ripple, { xPercent: -50, yPercent: -50 })
      if (reduce || !hand || !ripple) {
        // Reduced motion: no travel, the hand simply appears on the target.
        if (hand) gsap.set(hand, { ...at, opacity: 1 })
        tl.to({}, { duration: 1.6 })
      } else {
        tl.to(spot, { ...rect, duration: 0.6, ease: 'expo.out' }, 0)
        tl.fromTo(hand, { left: '115%', top: '115%' }, { ...at, duration: 0.9, ease: 'power2.inOut' }, 0.15)
        tl.to(hand, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' })
        tl.fromTo(
          ripple,
          { ...at, scale: 0.6, opacity: 0.9 },
          { scale: 2.2, opacity: 0, duration: 0.6, ease: 'power2.out' },
        )
        tl.to({}, { duration: 0.5 })
      }
    } else {
      if (reduce) {
        tl.to({}, { duration: 1.6 })
      } else {
        tl.to(spot, { ...rect, duration: 0.5, ease: 'expo.out' }, 0)
        tl.to(spot, { scale: 1.06, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.5)
        tl.to({}, { duration: 0.4 })
      }
    }

    tlRef.current = tl
    return () => {
      tl.kill()
      if (tlRef.current === tl) tlRef.current = null
    }
  }, [active, level, reduce, boxes])

  // Play / pause the current step.
  useEffect(() => {
    const tl = tlRef.current
    if (!tl) return
    if (playing) tl.play()
    else tl.pause()
  }, [playing])

  // Slow motion.
  useEffect(() => {
    tlRef.current?.timeScale(slow ? 0.6 : 1)
  }, [slow])

  const frameStyle = {
    height: MEDIA_HEIGHT,
    width: `min(100%, calc(${MEDIA_HEIGHT} * ${aspect.toFixed(4)}))`,
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative mx-auto overflow-hidden rounded-panel bg-surface-sunk shadow-raised" style={frameStyle}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            if (w && h) setAspect(w / h)
          }}
          className="block size-full select-none object-contain"
        />

        {level !== 3 && (
          <div
            ref={spotRef}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute rounded-[14px]',
              level === 1
                ? 'shadow-[0_0_0_9999px_rgba(31,42,43,0.55)] outline-[3px] outline-offset-2 outline-saffron'
                : 'border-[3px] border-saffron',
            )}
          />
        )}

        {level === 1 && (
          <>
            <div
              ref={rippleRef}
              aria-hidden="true"
              className="pointer-events-none absolute size-12 rounded-full border-[3px] border-saffron opacity-0"
            />
            <img
              ref={handRef}
              src={HAND}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute aspect-square w-[22%] max-w-none"
              style={{ left: '115%', top: '115%' }}
            />
          </>
        )}
      </div>

      {level === 3 && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Copy variant="title" p={S.knowIt} />
            <SpeakButton pair={S.knowIt} voiceId="you_know_this" />
          </div>
          {onAskHint && (
            <div className="flex w-full max-w-md items-center gap-3">
              <div className="min-w-0 flex-1">
                <BigButton variant="secondary" label={S.needHint} onClick={onAskHint} />
              </div>
              <SpeakButton pair={S.needHint} voiceId="need_hint" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
