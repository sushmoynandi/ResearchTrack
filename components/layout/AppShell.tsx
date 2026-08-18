'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { Atom } from 'lucide-react'

function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div
      className={`
        min-h-screen transition-all duration-300 ease-smooth
        md:ml-[260px] pb-20 md:pb-0
        ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}
      `}
    >
      <Header />
      <main className="p-6">{children}</main>
    </div>
  )
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isAuthPage = Boolean(
    pathname?.startsWith('/login') || pathname?.startsWith('/register')
  )

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.replace('/login')
    }
  }, [loading, user, isAuthPage, router])

  if (isAuthPage) {
    return <main className="min-h-screen bg-bg-primary">{children}</main>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 shadow-glow animate-spin-slow">
            <Atom size={26} />
          </div>
          <p className="text-xs text-text-secondary">Loading ResearchTrack...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <MainContent>{children}</MainContent>
    </SidebarProvider>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ShellInner>{children}</ShellInner>
      </ToastProvider>
    </AuthProvider>
  )
}
