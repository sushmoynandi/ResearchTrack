'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { PasswordToggle } from '@/components/auth/PasswordToggle'
import {
  Lock,
  Mail,
  ArrowRight,
  Atom,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  AlertCircle,
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
  // Stays on screen (unlike the toast) when Google sign-in found no account
  const [noGoogleAccount, setNoGoogleAccount] = useState(false)

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

  // Surface Google sign-in errors passed back via ?error=
  useEffect(() => {
    const err = searchParams.get('error')
    if (!err) return
    const messages: Record<string, string> = {
      google_not_configured: 'Google sign-in isn’t set up yet. Add your Google keys to enable it.',
      google_denied: 'Google sign-in was cancelled.',
      google_state: 'Your Google session expired. Please try signing in again.',
      google_token: 'Couldn’t complete Google sign-in. Please try again.',
      google_verify: 'Couldn’t verify your Google account. Please try again.',
      google_email: 'Your Google account didn’t share a verified email address.',
      google_account: 'Something went wrong creating your account. Please try again.',
      google_no_account:
        'No ResearchTrack account uses that Google address yet. Create an account first, then you can sign in with Google.',
      account_disabled: 'This account has been deactivated. Contact your administrator.',
    }
    if (err === 'google_no_account') setNoGoogleAccount(true)
    addToast('error', messages[err] || 'Google sign-in failed. Please try again.')
    // Clean the error out of the URL so it doesn't reappear on refresh
    router.replace('/login')
  }, [searchParams, addToast, router])

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
    <AuthSplitLayout
      headline="Welcome back to your research desk."
      subheadline="Sign in to pick up where you left off — your papers, notes, and reading pipeline in one place."
      title={is2FA ? 'Security verification' : 'Sign in'}
      subtitle={
        is2FA
          ? 'Administrator 2-step authentication'
          : 'Welcome back, enter your details to continue.'
      }
    >
          {/* Google sign-in found no account for that address */}
          {noGoogleAccount && !is2FA && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-200">
                  No account for that Google address
                </p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Signing in with Google only works once you have an account.{' '}
                  <Link
                    href="/register"
                    className="text-accent hover:text-accent-hover font-semibold"
                  >
                    Create one first
                  </Link>{' '}
                  — you can use the same Google address, then Google sign-in will
                  work every time after that.
                </p>
              </div>
            </div>
          )}

          {!is2FA ? (
            /* ─── Standard Email / Password Form ─── */
            <form onSubmit={(e) => handleCredentialsSubmit(e)} className="space-y-3.5">
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
                <span className="text-sm font-medium text-text-secondary">Password</span>
                <Link
                  href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={15} />}
                trailing={
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                }
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

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-border-default" />
                <span className="text-[11px] uppercase tracking-wider text-text-tertiary">or</span>
                <div className="h-px flex-1 bg-border-default" />
              </div>

              {/* Google sign-in */}
              <GoogleButton
                mode="login"
                redirect={searchParams.get('redirect')}
                label="Continue with Google"
              />
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

          {/* Bottom link */}
          <p className="text-center text-[13px] text-text-secondary border-t border-border-default pt-4">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-accent hover:text-accent-hover font-semibold transition-colors"
            >
              Create account
            </Link>
          </p>
    </AuthSplitLayout>
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
