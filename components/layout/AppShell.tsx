'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt'
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
      <main className="p-3.5 sm:p-6">{children}</main>
    </div>
  )
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, sessionChecked, signedOut } = useAuth()
  // Pages that render their own full-screen layout — no sidebar, no header.
  // /welcome belongs here too: it's the required profile step, so the rest of
  // the app must not be reachable from it.
  const isAuthPage = Boolean(
    pathname?.startsWith('/login') ||
      pathname?.startsWith('/register') ||
      pathname?.startsWith('/welcome') ||
      pathname?.startsWith('/forgot-password') ||
      pathname?.startsWith('/security-setup')
  )

  // "/" serves two pages: the dashboard once you're signed in, and the public
  // landing page when you're not. So a signed-out visitor is left there to read
  // it rather than being bounced to /login, and it renders full-screen — the
  // sidebar and header belong to the signed-in app.
  const isHome = pathname === '/'
  const showLanding = isHome && signedOut

  // Wait for the server to say who this is before sending anyone to /login.
  // `loading` turns false as soon as there's nothing saved in the browser to
  // restore, which is exactly the state a Google sign-in arrives in — the
  // session lives in a cookie. Redirecting on that bounced people through the
  // login page for a second on the way to the page they asked for.
  useEffect(() => {
    if (sessionChecked && !user && !isAuthPage && !isHome) {
      router.replace('/login')
    }
  }, [sessionChecked, user, isAuthPage, isHome, router])

  if (isAuthPage || showLanding) {
    return <main className="min-h-screen bg-bg-primary">{children}</main>
  }

  if (!sessionChecked && !user) {
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
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <p className="text-xs text-text-tertiary">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <MainContent>{children}</MainContent>
      <PushNotificationPrompt />
    </SidebarProvider>
  )
}

export function AppShell({
  children,
  hasSession = false,
}: {
  children: React.ReactNode
  /** Set by the root layout from the session cookie, read on the server. */
  hasSession?: boolean
}) {
  return (
    <AuthProvider hasSessionCookie={hasSession}>
      <ToastProvider>
        <ShellInner>{children}</ShellInner>
      </ToastProvider>
    </AuthProvider>
  )
}
