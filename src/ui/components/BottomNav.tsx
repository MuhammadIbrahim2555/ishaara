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

/**
 * 76px fixed bottom navigation, plus the device's bottom safe area. Active item gets a teal-100 pill behind its icon.
 * Screens that show it reserve space with the bottom padding in Screen.
 */
export function BottomNav() {
  const lang = useLang()
  return (
    <nav
      aria-label={S.mainMenu[lang]}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-surface-sunk bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid h-[76px] grid-cols-4">
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
                    <Icon className="size-6" />
                  </span>
                  <Localized
                    as="span"
                    p={label}
                    className={cn(
                      'font-bold',
                      lang === 'ur'
                        ? 'py-[0.1em] text-[0.9375rem] leading-[1.9]'
                        : 'text-[0.8125rem] leading-[1.3]',
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
