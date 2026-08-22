'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ImageCropper } from '@/components/ui/ImageCropper'
import { Textarea } from '@/components/ui/Textarea'
import { PasswordToggle } from '@/components/auth/PasswordToggle'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { useToast } from '@/components/ui/Toast'
import { roleLabel } from '@/lib/roles'
import { TwoFactorCard } from '@/components/auth/TwoFactorCard'
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
  Trash2,
  Camera,
  X,
  UserCog,
  Clock,
  XCircle,
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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const roleBadges: Record<
  string,
  { label: string; variant: 'info' | 'success' | 'danger' }
> = {
  STUDENT: { label: 'Student Researcher', variant: 'info' },
  SUPERVISOR: { label: 'Supervisor', variant: 'success' },
  ADMIN: { label: 'Administrator', variant: 'danger' },
}

interface RoleRequest {
  id: string
  currentRole: string
  requestedRole: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export default function ProfilePage() {
  const { user, refreshUser, loading } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Profile photo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [photoToCrop, setPhotoToCrop] = useState<string | null>(null)

  // Role change request
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([])
  const [roleReason, setRoleReason] = useState('')
  const [sendingRoleRequest, setSendingRoleRequest] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

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

  const loadRoleRequests = async () => {
    try {
      const res = await fetch('/api/user/role-request')
      if (res.ok) setRoleRequests(await res.json())
    } catch {
      // A missing history just means the card shows the plain request form
    }
  }

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setInstitution(user.institution || '')
      setDepartment(user.department || '')
      checkPushStatus()
      loadRoleRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleRoleRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!roleReason.trim()) {
      addToast('error', 'Please say why you need this role')
      return
    }

    setSendingRoleRequest(true)
    try {
      const res = await fetch('/api/user/role-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedRole, reason: roleReason }),
      })
      const data = await res.json()

