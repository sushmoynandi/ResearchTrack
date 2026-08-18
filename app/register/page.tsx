'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  User as UserIcon,
  Mail,
  Lock,
  Building,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Atom,
} from 'lucide-react'

const systemRoleOptions = [
  { value: 'STUDENT', label: 'Student Researcher' },
  { value: 'SUPERVISOR', label: 'Supervisor / Faculty Advisor' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { refreshUser, setAuthSession } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [systemRole, setSystemRole] = useState('STUDENT')
  const [showPassword, setShowPassword] = useState(false)
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

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          institution,
          department,
          systemRole,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token)
        }
        addToast('success', 'Account created! Welcome to ResearchTrack.')
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
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fade-in py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mb-3 shadow-glow">
            <Atom size={26} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            Create Researcher Account
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Build and organize your personalized research library
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Password *</label>
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
                placeholder="At least 6 characters"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={15} />}
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

            {/* Account Type */}
            <Select
              label="I am a..."
              options={systemRoleOptions}
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
            />

            {/* Institution & Department row */}
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
              loading={loading}
              className="w-full mt-3 h-11"
              icon={<ArrowRight size={15} />}
            >
              Complete Registration
            </Button>
          </form>

          {/* Bottom links */}
          <div className="pt-4 border-t border-border-default text-center">
            <p className="text-xs text-text-secondary">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-accent hover:text-accent-hover font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
