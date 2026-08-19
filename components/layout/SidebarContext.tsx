'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setIsCollapsed(true)
    setMounted(true)
  }, [])

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const openMobile = () => setIsMobileOpen(true)
  const closeMobile = () => setIsMobileOpen(false)
  const toggleMobile = () => setIsMobileOpen((prev) => !prev)

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <SidebarContext.Provider
        value={{
          isCollapsed: false,
          toggleCollapsed,
          isMobileOpen: false,
          openMobile,
          closeMobile,
          toggleMobile,
        }}
      >
        {children}
      </SidebarContext.Provider>
    )
  }

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapsed,
        isMobileOpen,
        openMobile,
        closeMobile,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
