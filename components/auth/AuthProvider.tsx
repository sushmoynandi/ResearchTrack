'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { User, SystemRole } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  /**
   * True once the server has actually answered who this is. `loading` can go
   * false before that (nothing in localStorage to restore), so anything that
   * redirects on "no user" must wait for this instead.
   */
  sessionChecked: boolean
  /**
   * True once we know for certain that nobody is signed in. That is either the
   * server having answered, or there being nothing to restore from at all — no
   * session cookie and no token saved in this browser. The second case lets a
   * public page render on the first paint instead of sitting behind a spinner,
   * while still never showing it to someone who turns out to be signed in.
   */
  signedOut: boolean
  token: string | null
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setAuthSession: (user: User, token: string) => void
  isStudent: boolean
  isSupervisor: boolean
  isAdmin: boolean
  hasRole: (...roles: SystemRole[]) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionChecked: false,
  signedOut: false,
  token: null,
  logout: async () => {},
  refreshUser: async () => {},
  setAuthSession: () => {},
  isStudent: false,
  isSupervisor: false,
  isAdmin: false,
  hasRole: () => false,
})

/**
 * Whether this browser has a sign-in saved from a previous visit.
 *
 * Read through useSyncExternalStore rather than in an effect on purpose. The
 * server renders with no knowledge of localStorage, and an effect only runs
 * *after* the first paint — which is long enough for the public landing page
 * to appear for a moment on "/" before the dashboard replaces it. This hook
 * makes React re-render with the real answer during hydration, before anything
 * is painted, so that flash never happens.
 */
const NO_SAVED_TOKEN = () => false

