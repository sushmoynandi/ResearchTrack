'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Atom,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { user, loading: authLoading, setAuthSession } = useAuth()

  // State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // If already authenticated, redirect to target page
  useEffect(() => {
    if (!authLoading && user) {
      const target = searchParams.get('redirect') || (user.systemRole === 'ADMIN' ? '/admin/users' : '/')
      router.replace(target)
    }
  }, [user, authLoading, searchParams, router])

  // Email / Password Login
  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const targetEmail = email.trim()
    const targetPassword = password

    if (!targetEmail || !targetPassword) {
      addToast('error', 'Please enter your email and password')
      return
    }

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
          <form onSubmit={(e) => handleCredentialsSubmit(e)} className="space-y-4">
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
          </form>

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
