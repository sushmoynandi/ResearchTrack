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
  AlertCircle,
  Smartphone,
  Send,
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
  // Stays on screen (unlike the toast) when Google sign-in found no account.
  // Read once at first render — the effect below strips the query string, so
  // deriving it every render would make the notice vanish again.
  const [noGoogleAccount, setNoGoogleAccount] = useState(
    () => searchParams.get('error') === 'google_no_account'
  )

  // 2-Step Verification State
  const [is2FA, setIs2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [challengeEmail, setChallengeEmail] = useState('')
  const [challengeMethod, setChallengeMethod] = useState<'APP' | 'EMAIL'>('APP')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  // Shown under the boxes rather than only as a toast, which disappears
  // before someone has finished reading it
  const [codeError, setCodeError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendIn, setResendIn] = useState(0)

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
    addToast('error', messages[err] || 'Google sign-in failed. Please try again.')
    // Clean the error out of the URL so it doesn't reappear on refresh
    router.replace('/login')
  }, [searchParams, addToast, router])

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
        // Two-step verification, if this account has switched it on
        if (data.requires2FA) {
          const via = data.method === 'EMAIL' ? 'EMAIL' : 'APP'
          setIs2FA(true)
          setTempToken(data.tempToken)
          setChallengeEmail(data.email || targetEmail)
          setChallengeMethod(via)
          setOtpDigits(['', '', '', '', '', ''])
          setCodeError('')
          // The password step has just mailed one, so start the clock rather
          // than offering a resend that the server would only refuse
          setResendIn(via === 'EMAIL' ? 60 : 0)
          addToast(
            'info',
            via === 'EMAIL'
              ? '🛡️ We’ve emailed you a 6-digit code'
              : '🛡️ Enter the code from your authenticator app'
          )
          return
        }

        // Direct sign in for standard roles
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        const targetRedirect = searchParams.get('redirect') || (data.user?.systemRole === 'ADMIN' ? '/admin/users' : '/')
        addToast('success', `Signed in as ${data.user?.name || 'Researcher'}!`)
        // Straight there — no timer, no full reload. The session is already in
        // memory, so the app doesn't have to boot again and work out who you
        // are. The button stays in its loading state until the next screen
        // takes over.
        router.replace(targetRedirect)
        return
      }

      addToast('error', data.error || 'Invalid email or password')
      setLoading(false)
    } catch {
      addToast('error', 'Network error signing in. Please check your connection.')
      setLoading(false)
    }
  }

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    setCodeError('')
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

  // Count the resend cooldown down to zero
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Post another emailed code
  const resendCode = async () => {
    if (resending || resendIn > 0) return
    setResending(true)
    try {
      const res = await fetch('/api/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      })
      const data = await res.json()

      if (res.ok) {
        setResendIn(60)
        setCodeError('')
        setOtpDigits(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
        addToast('success', 'A new code is on its way')
      } else {
        if (typeof data.retryInSeconds === 'number') setResendIn(data.retryInSeconds)
        addToast('error', data.error || 'Could not send another code')
      }
    } catch {
      addToast('error', 'Network error sending the code')
    } finally {
      setResending(false)
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
        addToast('success', '✅ Two-step verification passed!')
        const targetRedirect =
          searchParams.get('redirect') ||
          (data.user?.systemRole === 'ADMIN' ? '/admin/users' : '/')
        router.replace(targetRedirect)
        return
      }

      setCodeError(data.error || 'That code didn’t match. Try the next one.')
      setOtpDigits(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
      setVerifying(false)
    } catch {
      setCodeError('Network error. Check your connection and try again.')
      setVerifying(false)
    }
  }


  return (
    <AuthSplitLayout
      headline="Welcome back to your research desk."
      subheadline="Sign in to pick up where you left off — your papers, notes, and reading pipeline in one place."
      title={is2FA ? 'Two-step verification' : 'Sign in'}
      subtitle={
        is2FA
          ? challengeMethod === 'EMAIL'
            ? 'One more step — we sent a code to your inbox.'
            : 'One more step — open your authenticator app.'
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
                <Input
                  label="Password"
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

                <div className="flex justify-end">
                  <Link
                    href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                    className="text-[11px] text-text-tertiary hover:text-accent font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
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
            /* ─── Two-Step Verification Form ─── */
            <form
              onSubmit={(e) => handleVerify2FASubmit(e)}
              className="space-y-5 animate-slide-up"
            >
              {/* Which method, and where the code went — one row, not three
                  stacked centred lines */}
              <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-secondary/60 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-subtle text-accent">
                  {challengeMethod === 'EMAIL' ? <Mail size={16} /> : <Smartphone size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary">
                    {challengeMethod === 'EMAIL' ? 'Code sent by email' : 'Authenticator app'}
                  </p>
                  <p className="truncate font-mono text-[11px] text-text-tertiary">
                    {maskEmail(challengeEmail)}
                  </p>
                </div>
              </div>

              {/* Six boxes, grouped 3 + 3 so the code is readable at a glance */}
              <div className="space-y-2">
                <label className="block text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Enter your 6-digit code
                </label>

                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 3 && (
                        <span className="mx-0.5 h-px w-3 shrink-0 bg-border-default" aria-hidden />
                      )}
                      <input
                        ref={(el) => {
                          otpInputRefs.current[idx] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        aria-label={`Digit ${idx + 1}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        disabled={verifying}
                        className={`h-13 w-11 rounded-xl border-2 bg-bg-secondary text-center font-mono text-xl font-bold text-text-primary outline-none transition-all duration-150 disabled:opacity-60 sm:h-14 sm:w-12 sm:text-2xl ${
                          codeError
                            ? 'border-danger/70 bg-danger-subtle/30'
                            : digit
                              ? 'border-accent/50 bg-bg-tertiary'
                              : 'border-border-default focus:border-accent focus:bg-bg-tertiary focus:shadow-glow'
                        }`}
                        required
                      />
                    </React.Fragment>
                  ))}
                </div>

                {/* Reserve the line so the boxes don't jump when an error lands */}
                <p
                  className={`min-h-[1rem] text-center text-[11px] leading-4 ${
                    codeError ? 'text-danger' : 'text-text-tertiary'
                  }`}
                  role={codeError ? 'alert' : undefined}
                >
                  {codeError ||
                    (challengeMethod === 'EMAIL'
                      ? 'The code expires in 10 minutes.'
                      : 'A new code appears in your app every 30 seconds.')}
                </p>
              </div>

              <Button
                type="submit"
                loading={verifying}
                disabled={otpDigits.join('').length !== 6}
                className="w-full"
                icon={<ShieldCheck size={16} />}
              >
                Verify &amp; Sign In
              </Button>

              {/* Get out, or get another code */}
              <div className="flex items-center justify-between gap-3 border-t border-border-default pt-3.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIs2FA(false)
                    setCodeError('')
                    setOtpDigits(['', '', '', '', '', ''])
                  }}
                  className="flex cursor-pointer items-center gap-1 text-text-tertiary transition-colors hover:text-text-primary"
                >
                  <ArrowLeft size={13} /> Back to sign in
                </button>

                {challengeMethod === 'EMAIL' ? (
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resending || resendIn > 0}
                    className="flex cursor-pointer items-center gap-1.5 font-medium text-accent transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:text-text-tertiary"
                  >
                    <Send size={12} />
                    {resending
                      ? 'Sending…'
                      : resendIn > 0
                        ? `Resend in ${resendIn}s`
                        : 'Send a new code'}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-text-tertiary">
                    <RefreshCw size={12} /> Refreshes every 30s
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Bottom link — not while a sign-in is half-finished */}
          {!is2FA && (
          <p className="text-center text-[13px] text-text-secondary border-t border-border-default pt-4">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-accent hover:text-accent-hover font-semibold transition-colors"
            >
              Create account
            </Link>
          </p>
          )}
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
