'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
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
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  KeyRound,
} from 'lucide-react'

function maskEmail(email: string) {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(Math.max(3, local.length - 2))}${local[local.length - 1]}@${domain}`
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { user, loading: authLoading, setAuthSession } = useAuth()

  // Credentials State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // 2-Step Verification State
  const [is2FA, setIs2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // If already authenticated, redirect to target page
  useEffect(() => {
    if (!authLoading && user) {
      const target = searchParams.get('redirect') || (user.systemRole === 'ADMIN' ? '/admin/users' : '/')
      router.replace(target)
    }
  }, [user, authLoading, searchParams, router])

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCountdown])

  // Focus first OTP box when entering 2FA screen
  useEffect(() => {
    if (is2FA) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 150)
    }
  }, [is2FA])

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
        // If 2-Step Verification is required for Admin
        if (data.requires2FA) {
          setIs2FA(true)
          setTempToken(data.tempToken)
          setAdminEmail(data.email || targetEmail)
          setOtpDigits(['', '', '', '', '', ''])
          setResendCountdown(30)
          addToast('info', '🛡️ 2-Step Verification required for Administrator')
          return
        }

        // Direct sign in for standard roles
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        const targetRedirect = searchParams.get('redirect') || (data.user?.systemRole === 'ADMIN' ? '/admin/users' : '/')
        addToast('success', `Signed in as ${data.user?.name || 'Researcher'}!`)
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

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '')
    if (!clean) {
      const newDigits = [...otpDigits]
      newDigits[index] = ''
      setOtpDigits(newDigits)
      return
    }

    // Single digit input
    const char = clean.slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = char
    setOtpDigits(newDigits)

    // Auto-advance to next box
    if (index < 5 && char) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  // Handle Paste of full 6-digit code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '')
    if (pasted.length >= 6) {
      const digits = pasted.slice(0, 6).split('')
      setOtpDigits(digits)
      otpInputRefs.current[5]?.focus()
    }
  }

  // Handle Backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Submit 2FA Verification Code
  const handleVerify2FASubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const fullCode = otpDigits.join('')

    if (fullCode.length !== 6) {
      addToast('error', 'Please enter all 6 digits of the verification code')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: fullCode }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        addToast('success', '✅ 2-Step Verification passed! Accessing Admin Console.')
        const targetRedirect = searchParams.get('redirect') || '/admin/users'
        setTimeout(() => {
          window.location.href = targetRedirect
        }, 100)
      } else {
        addToast('error', data.error || 'Invalid or expired verification code')
      }
    } catch {
      addToast('error', 'Network error verifying security code')
    } finally {
      setVerifying(false)
    }
  }

  // Resend 2FA Code
  const handleResendCode = async () => {
    if (resendCountdown > 0 || resending) return

    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      })

      const data = await res.json()

      if (res.ok) {
        setResendCountdown(30)
        setOtpDigits(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
        addToast('success', '📩 A fresh 6-digit code has been dispatched to your email.')
      } else {
        addToast('error', data.error || 'Failed to resend code')
      }
    } catch {
      addToast('error', 'Network error resending verification code')
    } finally {
      setResending(false)
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
            {is2FA ? <ShieldCheck size={26} className="text-accent animate-pulse" /> : <Atom size={26} className="animate-spin-slow" />}
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            {is2FA ? 'Security Verification' : 'ResearchTrack'}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {is2FA
              ? 'Administrator 2-Step Authentication'
              : 'AI & Machine Learning Research Workspace'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          {!is2FA ? (
            /* ─── Standard Email / Password Form ─── */
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
          ) : (
            /* ─── Admin 2-Step Verification Form ─── */
            <form onSubmit={(e) => handleVerify2FASubmit(e)} className="space-y-5 animate-slide-up">
              <div className="text-center space-y-1.5 pb-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold">
                  <KeyRound size={12} /> Two-Factor Protection
                </div>
                <p className="text-xs text-text-secondary leading-relaxed pt-1">
                  Enter the 6-digit security passcode dispatched to:
                </p>
                <p className="text-xs font-mono font-bold text-text-primary bg-bg-tertiary py-1 px-2.5 rounded-lg inline-block border border-border-default">
                  {maskEmail(adminEmail)}
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono bg-bg-secondary border-2 border-border-default focus:border-accent focus:bg-bg-tertiary focus:shadow-glow rounded-xl outline-none transition-all text-text-primary"
                    required
                  />
                ))}
              </div>

              <Button
                type="submit"
                loading={verifying}
                disabled={otpDigits.join('').length !== 6}
                className="w-full"
                icon={<ShieldCheck size={16} />}
              >
                Verify &amp; Access Admin
              </Button>

              {/* Resend & Back Controls */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIs2FA(false)}
                  className="text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCountdown > 0 || resending}
                  className={`flex items-center gap-1.5 font-medium cursor-pointer ${
                    resendCountdown > 0
                      ? 'text-text-tertiary cursor-not-allowed'
                      : 'text-accent hover:text-accent-hover'
                  }`}
                >
                  <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                  {resendCountdown > 0 ? `Resend code (${resendCountdown}s)` : 'Resend Code'}
                </button>
              </div>
            </form>
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
