import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/ui/cn'
import { useShortcutLaunch } from '@/ui/hooks/useShortcutLaunch'
import { BottomNav } from './BottomNav'

interface ScreenProps {
  children?: ReactNode
  /** Right-hand column on wide screens (used with split). */
  aside?: ReactNode
  /** Two columns from 1024px. Children go in the left column, aside on the right. */
  split?: boolean
  /** Shows the bottom navigation. */
  nav?: boolean
  className?: string
}

/** Page wrapper: 480px column on phones, fade and 12px rise on enter (none under reduced motion). */
export function Screen({ children, aside, split = false, nav = false, className }: ScreenProps) {
  const reduce = useReducedMotion()
  useShortcutLaunch()
  return (
    <>
      <motion.main
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-6 px-4 pt-4',
          // 76px bottom nav + 16px breathing room + device bottom safe area.
          nav ? 'pb-[calc(92px_+_env(safe-area-inset-bottom))]' : 'pb-10',
          split && 'lg:max-w-[1120px]',
          className,
        )}
      >
        {split ? (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-12">
            <div className="flex flex-col gap-6">{children}</div>
            <div className="flex flex-col gap-6">{aside}</div>
          </div>
        ) : (
          children
        )}
      </motion.main>
      {nav && <BottomNav />}
    </>
  )
}
