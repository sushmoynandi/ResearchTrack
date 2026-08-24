'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  Calendar,
  Clock,
  Bell,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

interface CalendarSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CalendarSubscriptionModal({ isOpen, onClose }: CalendarSubscriptionModalProps) {
  const { addToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [data, setData] = useState<{
    token: string
    webcalUrl: string
    googleCalendarSubscribeUrl: string
    httpFeedUrl: string
  } | null>(null)

  const fetchToken = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/token')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        addToast('error', 'Failed to load calendar subscription settings')
      }
    } catch {
      addToast('error', 'Network error fetching calendar settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchToken()
    }
  }, [isOpen])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    addToast('success', 'Calendar feed URL copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleResetToken = async () => {
    if (!confirm('Are you sure you want to regenerate your calendar token? Existing calendar subscriptions on external devices will stop updating until you update them with the new link.')) {
      return
    }

    setResetting(true)
    try {
      const res = await fetch('/api/calendar/token', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        addToast('success', 'Calendar subscription token regenerated!')
      } else {
        addToast('error', 'Failed to regenerate token')
      }
    } catch {
      addToast('error', 'Network error regenerating token')
    } finally {
      setResetting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ Live Google & Apple Calendar Auto-Sync"
      description="Connect your calendar once. All upcoming meetings, reading sprint deadlines, and lab seminars will appear automatically with active 1h, 30m, and 10m reminder notifications."
      size="lg"
    >
      <div className="space-y-6 pt-2 select-text">
        {/* Multi-Stage Notification Reminder Alert Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/15 via-bg-secondary to-bg-tertiary border border-accent/30 space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-accent" />
            <h4 className="text-sm font-bold text-text-primary font-display">
              Automatic Multi-Stage Reminder Alarms Active
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-bg-primary/80 border border-border-default/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>🔔 1 Hour Before</span>
                <Clock size={12} />
              </div>
              <p className="text-[11px] text-text-secondary leading-snug">
                Early prep reminder with direct link to the paper workspace or meeting room.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg-primary/80 border border-border-default/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                <span>🔔 30 Mins Before</span>
                <Clock size={12} />
              </div>
              <p className="text-[11px] text-text-secondary leading-snug">
                Mid-term alert with seminar agenda notes and presentation slides.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg-primary/80 border border-border-default/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>🔔 10 Mins Before</span>
                <Clock size={12} />
              </div>
              <p className="text-[11px] text-text-secondary leading-snug">
                Urgent join alarm with 1-click video call button.
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Subscribe Buttons */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary font-mono">
            1-Click Calendar Subscription
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="primary"
              className="w-full justify-center h-12 shadow-md gap-2"
              icon={<Calendar size={16} />}
              disabled={!data}
              onClick={() => {
                if (data?.googleCalendarSubscribeUrl) {
                  window.open(data.googleCalendarSubscribeUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <span>Add to Google Calendar</span>
              <ExternalLink size={13} className="opacity-70" />
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-center h-12 gap-2"
              icon={<Sparkles size={16} className="text-accent" />}
              disabled={!data}
              onClick={() => {
                if (data?.webcalUrl) {
                  window.location.href = data.webcalUrl
                }
              }}
            >
              <span>Add to Apple / Outlook (webcal)</span>
              <ExternalLink size={13} className="opacity-70" />
            </Button>
          </div>
        </div>

        {/* Private Calendar Subscription URL */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-accent" /> Private iCal / WebCal Feed URL
            </label>
            <span className="text-[10px] font-mono text-text-tertiary">Auto-Refreshes Every 15 Mins</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={data?.httpFeedUrl || 'Loading calendar feed URL...'}
              className="flex-1 bg-bg-tertiary border border-border-default rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none select-all"
            />
            <Button
              size="sm"
              variant="secondary"
              icon={copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              onClick={() => data?.httpFeedUrl && handleCopy(data.httpFeedUrl)}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-[11px] text-text-tertiary">
            Keep this URL private. You can paste it into Google Calendar (under "Add other calendars" &rarr; "From URL") or Outlook.
          </p>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border-default flex-wrap gap-2">
          <Button
            size="xs"
            variant="ghost"
            icon={<RefreshCw size={12} className={resetting ? 'animate-spin' : ''} />}
            onClick={handleResetToken}
            disabled={resetting || loading}
          >
            Reset Calendar Token
          </Button>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
