'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  CheckCircle2,
  XCircle,
  Building,
  Layers,
  ExternalLink,
  User,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ScheduleMeetingModal } from '@/components/labs/ScheduleMeetingModal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { CalendarSyncButton } from '@/components/calendar/CalendarSyncButton'

interface MeetingItem {
  id: string
  title: string
  description: string | null
  meetingType: string
  startTime: string
  endTime: string | null
  location: string | null
  meetingUrl: string | null
  agenda: string | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  host: { id: string; name: string; email: string; department?: string }
  group: { id: string; name: string; color: string } | null
}

interface LabMeetingsBoardProps {
  labId: string
  groups: { id: string; name: string; color: string }[]
  isLeadOrSupervisor: boolean
}

export function LabMeetingsBoard({
  labId,
  groups,
  isLeadOrSupervisor,
}: LabMeetingsBoardProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'labwide' | 'groups'>('all')
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [expandedAgendaId, setExpandedAgendaId] = useState<string | null>(null)

  // Edit Meeting State
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editMeetingUrl, setEditMeetingUrl] = useState('')
  const [editAgenda, setEditAgenda] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/meetings`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (labId) fetchMeetings()
  }, [labId])

  const handleStatusChange = async (meetingId: string, status: 'COMPLETED' | 'CANCELLED') => {
    try {
      const res = await fetch(`/api/labs/${labId}/meetings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, status }),
      })

      if (res.ok) {
        addToast('success', `Meeting marked as ${status.toLowerCase()}`)
        fetchMeetings()
      } else {
        addToast('error', 'Failed to update meeting status')
      }
    } catch {
      addToast('error', 'Network error')
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this scheduled meeting?')) return
    try {
      const res = await fetch(`/api/labs/${labId}/meetings?meetingId=${meetingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Meeting removed')
        fetchMeetings()
      } else {
        addToast('error', 'Failed to delete meeting')
      }
    } catch {
      addToast('error', 'Network error')
    }
  }

  const handleOpenEdit = (m: MeetingItem) => {
    setEditingMeeting(m)
    setEditTitle(m.title)
    const localDate = new Date(m.startTime)
    const year = localDate.getFullYear()
    const month = String(localDate.getMonth() + 1).padStart(2, '0')
    const day = String(localDate.getDate()).padStart(2, '0')
    const hours = String(localDate.getHours()).padStart(2, '0')
    const minutes = String(localDate.getMinutes()).padStart(2, '0')
    setEditStartTime(`${year}-${month}-${day}T${hours}:${minutes}`)
    setEditLocation(m.location || '')
    setEditMeetingUrl(m.meetingUrl || '')
    setEditAgenda(m.agenda || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMeeting) return
    setSavingEdit(true)
    try {
      const localFormattedTime = new Date(editStartTime).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      const res = await fetch(`/api/labs/${labId}/meetings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: editingMeeting.id,
          title: editTitle.trim(),
          startTime: new Date(editStartTime).toISOString(),
          formattedTime: localFormattedTime,
          location: editLocation.trim() || undefined,
          meetingUrl: editMeetingUrl.trim() || undefined,
          agenda: editAgenda.trim() || undefined,
        }),
      })

      if (res.ok) {
        addToast('success', 'Lab meeting updated and members notified!')
        setEditingMeeting(null)
        fetchMeetings()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update meeting')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSavingEdit(false)
    }
  }

  // Filter meetings by scope
  const filteredMeetings = meetings.filter((m) => {
    if (filter === 'labwide') return !m.group
    if (filter === 'groups') return Boolean(m.group)
    return true
  })

  // Format relative start time
  const formatMeetingTime = (startStr: string) => {
    const date = new Date(startStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    let badgeText = ''
    if (diffMs > 0 && diffHours <= 24) {
      badgeText = diffHours <= 1 ? 'In <1 hour' : `In ${diffHours} hours`
    } else if (diffMs > 0 && diffDays <= 7) {
      badgeText = `In ${diffDays} days`
    }

    return {
      formattedDate: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      formattedTime: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      relativePill: badgeText,
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <Calendar size={16} className="text-accent" /> Lab &amp; Sub-Group Meeting Schedule
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Synchronize progress with lab-wide syncs and targeted sub-group research sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-bg-tertiary rounded-lg border border-border-default text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-bg-elevated text-text-primary font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All ({meetings.length})
            </button>
            <button
              onClick={() => setFilter('labwide')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'labwide' ? 'bg-bg-elevated text-text-primary font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Building size={11} /> Lab-Wide
            </button>
            <button
              onClick={() => setFilter('groups')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'groups' ? 'bg-bg-elevated text-text-primary font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers size={11} /> Sub-Groups
            </button>
          </div>

          {isLeadOrSupervisor && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsScheduleModalOpen(true)}
              icon={<Plus size={13} />}
            >
              Schedule Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-text-tertiary">Loading meeting schedule...</div>
      ) : filteredMeetings.length > 0 ? (
        <div className="space-y-3">
          {filteredMeetings.map((m) => {
            const isCompleted = m.status === 'COMPLETED'
            const isCancelled = m.status === 'CANCELLED'
            const isLabWide = !m.group
            const timeData = formatMeetingTime(m.startTime)
            const isAgendaOpen = expandedAgendaId === m.id

            return (
              <div
                key={m.id}
                className={`glass-card p-5 space-y-3 transition-all ${
                  isCompleted || isCancelled
                    ? 'opacity-70 bg-bg-tertiary/30 border-border-default'
                    : isLabWide
                    ? 'border-accent/30 hover:border-accent/60'
                    : 'border-purple-500/30 hover:border-purple-500/60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Scope Badge */}
                      {isLabWide ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          <Building size={10} /> Lab-Wide Sync
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                          <Layers size={10} /> {m.group?.name} Cluster
                        </span>
                      )}

                      {/* Relative Countdown Pill */}
                      {timeData.relativePill && !isCompleted && !isCancelled && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                          <Clock size={10} className="inline mr-1" />
                          {timeData.relativePill}
                        </span>
                      )}

                      {/* Status */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : isCancelled
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-bg-tertiary text-text-secondary border-border-default'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-text-primary font-display">
                      {m.title}
                    </h4>

                    {/* Metadata Strip */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary pt-0.5">
                      <span className="flex items-center gap-1 text-text-secondary font-mono">
                        <Calendar size={12} className="text-accent" /> {timeData.formattedDate} at {timeData.formattedTime}
                      </span>

                      {m.location && (
                        <span className="flex items-center gap-1 text-text-secondary">
                          <MapPin size={12} className="text-accent" /> {m.location}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <User size={12} className="text-text-tertiary" /> Host: <strong className="text-text-secondary">{m.host.name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-default">
                    {m.meetingUrl && !isCompleted && !isCancelled && (
                      <a href={m.meetingUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="xs" variant="primary" icon={<Video size={13} />}>
                          Join Meeting
                        </Button>
                      </a>
                    )}

                    <CalendarSyncButton
                      event={{
                        title: `🔬 ${m.title}`,
                        description: [
                          `📋 Meeting: ${m.title}`,
                          `👥 Meeting Audience & Scope: ${m.group ? `Sub-Group Cluster (${m.group.name})` : 'Lab-Wide Research Sync'}`,
                          `👤 Host: ${m.host.name}${m.host.email ? ` (${m.host.email})` : ''}`,
                          m.meetingUrl ? `🔗 Join Link: ${m.meetingUrl}` : '',
                          m.location ? `📍 Location: ${m.location}` : '',
                          m.description ? `📝 Overview: ${m.description}` : '',
                          m.agenda ? `\n🎯 Agenda & Discussion Topics:\n${m.agenda}` : '',
                          `\n🏛️ Lab Portal: ${typeof window !== 'undefined' ? window.location.href : ''}`,
                        ].filter(Boolean).join('\n'),
                        startDate: new Date(m.startTime),
                        endDate: m.endTime ? new Date(m.endTime) : undefined,
                        location: m.location || m.meetingUrl || 'Virtual Lab Hub',
                        url: m.meetingUrl || undefined,
                      }}
                      filename={`lab_meeting_${m.title.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                      buttonText="Sync"
                      size="xs"
                    />

                    {m.agenda && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setExpandedAgendaId(isAgendaOpen ? null : m.id)}
                        icon={isAgendaOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      >
                        Agenda
                      </Button>
                    )}

                    {isLeadOrSupervisor && !isCompleted && !isCancelled && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleOpenEdit(m)}
                        icon={<Edit2 size={12} />}
                        title="Edit / Reschedule meeting"
                      >
                        Edit
                      </Button>
                    )}

                    {isLeadOrSupervisor && !isCompleted && !isCancelled && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleStatusChange(m.id, 'COMPLETED')}
                        icon={<CheckCircle2 size={12} className="text-success" />}
                        title="Mark meeting complete"
                      >
                        Complete
                      </Button>
                    )}

                    {isLeadOrSupervisor && (
                      <button
                        onClick={() => handleDeleteMeeting(m.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Cancel and remove meeting"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Agenda Section */}
                {isAgendaOpen && m.agenda && (
                  <div className="pt-3 border-t border-border-default/60 space-y-1.5 animate-fade-in">
                    <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">
                      Meeting Agenda &amp; Discussion Points:
                    </span>
                    <pre className="text-xs text-text-secondary bg-bg-tertiary/70 p-3 rounded-xl border border-border-default font-mono whitespace-pre-wrap leading-relaxed">
                      {m.agenda}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-xs text-text-tertiary space-y-2">
          <Calendar size={24} className="mx-auto opacity-30 text-accent" />
          <p>No upcoming meetings scheduled for this filter view.</p>
        </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <ScheduleMeetingModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          labId={labId}
          groups={groups}
          onMeetingScheduled={fetchMeetings}
        />
      )}

      {/* Edit Lab Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Edit2 size={18} className="text-accent" /> Edit / Reschedule Meeting
              </h3>
              <button
                onClick={() => setEditingMeeting(null)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                <p className="text-[10px] text-text-tertiary mt-1">
                  All invited members will receive an instant reschedule notification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Lab Room 402"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Meeting Link (Zoom / Google Meet)
                  </label>
                  <input
                    type="url"
                    value={editMeetingUrl}
                    onChange={(e) => setEditMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Agenda &amp; Discussion Points
                </label>
                <textarea
                  value={editAgenda}
                  onChange={(e) => setEditAgenda(e.target.value)}
                  rows={4}
                  placeholder="Meeting agenda items..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setEditingMeeting(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={savingEdit}>
                  Save Changes &amp; Notify Members
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
