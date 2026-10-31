import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { services } from '@/ui/services'
import { useUiStore } from '@/ui/store'

const STORAGE_KEY = 'ishaara.lastRoute.v1'

/** Routes worth returning to after a restart. "/" and anything else is never saved. */
const REMEMBERED: RegExp[] = [
  /^\/(home|library|progress|settings|family|join|setup|judge)$/,
  /^\/lesson\/[^/]+$/,
  /^\/check\/[^/]+$/,
  /^\/ask\/[^/]+$/,
]

function isRemembered(pathname: string): boolean {
  return REMEMBERED.some((pattern) => pattern.test(pathname))
}

/** Shortcut and Android Share launches are never saved or restored. */
function isLaunchUrl(search: string): boolean {
  try {
    const from = new URLSearchParams(search).get('from')
    return from === 'shortcut' || from === 'share'
  } catch {
    return false
  }
}

function readSaved(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw && isRemembered(raw) ? raw : null
  } catch {
    return null
  }
}

function writeSaved(pathname: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, pathname)
  } catch {
    // Storage unavailable (private window, blocked site data): the route is simply not remembered.
  }
}

/**
 * Decided once, when the module loads, before any route renders: the saved route to return to,
 * or null. Only applies when the app opens on "/", the user is onboarded, and the launch is not
 * a Shortcut or Share launch (those always win).
 */
let pendingStart: string | null = (() => {
  if (typeof window === 'undefined') return null
  if (window.location.pathname !== '/') return null
  if (isLaunchUrl(window.location.search)) return null
  if (!useUiStore.getState().settings.onboarded) return null
  return readSaved()
})()

/** True while the app should stay off "/" until the saved route is restored (Root waits for it). */
export function hasPendingRestore(): boolean {
  return pendingStart !== null
}

/**
 * Remembers the last screen the user was on and restores it on the next app start.
 * Mount once, inside the router.
 */
export function useRememberRoute(): void {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isRemembered(pathname) || isLaunchUrl(search)) return
    writeSaved(pathname)
  }, [pathname, search])

  useEffect(() => {
    const target = pendingStart
    if (target === null) return
    pendingStart = null
    void (async () => {
      let dest = target
      const match = /^\/(lesson|check)\/([^/]+)$/.exec(target)
      if (match) {
        try {
          const lesson = await services.library.get(decodeURIComponent(match[2]))
          if (!lesson) dest = '/home'
        } catch {
          dest = '/home'
        }
      }
      navigate(dest, { replace: true })
    })()
  }, [navigate])
}
