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

  const finish = () => {
    window.location.href = redirectTarget
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setTimeout(finish, 100)
      } else {
        addToast('error', data.error || 'Couldn’t save your profile. Please try again.')
      }
    } catch {
      addToast('error', 'Network error saving your profile.')
    } finally {
      setSaving(false)
    }
  }

  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fade-in py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mb-3 shadow-glow">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Just one quick step to set up your research workspace
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type */}
            <Select
              label="I am a..."
              options={systemRoleOptions}
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
            />

            {/* Institution & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Institution / University"
                placeholder="e.g. Stanford University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                icon={<Building size={15} />}
              />
              <Input
                label="Department"
                placeholder="e.g. Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                icon={<GraduationCap size={15} />}
              />
            </div>

            <Button
              type="submit"
              loading={saving}
              className="w-full mt-3 h-11"
              icon={<ArrowRight size={15} />}
            >
              Continue to ResearchTrack
            </Button>
          </form>

          {/* Skip for now */}
          <div className="pt-4 border-t border-border-default text-center">
            <button
              type="button"
              onClick={finish}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            >
              Skip for now — I’ll do this later in Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 shadow-glow animate-spin-slow">
              <Atom size={26} />
            </div>
            <p className="text-xs text-text-secondary">Loading ResearchTrack...</p>
          </div>
        </div>
      }
    >
      <WelcomeForm />
    </Suspense>
  )
}
