'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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
   * server having answered, or there being no session cookie to answer about —
   * the second case lets a public page render on the first paint instead of
   * sitting behind a spinner.
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
    const timeoutId = setTimeout(() => controller.abort(), 4000)

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
        } else {
          setUser(null)
        }
      } else {
        // 401 Unauthorized — clear session state cleanly
        setUser(null)
        setToken(null)
        tokenRef.current = null
        try {
          localStorage.removeItem('researchtrack_user')
          localStorage.removeItem('researchtrack_token')
          localStorage.removeItem('papertrack_user')
          localStorage.removeItem('papertrack_token')
          document.cookie = 'researchtrack_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
          document.cookie = 'papertrack_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn('User session check completed with notice:', err)
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
      try {
        localStorage.removeItem('researchtrack_user')
        localStorage.removeItem('researchtrack_token')
        localStorage.removeItem('papertrack_user')
        localStorage.removeItem('papertrack_token')
        document.cookie = 'researchtrack_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
        document.cookie = 'papertrack_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch {
        // ignore
      }
      window.location.replace('/login')
    }
  }

  const hasRole = useCallback((...roles: SystemRole[]) => {
    if (!user) return false
    return roles.includes(user.systemRole)
  }, [user])

  const signedOut = !user && (!hasSessionCookie || sessionChecked)

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
