'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Building,
  GraduationCap,
  ArrowRight,
  Atom,
  Sparkles,
} from 'lucide-react'

const systemRoleOptions = [
  { value: 'STUDENT', label: 'Student Researcher' },
  { value: 'SUPERVISOR', label: 'Supervisor / Faculty Advisor' },
]

/** Shown while we work out who's signed in — and by Suspense on first paint. */
function WelcomeLoading() {
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

function WelcomeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { user, loading: authLoading, setAuthSession } = useAuth()

  const [systemRole, setSystemRole] = useState('STUDENT')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)

  // Must be signed in to complete a profile
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const redirectTarget = searchParams.get('redirect') || '/'


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!institution.trim() || !department.trim()) {
      addToast('error', 'Please fill in your institution and department to continue')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemRole, institution, department }),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        addToast('success', 'You’re all set! Welcome to ResearchTrack.')
        // Stay in "saving" until the next page takes over — flipping the button
        // back to idle for a split second read as a glitch. A client-side push
        // also keeps the toast on screen instead of wiping it with a reload.
        router.replace(redirectTarget)
        router.refresh()
        return
      }

      addToast('error', data.error || 'Couldn’t save your profile. Please try again.')
      setSaving(false)
    } catch {
      addToast('error', 'Network error saving your profile.')
      setSaving(false)
    }
  }

  const firstName = user?.name?.split(' ')[0]

  // Wait until we know who this is. Rendering first and correcting a moment
  // later is what made this page feel broken.
  if (authLoading || !user) {
    return <WelcomeLoading />
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow — painted, not blurred */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(36rem 28rem at 50% 18%, hsl(190 70% 50% / 0.13), transparent 68%)',
        }}
      />

      <div className="w-full max-w-lg relative z-10 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            style={{ animationDelay: '40ms' }}
            className="auth-pop inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mb-3 shadow-glow"
          >
            <Sparkles size={24} />
          </div>
          <h1
            style={{ animationDelay: '140ms' }}
            className="auth-rise text-2xl font-bold text-text-primary font-display tracking-tight"
          >
            Welcome, {firstName}!
          </h1>
          <p
            style={{ animationDelay: '200ms' }}
            className="auth-rise text-xs text-text-secondary mt-1"
          >
            One quick step before you start — we need these to set up your workspace
          </p>
        </div>

        {/* Card */}
        <div
          style={{ animationDelay: '280ms' }}
          className="auth-rise glass-card p-6 sm:p-8 space-y-6"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type */}
            <Select
              label="I am a... *"
              options={systemRoleOptions}
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
              required
            />

            <Input
              label="Institution / University *"
              placeholder="e.g. Stanford University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              icon={<Building size={15} />}
              required
            />

            <Input
              label="Department *"
              placeholder="e.g. Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              icon={<GraduationCap size={15} />}
              required
            />

            <Button
              type="submit"
              loading={saving}
              disabled={!institution.trim() || !department.trim()}
              className="w-full mt-3 h-11"
              icon={<ArrowRight size={15} />}
            >
              Continue to ResearchTrack
            </Button>
          </form>

          <p className="pt-4 border-t border-border-default text-center text-xs text-text-tertiary">
            These details are required — they decide what you can see and who you
            can share your reading with.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeLoading />}>
      <WelcomeForm />
    </Suspense>
  )
}
