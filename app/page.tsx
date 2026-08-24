'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { LandingPage } from '@/components/landing/LandingPage'

/**
 * "/" is the public landing page.
 *
 * The dashboard used to live here too, which meant one URL rendered two very
 * different pages depending on who was asking. It now has its own address,
 * /dashboard, and this page has one job.
 *
 * Anyone already signed in who arrives here — a bookmark, the logo in the top
 * bar, someone typing the bare address — is moved along to /dashboard. That
 * normally happens on the server before anything is drawn (see proxy.ts); this
 * redirect is the backstop for the cases the server can't judge, such as a
 * session restored from this browser rather than a cookie.
 */
export default function HomePage() {
  const router = useRouter()
  const { user, signedOut } = useAuth()

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  if (signedOut) return <LandingPage />

  // Signed in, or still finding out. Either way the answer is /dashboard, and
  // showing the marketing page in the meantime would be a lie.
  return null
}