function subscribeToSavedToken(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readSavedToken() {
  try {
    return Boolean(
      localStorage.getItem('researchtrack_token') ||
        localStorage.getItem('papertrack_token')
    )
  } catch {
    return false
  }
}

/** Cookie the server reads to know a request is signed in. 30 days, matching the token. */
function restoreSessionCookie(token: string) {
  try {
    if (document.cookie.includes('researchtrack_session=')) return
    const attrs = 'path=/; max-age=2592000; SameSite=Lax'
    document.cookie = `researchtrack_session=${token}; ${attrs}`
    document.cookie = `papertrack_session=${token}; ${attrs}`
  } catch {
    // Cookies disabled — the Bearer token still carries the session.
  }
}

/** Forget the signed-in session in every place it is kept. */
function clearStoredSession() {
  try {
    localStorage.removeItem('researchtrack_user')
    localStorage.removeItem('researchtrack_token')
    localStorage.removeItem('papertrack_user')
    localStorage.removeItem('papertrack_token')
    const expired = 'path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    document.cookie = `researchtrack_session=; ${expired}`
    document.cookie = `papertrack_session=; ${expired}`
  } catch {
    // ignore
  }
}

export function AuthProvider({
  children,
  hasSessionCookie = false,
}: {
  children: React.ReactNode
  /** Read from the session cookie on the server by the root layout. */
  hasSessionCookie?: boolean
}) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const tokenRef = useRef<string | null>(null)

  // Keep tokenRef in sync with state
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  const setAuthSession = useCallback((newUser: User, newToken: string) => {
    setUser(newUser)
    setToken(newToken)
    tokenRef.current = newToken
    setLoading(false)
    setSessionChecked(true)
    try {
      localStorage.setItem('researchtrack_user', JSON.stringify(newUser))
      localStorage.setItem('researchtrack_token', newToken)
      document.cookie = `researchtrack_session=${newToken}; path=/; max-age=2592000; SameSite=Lax`
      document.cookie = `papertrack_session=${newToken}; path=/; max-age=2592000; SameSite=Lax`
    } catch {
      // non-blocking
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const controller = new AbortController()
    // Generous on purpose. This is the request that decides whether you are
    // still signed in, so it must not give up while the server is merely busy
    // — in development the first hit on a route can spend seconds compiling.
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      let currentToken = tokenRef.current
      if (!currentToken && typeof window !== 'undefined') {
        currentToken = localStorage.getItem('researchtrack_token') || localStorage.getItem('papertrack_token')
      }

      const headers: Record<string, string> = {}
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`
      }

      const res = await fetch('/api/auth/me', {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          try {
            localStorage.setItem('researchtrack_user', JSON.stringify(data.user))
          } catch { /* ignore */ }
          // The server has just confirmed this token, so put the session
          // cookie back if it went missing. Without this, a browser left
          // holding only the saved token stays in a half-signed-in state: the
          // app works, but the *server* sees a stranger on every request, so
          // "/" is rendered as the public landing page and only turns into the
          // dashboard once JavaScript has caught up. Restoring the cookie
          // means the next visit is the dashboard from the first byte.
          if (currentToken) restoreSessionCookie(currentToken)
        } else {
          setUser(null)
        }
      } else if (res.status === 401) {
        // The server has looked at this session and rejected it. That is the
        // only answer that means "signed out", so it is the only one allowed
        // to throw the session away.
        clearStoredSession()
        setUser(null)
        setToken(null)
        tokenRef.current = null
      } else {
        // 500, 502, a restarting dev server, a database blip. The session is
        // very probably still perfectly good, and wiping it here is what used
        // to dump people back on the login page after a reload. Leave what is
        // saved alone and carry on with it.
        console.warn(
          `Session check got HTTP ${res.status}; keeping the saved session.`
        )
      }
    } catch (err) {
      // Aborted, offline, connection refused — again, says nothing about
      // whether the session is valid, so nothing is cleared.
      console.warn('Could not reach the server to check the session:', err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
      setSessionChecked(true)
    }
  }, [])

  // Run initial session initialization ONCE on mount
  useEffect(() => {
    let hasSavedCredentials = false
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('researchtrack_token') || localStorage.getItem('papertrack_token')
        const savedUser = localStorage.getItem('researchtrack_user') || localStorage.getItem('papertrack_user')
        if (savedToken) {
          setToken(savedToken)
          tokenRef.current = savedToken
          hasSavedCredentials = true
        }
        if (savedUser) {
          setUser(JSON.parse(savedUser))
          hasSavedCredentials = true
        }
      } catch {
        // ignore localStorage parsing errors
      }
    }

    // If no credentials saved at all, stop loading immediately
    if (!hasSavedCredentials) {
      setLoading(false)
    }

    // Validate with server
    refreshUser()
  }, [refreshUser])

  // Universal client-side fetch interceptor: automatically attaches Bearer token to all /api/ requests
  useEffect(() => {
    if (typeof window === 'undefined') return

    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let urlStr = ''
      if (typeof input === 'string') {
        urlStr = input
      } else if (input instanceof URL) {
        urlStr = input.toString()
      } else if (input && typeof input === 'object' && 'url' in input) {
        urlStr = (input as Request).url
      }

      const isInternalApi =
        urlStr.startsWith('/api/') ||
        urlStr.includes('/api/')

      if (isInternalApi) {
        const storedToken =
          tokenRef.current ||
          localStorage.getItem('researchtrack_token') ||
          localStorage.getItem('papertrack_token')

        if (storedToken) {
          init = init || {}
          const headers = new Headers(init.headers || {})
          if (!headers.has('Authorization') && !headers.has('authorization')) {
            headers.set('Authorization', `Bearer ${storedToken}`)
          }
          init.headers = headers
          if (!init.credentials) {
            init.credentials = 'same-origin'
          }
        }
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // non-blocking
    } finally {
      setUser(null)
      setToken(null)
      tokenRef.current = null
      setLoading(false)
      clearStoredSession()
      window.location.replace('/login')
    }
  }

  const hasRole = useCallback((...roles: SystemRole[]) => {
    if (!user) return false
    return roles.includes(user.systemRole)
  }, [user])

  const hasSavedToken = useSyncExternalStore(
    subscribeToSavedToken,
    readSavedToken,
    NO_SAVED_TOKEN
  )

  // "Definitely nobody is signed in" — which is stricter than "we don't have a
  // user yet". It is true once the server has answered, or straight away when
  // there is nothing at all to restore from: no session cookie and no saved
  // token. Anything less than that means the answer is still on its way, and
  // "/" should wait rather than assume a visitor and show the landing page.
  const signedOut =
    !user && (sessionChecked || (!hasSessionCookie && !hasSavedToken))

  const isStudent = user?.systemRole === 'STUDENT'
  const isSupervisor = user?.systemRole === 'SUPERVISOR'
  const isAdmin = user?.systemRole === 'ADMIN'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sessionChecked,
      signedOut,
      token,
      logout,
      refreshUser,
      setAuthSession,
      isStudent,
      isSupervisor,
      isAdmin,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
