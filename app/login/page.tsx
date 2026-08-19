'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Atom,
  Zap,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const { addToast } = useToast()
  const { user, loading: authLoading, setAuthSession } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState<'credentials' | 'guest'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  // If already authenticated, redirect to target page
  useEffect(() => {
    if (!authLoading && user) {
      const target = searchParams.get('redirect') || (user.systemRole === 'ADMIN' ? '/admin/users' : '/')
      router.replace(target)
    }
  }, [user, authLoading, searchParams, router])

  // Email / Password Login (Supports manual submit OR 1-click credentials override)
  const handleCredentialsSubmit = async (e?: React.FormEvent, overrideEmail?: string, overridePassword?: string) => {
    if (e) e.preventDefault()
    const targetEmail = (overrideEmail || email).trim()
    const targetPassword = overridePassword || password

    if (!targetEmail || !targetPassword) {
      addToast('error', 'Please enter your email and password')
      return
    }

    if (overrideEmail) setEmail(overrideEmail)
    if (overridePassword) setPassword(overridePassword)

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        const targetRedirect = searchParams.get('redirect') || (data.user?.systemRole === 'ADMIN' ? '/admin/users' : '/')
        addToast('success', `Signed in as ${data.user?.name || 'Administrator'}!`)
        setTimeout(() => {
          window.location.href = targetRedirect
        }, 100)
      } else {
        addToast('error', data.error || 'Invalid email or password')
      }
    } catch {
      addToast('error', 'Network error signing in. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // 1-Click Guest Sandbox Login
  const handleGuestLogin = async () => {
    setGuestLoading(true)
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        addToast('success', 'Entered Sandbox Workspace as Guest Researcher')
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 100)
      } else {
        addToast('error', data.error || 'Failed to initialize guest sandbox')
      }
    } catch {
      addToast('error', 'Failed to initialize guest sandbox')
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mb-3 shadow-glow">
            <Atom size={26} className="animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            ResearchTrack
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            AI &amp; Machine Learning Research Workspace
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          {/* Auth Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-tertiary rounded-xl border border-border-default">
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-bg-elevated text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guest')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'guest'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-accent hover:bg-accent-subtle'
              }`}
            >
              <Sparkles size={12} /> Guest Demo
            </button>
          </div>

          {/* TAB 1: Email & Password Form */}
          {activeTab === 'credentials' && (
            <form onSubmit={(e) => handleCredentialsSubmit(e)} className="space-y-4 animate-fade-in">
              <Input
                label="Email Address"
                placeholder="researcher@institute.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={15} />}
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-secondary">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-text-tertiary hover:text-accent cursor-pointer flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={15} />}
                  required
                />
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-2"
                icon={<ArrowRight size={15} />}
              >
                Sign In
              </Button>

              {/* 1-Click Academic Role Logins */}
              <div className="pt-4 border-t border-border-default space-y-2">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider text-center">
                  Quick Demo Logins (1-Click):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCredentialsSubmit(undefined, 'student@researchtrack.edu', 'password123')}
                    className="p-2.5 rounded-lg bg-bg-tertiary hover:bg-blue-500/10 border border-border-default hover:border-blue-500/30 text-center transition-all cursor-pointer group"
                    title="1-Click Instant Sign In as Student"
                  >
                    <p className="text-xs font-bold text-text-primary group-hover:text-blue-400">Student</p>
                    <p className="text-[10px] text-text-tertiary truncate">Sophia Chen</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCredentialsSubmit(undefined, 'supervisor@researchtrack.edu', 'password123')}
                    className="p-2.5 rounded-lg bg-bg-tertiary hover:bg-purple-500/10 border border-border-default hover:border-purple-500/30 text-center transition-all cursor-pointer group"
                    title="1-Click Instant Sign In as Supervisor"
                  >
                    <p className="text-xs font-bold text-text-primary group-hover:text-purple-400">Supervisor</p>
                    <p className="text-[10px] text-text-tertiary truncate">Dr. Rostova</p>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: 1-Click Guest Sandbox */}
          {activeTab === 'guest' && (
            <div className="space-y-4 animate-fade-in pt-1 text-center">
              <div className="p-4 rounded-xl bg-accent-subtle/50 border border-accent/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <Sparkles size={14} /> Instant Demo Workspace
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Explore full ResearchTrack features with pre-seeded landmark AI papers (<strong>Transformer</strong>, <strong>Llama 3 405B</strong>, and <strong>Mamba SSM</strong>) without entering any credentials.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleGuestLogin}
                loading={guestLoading}
                className="w-full h-11"
                icon={<Zap size={16} />}
              >
                Enter Sandbox as Guest
              </Button>
            </div>
          )}

          {/* Bottom links */}
          <div className="pt-4 border-t border-border-default text-center">
            <p className="text-xs text-text-secondary">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-accent hover:text-accent-hover font-semibold transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  )
}
