'use client'

import React, { useState, useEffect } from 'react'
import { Bell, CheckCircle2, X, Sparkles, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

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

export function PushNotificationPrompt() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return

    // Register service worker if supported
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true)
      const currentPerm = Notification.permission
      setPermission(currentPerm)

      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          try {
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
              setIsSubscribed(true)
              // Ensure backend database always has this device registered
              const subJson = sub.toJSON()
              if (subJson.endpoint && subJson.keys) {
                fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                    userAgent: navigator.userAgent,
                  }),
                }).catch(() => {})
              }
            } else if (currentPerm === 'granted') {
              // Permission was already granted in browser, auto-create subscription
              const keyRes = await fetch('/api/notifications/subscribe')
              if (keyRes.ok) {
                const { publicKey } = await keyRes.json()
                const newSub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey),
                })
                const subJson = newSub.toJSON()
                await fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                    userAgent: navigator.userAgent,
                  }),
                })
                setIsSubscribed(true)
              }
            }
          } catch (e) {
            console.warn('Auto-sync push notice:', e)
          }
        })
        .catch((err) => {
          console.warn('Service worker registration notice:', err)
        })

      // Only sync if permission is already granted. Do NOT show unsolicited popup on page load.
      setShowPrompt(false)
    }
  }, [user?.id])

  const handleDismiss = () => {
    setShowPrompt(false)
    try {
      localStorage.setItem('push_prompt_dismissed_at', String(Date.now()))
    } catch {
      // non-blocking
    }
  }

  const handleSubscribe = async () => {
    if (!supported) {
      addToast('error', 'Push notifications are not supported by this browser.')
      return
    }

    setSubscribing(true)
    try {
      // 1. Request permission from user
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        addToast('error', 'Notification permission was not granted.')
        setShowPrompt(false)
        return
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch('/api/notifications/subscribe')
      if (!keyRes.ok) throw new Error('Failed to retrieve push service configuration')
      const { publicKey } = await keyRes.json()

      // 3. Register push subscription with service worker
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      // 4. Send subscription keys to backend
      const subJson = subscription.toJSON()
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
        setIsSubscribed(true)
        setShowPrompt(false)
        addToast('success', '🔔 Background phone notifications enabled!')
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save push subscription')
      }
    } catch (error: any) {
      console.error('Push subscription error:', error)
      addToast('error', error.message || 'Could not enable push notifications')
    } finally {
      setSubscribing(false)
    }
  }

  if (!supported || !user || permission === 'denied' || !showPrompt || isSubscribed) {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-40 animate-slide-up">
      <div className="glass-card p-4 rounded-2xl border-accent/40 bg-bg-secondary/95 shadow-modal backdrop-blur-md space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary font-display flex items-center gap-1.5">
                Enable Phone Alerts <Sparkles size={12} className="text-accent" />
              </h4>
              <p className="text-[11px] text-text-secondary leading-snug mt-0.5">
                Get real-time meeting reschedules, paper tasks, and lab notices on your phone even when closed.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-primary text-xs p-1 cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button size="xs" variant="ghost" onClick={handleDismiss}>
            Maybe Later
          </Button>
          <Button
            size="xs"
            variant="primary"
            onClick={handleSubscribe}
            loading={subscribing}
            icon={<Bell size={12} />}
          >
            Enable Phone Alerts
          </Button>
        </div>
      </div>
    </div>
  )
}
