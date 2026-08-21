'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { PasswordToggle } from '@/components/auth/PasswordToggle'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { GoogleButton } from '@/components/auth/GoogleButton'
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Atom,
  MailCheck,
  TriangleAlert,
} from 'lucide-react'

function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { setAuthSession } = useAuth()

  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  /** True when the server can't send email at all — Google sign-in is the way in. */
  const [emailUnavailable, setEmailUnavailable] = useState(false)

  // Carry over whatever they'd already typed on the sign-in form
  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill) setEmail(prefill)
  }, [searchParams])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((n) => n - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) return

    setSending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (data.emailUnavailable) {
        setEmailUnavailable(true)
        return
      }

      if (res.ok) {
        setStep('reset')
        setResendIn(60)
        addToast('success', data.message || 'Check your email for the code')
      } else {
        addToast('error', data.error || 'Could not send the code')
      }
    } catch {
      addToast('error', 'Network error sending the code')
    } finally {
      setSending(false)
    }
  }

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match')
      return
    }

    setResetting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        addToast('success', 'Password updated')
        if (data.signedIn && data.user && data.token) {
          setAuthSession(data.user, data.token)
          window.location.href = '/'
        } else {
          router.push('/login')
        }
      } else {
        addToast('error', data.error || 'Could not reset your password')
      }
    } catch {
      addToast('error', 'Network error resetting your password')
    } finally {
      setResetting(false)
    }
  }

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword

  return (
    <AuthSplitLayout
      headline="Locked out? Let's fix that."
      subheadline="We'll email you a short code, you pick a new password, and you're straight back to your library."
      title={
        emailUnavailable
          ? 'Sign in with Google instead'
          : step === 'email'
            ? 'Forgot your password?'
            : 'Set a new password'
      }
      subtitle={
        emailUnavailable
          ? 'We can’t email you a reset code at the moment.'
          : step === 'email'
            ? 'Tell us your email address and we’ll send you a reset code.'
            : `Enter the 6-digit code we sent to ${email}.`
      }
    >
      {emailUnavailable ? (
        /* ─── No mail can go out, so don't invent a way around it ─── */
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning-subtle border border-warning/30">
            <TriangleAlert size={15} className="text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-warning">
                Reset codes aren&apos;t being sent right now
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                A reset code only counts for something if it reaches your inbox and
                nobody else&apos;s, so we won&apos;t show one here. Use Google to sign
                in instead — it proves the same thing, more strongly.
              </p>
            </div>
          </div>

          <GoogleButton mode="login" label="Continue with Google" />

          <p className="text-[11px] text-text-tertiary leading-relaxed">
            Once you&apos;re in, open{' '}
            <span className="text-text-secondary font-medium">Profile → Add Password</span>{' '}
            to set a password you&apos;ll remember. After that either way of signing in
            will work.
          </p>

          <button
            type="button"
            onClick={() => setEmailUnavailable(false)}
            className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          >
            Try a different email
          </button>
        </div>
      ) : step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-3.5">
          <Input
            label="Email Address"
            placeholder="researcher@institute.edu"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={15} />}
            required
            autoFocus
          />

          <Button
            type="submit"
            loading={sending}
            className="w-full h-11"
            icon={<ArrowRight size={15} />}
          >
            Send Reset Code
          </Button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-3.5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-subtle border border-accent/25">
            <MailCheck size={15} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              If <span className="text-text-primary font-medium">{email}</span> has an
              account, the code is on its way. It expires in 15 minutes.
            </p>
          </div>

          <Input
            label="6-Digit Code"
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            icon={<KeyRound size={15} />}
            className="tracking-[0.4em] font-mono"
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <Input
              label="New Password"
              placeholder="At least 6 characters"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<Lock size={15} />}
              trailing={
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  label="new password"
                />
              }
              required
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div className="space-y-1.5">
            <Input
              label="Confirm New Password"
              placeholder="Re-enter your password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={15} />}
              trailing={
                <PasswordToggle
                  visible={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  label="confirm password"
                />
              }
              required
            />
            {passwordsMismatch && (
              <span className="text-[10px] text-danger">Passwords don&apos;t match</span>
            )}
          </div>

          <Button
            type="submit"
            loading={resetting}
            disabled={code.length !== 6 || !newPassword || passwordsMismatch}
            className="w-full h-11"
            icon={<ArrowRight size={15} />}
          >
            Set New Password
          </Button>

          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            >
              Wrong email?
            </button>
            <button
              type="button"
              onClick={() => requestCode()}
              disabled={resendIn > 0 || sending}
              className="text-accent hover:text-accent-hover font-semibold transition-colors cursor-pointer disabled:text-text-tertiary disabled:cursor-not-allowed"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-[13px] text-text-secondary border-t border-border-default pt-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover font-semibold transition-colors"
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 animate-spin-slow">
              <Atom size={26} />
            </div>
            <p className="text-xs text-text-secondary">Loading ResearchTrack...</p>
          </div>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  )
}
