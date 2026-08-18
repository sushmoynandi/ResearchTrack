'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Clock,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'ASSIGNMENT' | 'FEEDBACK' | 'STATUS_UPDATE' | 'SYSTEM'
  link: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [loading, setLoading] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 25000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAsRead = async (id: string, link: string | null) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      if (link) {
        setIsOpen(false)
        router.push(link)
      }
    } catch {
      // silent
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      addToast('info', 'All notifications marked as read')
    } catch {
      addToast('error', 'Failed to update notifications')
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const filtered = notifications.filter((n) => {
    if (filterType === 'ALL') return true
    return n.type === filterType
  })

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
        aria-label="Notifications"
        title="Lab Activity & Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-bg-primary animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-bg-secondary border border-border-default shadow-modal overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-tertiary/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider font-display">
                Lab Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3 py-2 bg-bg-secondary border-b border-border-default overflow-x-auto text-[11px]">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ASSIGNMENT', label: 'Assignments' },
              { id: 'FEEDBACK', label: 'Feedback' },
              { id: 'STATUS_UPDATE', label: 'Progress' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap font-medium ${
                  filterType === tab.id
                    ? 'bg-accent text-white font-bold'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border-default/50">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isAssignment = item.type === 'ASSIGNMENT'
                const isFeedback = item.type === 'FEEDBACK'
                const isStatus = item.type === 'STATUS_UPDATE'

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id, item.link)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      item.isRead
                        ? 'bg-bg-secondary hover:bg-bg-tertiary/70 opacity-75'
                        : 'bg-accent/5 hover:bg-accent/10 border-l-2 border-l-accent'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAssignment
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : isFeedback
                          ? 'bg-purple-500/10 text-purple-400'
                          : isStatus
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-bg-tertiary text-text-tertiary'
                      }`}
                    >
                      {isAssignment && <ClipboardList size={14} />}
                      {isFeedback && <MessageSquare size={14} />}
                      {isStatus && <CheckCircle2 size={14} />}
                      {!isAssignment && !isFeedback && !isStatus && <Bell size={14} />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-text-tertiary font-mono whitespace-nowrap">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-xs text-text-tertiary space-y-2">
                <Bell size={24} className="mx-auto opacity-30 text-accent" />
                <p>No notifications in this view.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
