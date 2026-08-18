'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  User as UserIcon,
  Building,
  Mail,
  Lock,
  Calendar,
  FileText,
  FolderOpen,
  MessageSquare,
  Tags,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshUser, loading } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setInstitution(user.institution || '')
      setDepartment(user.department || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSavingProfile(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, institution, department }),
      })

      if (res.ok) {
        addToast('success', 'Profile updated successfully')
        await refreshUser()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update profile')
      }
    } catch {
      addToast('error', 'Network error updating profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      addToast('error', 'New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        addToast('success', 'Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to change password')
      }
    } catch {
      addToast('error', 'Network error changing password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 bg-bg-secondary rounded-2xl border border-border-default" />
        <div className="h-60 bg-bg-secondary rounded-2xl border border-border-default" />
      </div>
    )
  }

  if (!user) return null

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      {/* Guest warning banner if guest */}
      {user.isGuest && (
        <div className="glass-card p-5 border-l-4 border-l-warning flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning-subtle text-warning flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                You are using a Guest Sandbox session
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Register a permanent account to keep your papers, notes, and collections accessible from any device.
              </p>
            </div>
          </div>

          <Link href="/register">
            <Button size="sm" className="shrink-0" icon={<Sparkles size={14} />}>
              Create Permanent Account
            </Button>
          </Link>
        </div>
      )}

      {/* Profile Header Hero */}
      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-accent-subtle border-2 border-accent/40 text-accent font-bold text-2xl flex items-center justify-center shadow-glow shrink-0">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-text-primary font-display">
                {user.name}
              </h2>
              <Badge variant="info" size="sm">
                {user.provider}
              </Badge>
              {user.isGuest && (
                <Badge variant="warning" size="sm">
                  Guest
                </Badge>
              )}
            </div>

            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <Mail size={13} className="text-accent" /> {user.email}
            </p>

            {user.institution && (
              <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                <Building size={13} className="text-accent" /> {user.institution}
                {user.department && <span> · {user.department}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border-default pb-3">
          <UserIcon size={18} className="text-accent" />
          <h3 className="text-base font-semibold text-text-primary font-display">
            Personal Information &amp; Research Affiliation
          </h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-2xl">
          <Input
            label="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Institution / Lab"
              placeholder="e.g. Stanford AI Lab"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />

            <Input
              label="Department"
              placeholder="e.g. Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" loading={savingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Password Change (for Credentials users) */}
      {!user.isGuest && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border-default pb-3">
            <Lock size={18} className="text-accent" />
            <h3 className="text-base font-semibold text-text-primary font-display">
              Change Password
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
            <Input
              label="Current Password"
              placeholder="••••••••"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                placeholder="At least 6 characters"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                label="Confirm New Password"
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="secondary"
                loading={savingPassword}
                disabled={!newPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
