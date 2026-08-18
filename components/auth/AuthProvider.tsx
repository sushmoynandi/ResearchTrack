'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { User, SystemRole } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
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
  token: null,
  logout: async () => {},
  refreshUser: async () => {},
  setAuthSession: () => {},
  isStudent: false,
  isSupervisor: false,
  isAdmin: false,
  hasRole: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const tokenRef = useRef<string | null>(null)

  // Keep tokenRef in sync with state
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  const setAuthSession = useCallback((newUser: User, newToken: string) => {
    setUser(newUser)
    setToken(newToken)
    tokenRef.current = newToken
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
    try {
      let currentToken = tokenRef.current
      if (!currentToken && typeof window !== 'undefined') {
        currentToken = localStorage.getItem('researchtrack_token') || localStorage.getItem('papertrack_token')
      }

      const headers: Record<string, string> = {}
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`
      }

      const res = await fetch('/api/auth/me', { headers })
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
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to refresh user session:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Run initial session initialization ONCE on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('researchtrack_token') || localStorage.getItem('papertrack_token')
      const savedUser = localStorage.getItem('researchtrack_user') || localStorage.getItem('papertrack_user')
      if (savedToken) {
        setToken(savedToken)
        tokenRef.current = savedToken
      }
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch { /* ignore */ }
      }
    }
    refreshUser()
  }, [refreshUser])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // non-blocking
    } finally {
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

  const isStudent = user?.systemRole === 'STUDENT'
  const isSupervisor = user?.systemRole === 'SUPERVISOR'
  const isAdmin = user?.systemRole === 'ADMIN'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
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
