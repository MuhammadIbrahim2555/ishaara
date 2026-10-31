import { useRef, type PointerEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/ui/cn'
import type { Pair } from '@/ui/strings'
import { BiLabel } from './BiLabel'

interface TaskTileProps {
  label: Pair
  image: string
  onSelect: () => void
}

/** Whole tile is one button. Tilts up to 6deg toward the pointer (mouse only, off under reduced motion). */
export function TaskTile({ label, image, onSelect }: TaskTileProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduce = useReducedMotion()

  function tilt(e: PointerEvent<HTMLButtonElement>) {
    const el = ref.current
    if (!el || reduce || e.pointerType !== 'mouse') return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(720px) rotateX(${(-py * 12).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg)`
  }

  function untilt() {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <button
      ref={ref}
      type="button"
      data-control=""
      onClick={onSelect}
      onPointerMove={tilt}
      onPointerLeave={untilt}
      onBlur={untilt}
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-3 rounded-tile bg-surface p-4 shadow-raised will-change-transform transition-[transform,box-shadow] duration-[180ms] ease-out hover:shadow-lifted active:shadow-raised motion-safe:active:scale-[0.98]',
      )}
    >
      <img src={image} alt="" className="size-24 rounded-[20px] bg-surface-sunk object-contain" />
      <BiLabel label={label} />
    </button>
  )
}
