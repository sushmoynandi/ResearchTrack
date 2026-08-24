'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme'

export type { ThemePreference, ResolvedTheme }

type ThemeContextValue = {
  /** The saved preference — light, dark, or system. */
  theme: ThemePreference
  /** The theme actually on screen. "system" is already resolved here. */
  resolvedTheme: ResolvedTheme
  setTheme: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function prefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function resolve(theme: ThemePreference): ResolvedTheme {
  if (theme === 'system') return prefersLight() ? 'light' : 'dark'
  return theme
}

/** The colour a phone paints its browser chrome, per theme. */
const BROWSER_CHROME = { light: '#f7f9fb', dark: '#101319' } as const

/**
 * The root layout ships two <meta name="theme-color"> tags, one per system
 * preference. That is right for "follow my computer" but wrong for someone on
 * a dark laptop who chose the light theme, so an explicit choice pins both
 * tags to the same colour and "system" hands them back to the media queries.
 */
function syncBrowserChrome(theme: ThemePreference, resolved: ResolvedTheme) {
  const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

  tags.forEach((tag) => {
    const media = tag.getAttribute('media')
    tag.content =
      theme === 'system' && media
        ? BROWSER_CHROME[media.includes('light') ? 'light' : 'dark']
        : BROWSER_CHROME[resolved]
  })
}

/**
 * Holds the light/dark choice for the whole app.
 *
 * The choice is stored twice on purpose: in a cookie, so the server can put
 * `data-theme` on <html> in the very first response and the page never flashes
 * the wrong colours; and in localStorage, as a backup for browsers where the
 * cookie gets cleared between visits.
 */
export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: React.ReactNode
  /** Read from the cookie by the root layout, on the server. */
  initialTheme?: ThemePreference
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    initialTheme === 'system' ? 'dark' : initialTheme
  )
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Write the attribute the stylesheet keys off, and remember the choice.
  const apply = useCallback((next: ThemePreference, animate: boolean) => {
    const root = document.documentElement

    if (animate) {
      root.classList.add('theme-switching')
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
      transitionTimer.current = setTimeout(() => {
        root.classList.remove('theme-switching')
      }, 240)
    }

    root.setAttribute('data-theme', next)
    const nextResolved = resolve(next)
    setResolvedTheme(nextResolved)
    syncBrowserChrome(next, nextResolved)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private browsing can refuse storage — the cookie below still covers us.
    }
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
  }, [])

  // On first load, trust whatever the server already painted, but fall back to
  // localStorage if the cookie went missing (cleared cookies, new device sync).
  useEffect(() => {
    let saved: ThemePreference = initialTheme
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      const cookieMissing = !document.cookie.includes(`${THEME_COOKIE}=`)
      if (cookieMissing && isThemePreference(stored)) saved = stored
    } catch {
      // ignore
    }

    setThemeState(saved)
    apply(saved, false)
    // Only ever runs for the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While on "system", follow the operating system as it changes.
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      const next = query.matches ? 'light' : 'dark'
      setResolvedTheme(next)
      syncBrowserChrome('system', next)
    }

    query.addEventListener('change', onChange)
    onChange()
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
    }
  }, [])

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next)
      apply(next, true)
    },
    [apply]
  )

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return ctx
}
