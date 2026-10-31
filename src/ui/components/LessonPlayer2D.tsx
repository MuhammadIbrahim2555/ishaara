import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import type { Box, FadeLevel } from '@/types/contracts'
import { HAND_ANCHOR } from '@/scenes/parts/handAnchor'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { S, type Pair } from '@/ui/strings'
import { BigButton } from './BigButton'
import { SpeakButton } from './SpeakButton'

const HAND_POINT = '/assets/hand-point.webp'
const HAND_PRESS = '/assets/hand-press.webp'
/** The press frame's fingertip sits this much further right (fraction of the hand's width). */
const PRESS_TIP_SHIFT_U = 0.0088
/** The hand's width as a fraction of the frame (media wrapper) width. */
const HAND_WIDTH = '58%'
/** The screenshot occupies this fraction of the media box, aligned top-left; the rest is free room for the hand. */
const SHOT_FRAC = 0.82

// Preload both hand frames once so the press swap never waits on the network.
if (typeof window !== 'undefined') {
  for (const src of [HAND_POINT, HAND_PRESS]) {
    const img = new Image()
    img.src = src
  }
}

/**
 * Media area height, set in tokens.css: 420-720px on desktop, 300-480px below 640px wide.
 * A CSS variable so the 3D stage and the 2D frame share one value.
 */
export const MEDIA_HEIGHT = 'var(--media-h)'

type Timeline = ReturnType<typeof gsap.timeline>

/** Shows the point or press frame, keeping its fingertip on the target (xPercent/yPercent are of the hand's own box). */
function setHandFrame(img: HTMLImageElement | null, press: boolean) {
  if (!img) return
  img.src = press ? HAND_PRESS : HAND_POINT
  const u = HAND_ANCHOR.u + (press ? PRESS_TIP_SHIFT_U : 0)
  gsap.set(img, { xPercent: -u * 100, yPercent: -HAND_ANCHOR.v * 100 })
}

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
    // The hand sits in the media wrapper, not the screenshot, so its target is scaled to the screenshot's share of the box.
    const handAt = {
      left: `${(box.x + box.w / 2) * SHOT_FRAC * 100}%`,
      top: `${(box.y + box.h / 2) * SHOT_FRAC * 100}%`,
    }
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
      setHandFrame(hand, false)
      if (ripple) gsap.set(ripple, { xPercent: -50, yPercent: -50 })
      if (reduce || !hand || !ripple) {
        // Reduced motion: no travel, the hand simply appears on the target and briefly shows the press frame.
        if (hand) gsap.set(hand, { ...handAt, opacity: 1 })
        tl.call(setHandFrame, [hand, true])
        tl.call(setHandFrame, [hand, false], 0.25)
        tl.to({}, { duration: 1.6 })
      } else {
        tl.to(spot, { ...rect, duration: 0.6, ease: 'expo.out' }, 0)
        tl.fromTo(hand, { left: '115%', top: '115%' }, { ...handAt, duration: 0.9, ease: 'power2.inOut' }, 0.15)
        // Press: swap to the press frame for ~0.25 s, then back to the point frame.
        tl.call(setHandFrame, [hand, true])
        tl.to(hand, { scale: 0.97, duration: 0.125, yoyo: true, repeat: 1, ease: 'power1.inOut' })
        tl.call(setHandFrame, [hand, false])
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

  // The media wrapper spans the full parent width; the stage holds the screenshot and hand at the frame's size, left of centre.
  const frameStyle = {
    height: MEDIA_HEIGHT,
    width: '100%',
  }
  const stageStyle = {
    left: '6%',
    top: 0,
    height: '100%',
    width: `min(100%, calc(${MEDIA_HEIGHT} * ${aspect.toFixed(4)}))`,
  }

  return (
    // overflow-x clip keeps the life-size hand from scrolling the page sideways; vertical overflow stays visible.
    <div className="flex w-full flex-col items-center gap-4" style={{ overflowX: 'clip' }}>
      {/* The media wrapper clips the hand at its own edge, so the hand never draws over the content below. */}
      <div className="relative mx-auto max-w-[calc(100vw_-_2rem)] overflow-hidden" style={frameStyle}>
        <div className="absolute" style={stageStyle}>
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-panel bg-surface-sunk shadow-raised"
          style={{ width: `${SHOT_FRAC * 100}%`, height: `${SHOT_FRAC * 100}%` }}
        >
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
            <div
              ref={rippleRef}
              aria-hidden="true"
              className="pointer-events-none absolute size-12 rounded-full border-[3px] border-saffron opacity-0"
            />
          )}
        </div>

        {level === 1 && (
          <img
            ref={handRef}
            src={HAND_POINT}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute h-auto max-w-none"
            style={{
              left: '115%',
              top: '115%',
              width: HAND_WIDTH,
              aspectRatio: HAND_ANCHOR.aspect,
              filter: 'drop-shadow(8px 14px 14px rgba(0,0,0,.28))',
            }}
          />
        )}
        </div>
      </div>

      {level === 3 && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Copy variant="title" p={S.knowIt} />
            <SpeakButton pair={S.knowIt} voiceId="you_know_this" />
          </div>
          {onAskHint && (
            <div className="flex w-full max-w-md flex-col">
              <BigButton variant="secondary" label={S.needHint} onClick={onAskHint} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
