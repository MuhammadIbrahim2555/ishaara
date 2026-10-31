import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/ui/cn'
import { useLang } from '@/ui/i18n'
import { IconCheck, IconHome, IconPlay, IconSettings, type IconProps } from '@/ui/icons'
import { S, type Pair } from '@/ui/strings'
import { Localized } from './UrduText'

const ITEMS: { to: string; label: Pair; Icon: ComponentType<IconProps> }[] = [
  { to: '/home', label: S.navHome, Icon: IconHome },
  { to: '/library', label: S.navVideos, Icon: IconPlay },
  { to: '/progress', label: S.navProgress, Icon: IconCheck },
  { to: '/settings', label: S.navSettings, Icon: IconSettings },
]

/** 72px fixed bottom navigation. Active item gets a teal-100 pill behind its icon. */
export function BottomNav() {
  const lang = useLang()
  return (
    <nav
      aria-label={S.mainMenu[lang]}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-surface-sunk bg-surface"
    >
      <ul className="grid h-18 grid-cols-4">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} className="flex h-full flex-col items-center justify-center gap-1">
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-9 w-16 items-center justify-center rounded-pill transition-colors duration-[180ms]',
                      isActive ? 'bg-teal-100 text-teal-900' : 'text-ink-soft',
                    )}
                  >
                    <Icon className="size-7" />
                  </span>
                  <Localized
                    as="span"
                    p={label}
                    className={cn(
                      'text-label font-bold leading-none',
                      isActive ? 'text-teal-900' : 'text-ink-soft',
                    )}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