      if (res.ok) {
        addToast('success', 'Request sent — an admin will review it')
        setRoleReason('')
        await loadRoleRequests()
      } else {
        addToast('error', data.error || 'Could not send your request')
      }
    } catch {
      addToast('error', 'Network error sending your request')
    } finally {
      setSendingRoleRequest(false)
    }
  }

  const handleCancelRoleRequest = async () => {
    setSendingRoleRequest(true)
    try {
      const res = await fetch('/api/user/role-request', { method: 'DELETE' })
      if (res.ok) {
        addToast('info', 'Request withdrawn')
        await loadRoleRequests()
      } else {
        const data = await res.json()
        addToast('error', data.error || 'Could not withdraw your request')
      }
    } catch {
      addToast('error', 'Network error withdrawing your request')
    } finally {
      setSendingRoleRequest(false)
    }
  }

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

  const savePhoto = async (image: string | null) => {
    setSavingPhoto(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })

      if (res.ok) {
        await refreshUser()
        setPhotoToCrop(null)
        addToast('success', image ? 'Profile photo updated' : 'Profile photo removed')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Could not save your photo')
      }
    } catch {
      addToast('error', 'Network error saving your photo')
    } finally {
      setSavingPhoto(false)
    }
  }

  /** Read the picked file, then hand it to the cropper so they can frame it. */
  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Let them pick the same file again later
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please choose an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'Please choose an image under 10MB')
      return
    }

    const reader = new FileReader()
    reader.onerror = () => addToast('error', 'Could not read that file')
    reader.onload = () => setPhotoToCrop(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Google accounts that never set a password get "Add Password" instead
  const hasPassword = user?.hasPassword !== false

  // Only two roles exist, so the request is always for "the other one"
  const requestedRole = user?.systemRole === 'SUPERVISOR' ? 'STUDENT' : 'SUPERVISOR'
  const pendingRoleRequest = roleRequests.find((r) => r.status === 'PENDING')
  const decidedRoleRequests = roleRequests.filter((r) => r.status !== 'PENDING').slice(0, 3)

  // What this person *is* reads better than how they signed up
  const roleBadge = roleBadges[user?.systemRole ?? ''] ?? {
    label: 'Researcher',
    variant: 'info' as const,
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return

    setDeletingAccount(true)
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' })
      const data = await res.json()

      if (res.ok) {
        addToast('success', 'Your account has been deleted.')
        // Full reload so every bit of in-memory session state is dropped
        window.location.href = '/login'
        return
      }

      addToast('error', data.error || 'Could not delete your account')
      setDeletingAccount(false)
    } catch {
      addToast('error', 'Network error while deleting your account')
      setDeletingAccount(false)
    }
  }

  const closeDeleteModal = () => {
    if (deletingAccount) return
    setDeleteOpen(false)
    setDeleteConfirmText('')
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
        addToast(
          'success',
          hasPassword
            ? 'Password changed successfully'
            : 'Password added — you can now sign in with your email and password too'
        )
        await refreshUser()
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to save your password')
      }
    } catch {
      addToast('error', 'Network error saving your password')
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
          {/* Avatar — click to change, with a small remove button once set */}
          <div className="relative shrink-0 group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingPhoto}
              aria-label={user.image ? 'Change profile photo' : 'Add a profile photo'}
              className="relative w-20 h-20 rounded-2xl bg-accent-subtle border-2 border-accent/40 text-accent font-bold text-2xl flex items-center justify-center shadow-glow overflow-hidden cursor-pointer transition-all duration-200 hover:border-accent disabled:cursor-wait"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}

              {/* Hover / busy overlay */}
              <span
                className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/65 text-white transition-opacity duration-200 ${
                  savingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {savingPhoto ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={17} />
                    <span className="text-[9px] font-semibold tracking-wide">
                      {user.image ? 'Change' : 'Add photo'}
                    </span>
                  </>
                )}
              </span>
            </button>

            {user.image && !savingPhoto && (
              <button
                type="button"
                onClick={() => savePhoto(null)}
                aria-label="Remove profile photo"
                title="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-bg-secondary border border-border-default text-text-tertiary flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-danger hover:border-danger/50 transition-all duration-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoPicked}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-text-primary font-display">
                {user.name}
              </h2>
              <Badge variant={roleBadge.variant} size="sm">
                {roleBadge.label}
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

      {/* Role change request — decided by an admin, never by the person asking */}
      {!user.isGuest && user.systemRole !== 'ADMIN' && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-border-default pb-2.5">
            <div className="flex items-center gap-2">
              <UserCog size={16} className="text-accent" />
              <h3 className="text-sm font-semibold text-text-primary font-display">
                Account Role
              </h3>
            </div>
            <Badge variant={roleBadge.variant} size="sm">
              {roleBadge.label}
            </Badge>
          </div>

          {pendingRoleRequest ? (
            <div className="p-3.5 rounded-xl bg-warning-subtle border border-warning/30 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Clock size={14} className="text-warning shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-warning">
                    Waiting for an administrator
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    You asked to become a{' '}
                    <span className="text-text-primary font-semibold">
                      {roleLabel(pendingRoleRequest.requestedRole)}
                    </span>{' '}
                    on {formatDate(pendingRoleRequest.createdAt)}.
                  </p>
                  {pendingRoleRequest.reason && (
                    <p className="text-[11px] text-text-tertiary italic">
                      &ldquo;{pendingRoleRequest.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleCancelRoleRequest}
                loading={sendingRoleRequest}
                icon={<XCircle size={13} />}
              >
                Withdraw request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRoleRequest} className="space-y-3 max-w-2xl">
              {/* Only two roles exist, so there's nothing to pick — just say
                  which one this request is for. */}
              <p className="text-xs text-text-secondary">
                Request to become{' '}
                <span className="font-semibold text-accent">
                  {roleLabel(requestedRole)}
                </span>{' '}
                — an administrator reviews it.
              </p>

              <Textarea
                label="Why do you need this role? *"
                placeholder="e.g. I now supervise three MSc students in the NLP group."
                rows={2}
                maxLength={500}
                showCount
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                required
              />

              <Button
                type="submit"
                size="sm"
                variant="secondary"
                loading={sendingRoleRequest}
                disabled={!roleReason.trim()}
                icon={<UserCog size={14} />}
              >
                Send Request to Admin
              </Button>
            </form>
          )}

          {/* Recently decided requests */}
          {decidedRoleRequests.length > 0 && (
            <div className="pt-3 border-t border-border-default space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Earlier requests
              </p>
              {decidedRoleRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary"
                >
                  <Badge
                    variant={req.status === 'APPROVED' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {req.status === 'APPROVED' ? 'Approved' : 'Declined'}
                  </Badge>
                  <span>
                    {roleLabel(req.currentRole)} → {roleLabel(req.requestedRole)}
                  </span>
                  <span className="text-text-tertiary">
                    · {formatDate(req.reviewedAt || req.createdAt)}
                  </span>
                  {req.reviewNote && (
                    <span className="text-text-tertiary italic">
                      — {req.reviewNote}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two-factor — open to every account; the card looks after itself */}
      <TwoFactorCard />

      {/* Password — "Change" for password accounts, "Add" for Google-only ones */}
      {!user.isGuest && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border-default pb-3">
            <Lock size={18} className="text-accent" />
            <h3 className="text-base font-semibold text-text-primary font-display">
              {hasPassword ? 'Change Password' : 'Add Password'}
            </h3>
          </div>

          {!hasPassword && (
            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl -mt-2">
              You signed up with Google, so there&apos;s no password on this account
              yet. Add one and you&apos;ll be able to sign in either way — with Google, or with{' '}
              <span className="text-text-primary font-medium">{user.email}</span> and
              your password.
            </p>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
            {hasPassword && (
              <Input
                label="Current Password"
                placeholder="••••••••"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                trailing={
                  <PasswordToggle
                    visible={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword((v) => !v)}
                    label="current password"
                  />
                }
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Input
                  label={hasPassword ? 'New Password' : 'Password'}
                  placeholder="At least 6 characters"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  trailing={
                    <PasswordToggle
                      visible={showNewPassword}
                      onToggle={() => setShowNewPassword((v) => !v)}
                      label={hasPassword ? 'new password' : 'password'}
                    />
                  }
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="space-y-1.5">
                <Input
                  label={hasPassword ? 'Confirm New Password' : 'Confirm Password'}
                  placeholder="••••••••"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  trailing={
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((v) => !v)}
                      label="confirm password"
                    />
                  }
                />
                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                  <span className="text-[10px] text-danger">
                    Passwords don&apos;t match
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="secondary"
                loading={savingPassword}
                disabled={
                  !newPassword || (!!confirmPassword && confirmPassword !== newPassword)
                }
              >
                {hasPassword ? 'Update Password' : 'Add Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Danger Zone: delete account ─── */}
      <div className="glass-card p-6 space-y-5 border-danger/30">
        <div className="flex items-center gap-2 border-b border-danger/20 pb-3">
          <AlertTriangle size={18} className="text-danger" />
          <h3 className="text-base font-semibold text-text-primary font-display">
            Danger Zone
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <p className="text-sm font-semibold text-text-primary">Delete this account</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Removes your account along with your papers, notes, tags, collections,
              assignments and lab memberships. This cannot be undone.
            </p>
          </div>

          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            icon={<Trash2 size={15} />}
            className="shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* ─── Frame your profile photo ─── */}
      {photoToCrop && (
        <ImageCropper
          key={photoToCrop}
          src={photoToCrop}
          saving={savingPhoto}
          onCancel={() => setPhotoToCrop(null)}
          onCropped={(dataUrl) => savePhoto(dataUrl)}
        />
      )}

      {/* ─── Confirmation window ─── */}
      <Modal
        isOpen={deleteOpen}
        onClose={closeDeleteModal}
        size="sm"
        title="Delete your account?"
        description="This is permanent — there is no undo and no way to recover the data."
      >
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 space-y-2">
            <p className="text-xs font-semibold text-danger flex items-center gap-1.5">
              <AlertTriangle size={13} /> What gets deleted
            </p>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>Every paper in your library, and all the notes on them</li>
              <li>Your collections, tags and saved reading progress</li>
              <li>Your lab memberships, assignments and meeting history</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-text-secondary">
              Type <span className="font-bold text-text-primary">DELETE</span> below to confirm
            </label>
            <Input
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={closeDeleteModal} disabled={deletingAccount}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deletingAccount}
              disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              icon={<Trash2 size={15} />}
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
