/**
 * Shared vocabulary for the light/dark setting.
 *
 * This lives outside the provider on purpose. The provider is a client
 * component, and every export of a client module turns into a stub when the
 * server imports it — so a plain constant read on the server (the root layout
 * reading the cookie) has to come from a neutral file like this one.
 */

/** What the person picked. "system" means "match my computer". */
export type ThemePreference = 'light' | 'dark' | 'system'

/** What that actually works out to on screen right now. */
export type ResolvedTheme = 'light' | 'dark'

/** Set by the browser, read by the server on the next request. */
export const THEME_COOKIE = 'researchtrack_theme'

/** Backup copy, for browsers that drop the cookie between visits. */
export const THEME_STORAGE_KEY = 'researchtrack:theme'

/** How long the choice is remembered. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** The look someone gets before they have chosen anything. */
export const DEFAULT_THEME: ThemePreference = 'dark'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** Reads a cookie value, falling back to the default for anything unexpected. */
export function parseThemeCookie(value: string | undefined): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME
}
