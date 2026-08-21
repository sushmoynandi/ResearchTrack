'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { PasswordToggle } from '@/components/auth/PasswordToggle'
import { User as UserIcon, Mail, Lock, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const { addToast } = useToast()
  const { setAuthSession } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Password strength calculation
  const calculateStrength = (pass: string) => {
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 10) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }

  const passwordScore = calculateStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return

    if (password !== confirmPassword) {
      addToast('error', 'Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        addToast('success', 'Account created! Welcome to ResearchTrack.')
        // Same landing as Continue with Google — straight to the main page
        window.location.href = '/'
      } else {
        addToast('error', data.error || 'Failed to create account')
      }
    } catch {
      addToast('error', 'Network error creating account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      contentClassName="max-w-sm"
      headline="Start your research library today."
      subheadline="Create an account to track papers, extract ArXiv metadata in one click, and collaborate with your lab."
      title="Create your account"
      subtitle="Set up your workspace in under a minute."
    >
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Full Name *"
              placeholder="Dr. Evelyn Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<UserIcon size={15} />}
              required
            />

            <Input
              label="Academic or Work Email *"
              placeholder="e.vance@stanford.edu"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={15} />}
              required
            />

            {/* Password with strength meter */}
            <div className="space-y-1.5">
              <Input
                label="Password *"
                placeholder="At least 6 characters"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={15} />}
                trailing={
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    label="password"
                  />
                }
                required
              />

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1 h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordScore >= 1 ? (passwordScore <= 2 ? 'bg-warning w-1/3' : passwordScore === 3 ? 'bg-info w-2/3' : 'bg-success w-full') : 'bg-danger w-1/4'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-text-tertiary">
                    {passwordScore <= 1 && 'Weak password'}
                    {passwordScore === 2 && 'Fair password'}
                    {passwordScore === 3 && 'Good password'}
                    {passwordScore >= 4 && 'Strong password'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Input
                label="Confirm Password *"
                placeholder="Re-enter your password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock size={15} />}
                trailing={
                  <PasswordToggle
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((v) => !v)}
                    label="confirm password"
                  />
                }
                required
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <span className="text-[10px] text-danger">Passwords don&apos;t match</span>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={!!confirmPassword && confirmPassword !== password}
              className="w-full mt-5 h-11"
              icon={<ArrowRight size={15} />}
            >
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border-default" />
            <span className="text-[11px] uppercase tracking-wider text-text-tertiary">or sign up with</span>
            <div className="h-px flex-1 bg-border-default" />
          </div>

          {/* Google sign-up */}
          <GoogleButton mode="register" label="Sign up with Google" />

          {/* Bottom link */}
          <p className="text-center text-[13px] text-text-secondary border-t border-border-default pt-4">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-accent hover:text-accent-hover font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
    </AuthSplitLayout>
  )
}
