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
  Bell,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
} from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

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

  // Web Push Notification State
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [registeredDevicesCount, setRegisteredDevicesCount] = useState(0)
  const [subscribingPush, setSubscribingPush] = useState(false)
  const [testingPush, setTestingPush] = useState(false)

  const checkPushStatus = async () => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setPushSupported(true)
      setPushPermission(Notification.permission)

      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          setIsPushSubscribed(true)
          // Auto-sync existing device subscription to backend
          const subJson = sub.toJSON()
          if (subJson.endpoint && subJson.keys) {
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint: subJson.endpoint,
                keys: subJson.keys,
                userAgent: navigator.userAgent,
              }),
            })
          }
        } else {
          setIsPushSubscribed(false)
        }

        // Fetch registered device count from backend
        const res = await fetch('/api/notifications/subscribe')
        if (res.ok) {
          const data = await res.json()
          setRegisteredDevicesCount(data.deviceCount || 0)
        }
      } catch (e) {
        console.warn('Error checking push status:', e)
      }
    }
  }

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setInstitution(user.institution || '')
      setDepartment(user.department || '')
      checkPushStatus()
    }
  }, [user])

  const handleEnablePush = async () => {
    if (!pushSupported) {
      addToast('error', 'Push notifications are not supported in this browser.')
      return
    }

    setSubscribingPush(true)
    try {
      const perm = await Notification.requestPermission()
      setPushPermission(perm)

      if (perm !== 'granted') {
        addToast('error', 'Notification permission was denied in browser settings.')
        return
      }

      const keyRes = await fetch('/api/notifications/subscribe')
      if (!keyRes.ok) throw new Error('Could not fetch push service configuration')
      const { publicKey } = await keyRes.json()

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const subJson = sub.toJSON()
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      })

      if (res.ok) {
        setIsPushSubscribed(true)
        addToast('success', '🔔 Background push alerts activated for this device!')
        await checkPushStatus()
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Failed to register push device')
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to enable push notifications')
    } finally {
      setSubscribingPush(false)
    }
  }

  const handleDisablePush = async () => {
    setSubscribingPush(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setIsPushSubscribed(false)
      addToast('info', 'Push notifications disabled for this device.')
      await checkPushStatus()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to disable push notifications')
    } finally {
      setSubscribingPush(false)
    }
  }

  const handleSendTestPush = async () => {
    setTestingPush(true)
    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        addToast('success', `🎉 ${data.message}`)
      } else {
        addToast('error', data.error || 'Failed to send test push alert')
      }
    } catch {
      addToast('error', 'Network error sending test push')
    } finally {
      setTestingPush(false)
    }
  }

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

      {/* Web Push & Mobile Notifications Management */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-accent" />
            <div>
              <h3 className="text-base font-semibold text-text-primary font-display">
                Web Push &amp; Device Notifications
              </h3>
              <p className="text-xs text-text-secondary">
                Receive background mobile &amp; desktop alerts for paper assignments, feedback, and lab notices even when the browser is closed.
              </p>
            </div>
          </div>

          <Button
            size="xs"
            variant="ghost"
            onClick={checkPushStatus}
            icon={<RefreshCw size={13} />}
            title="Refresh status"
          >
            Refresh
          </Button>
        </div>

        <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-default space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">Device Status:</span>
                {isPushSubscribed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> Active on this Device
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 border border-danger/20 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle size={12} /> Blocked in Browser Settings
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
                    <Bell size={12} /> Not Enabled on this Device
                  </span>
                )}
              </div>

              <p className="text-xs text-text-secondary">
                {isPushSubscribed
                  ? `Your device is registered to receive background push notifications (${registeredDevicesCount} active device${registeredDevicesCount === 1 ? '' : 's'} on your account).`
                  : pushPermission === 'denied'
                  ? 'Notifications are blocked by your browser. Please click the tune/lock icon in your browser URL bar and allow notifications.'
                  : 'Click below to allow browser notifications and link this device to your research queue.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isPushSubscribed ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleEnablePush}
                  loading={subscribingPush}
                  disabled={pushPermission === 'denied'}
                  icon={<Bell size={14} />}
                >
                  Enable Push Alerts
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSendTestPush}
                    loading={testingPush}
                    icon={<Send size={14} />}
                  >
                    Send Test Push Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDisablePush}
                    loading={subscribingPush}
                  >
                    Disable
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
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
