'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

interface SidebarContextValue {
  isCollapsed: boolean
  toggleCollapsed: () => void
  isMobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  toggleCollapsed: () => {},
  isMobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
  toggleMobile: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored === 'true') setIsCollapsed(true)
    } catch {
      // ignore localStorage errors in private browsing
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar-collapsed', String(next))
      } catch {}
      return next
    })
  }, [])

  const openMobile = useCallback(() => {
    setIsMobileOpen(true)
  }, [])

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({
      isCollapsed,
      toggleCollapsed,
      isMobileOpen,
      openMobile,
      closeMobile,
      toggleMobile,
    }),
    [isCollapsed, toggleCollapsed, isMobileOpen, openMobile, closeMobile, toggleMobile]
  )

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}
