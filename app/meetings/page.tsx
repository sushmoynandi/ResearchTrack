'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Sparkles,
  BookOpen,
  ArrowRight,
  Save,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface MeetingItem {
  id: string
  title: string
  scheduledAt: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  studentNotes: string | null
  supervisorNotes: string | null
  actionItems: string | null
  student: { id: string; name: string; email: string; department?: string }
  supervisor: { id: string; name: string; email: string }
}

export default function MeetingsPage() {
  const { user, isSupervisor, isStudent, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)

  // Scheduling Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([])
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Active meeting editable notes
  const [studentNotes, setStudentNotes] = useState('')
  const [supervisorNotes, setSupervisorNotes] = useState('')
  const [actionItemsText, setActionItemsText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings')
      if (res.ok) {
        const data = await res.json()
        setMeetings(data)
        if (data.length > 0 && !activeMeetingId) {
          selectMeeting(data[0])
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const selectMeeting = (m: MeetingItem) => {
    setActiveMeetingId(m.id)
    setStudentNotes(m.studentNotes || '')
    setSupervisorNotes(m.supervisorNotes || '')
    setActionItemsText(m.actionItems || '')
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const handleOpenSchedule = async () => {
    setIsScheduleOpen(true)
    setTitle(`Weekly 1-on-1 Research Check-in (${new Date().toLocaleDateString()})`)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    setScheduledAt(tomorrow.toISOString().slice(0, 16))

    if (isSupervisor || isAdmin) {
      try {
        const res = await fetch('/api/students')
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          if (data.length > 0) setSelectedStudentId(data[0].id)
        }
      } catch {
        // silent
      }
    }
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scheduledAt: new Date(scheduledAt).toISOString(),
          studentId: isSupervisor ? selectedStudentId : user?.id,
          supervisorId: isSupervisor ? user?.id : user?.supervisorId,
        }),
      })

      if (res.ok) {
        addToast('success', '1-on-1 meeting scheduled!')
        setIsScheduleOpen(false)
        fetchMeetings()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to schedule meeting')
      }
    } catch {
      addToast('error', 'Network error scheduling meeting')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!activeMeetingId) return
    setSavingNotes(true)
    try {
      const res = await fetch('/api/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeMeetingId,
          studentNotes,
          supervisorNotes,
          actionItems: actionItemsText,
        }),
      })

      if (res.ok) {
        addToast('success', 'Meeting notes & action items saved!')
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === activeMeetingId
              ? { ...m, studentNotes, supervisorNotes, actionItems: actionItemsText }
              : m
          )
        )
      } else {
        addToast('error', 'Failed to save notes')
      }
    } catch {
      addToast('error', 'Network error saving notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleCompleteMeeting = async () => {
    if (!activeMeetingId) return
    try {
      const res = await fetch('/api/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeMeetingId,
          status: 'COMPLETED',
        }),
      })

      if (res.ok) {
        addToast('success', 'Meeting marked as COMPLETED!')
        setMeetings((prev) =>
          prev.map((m) => (m.id === activeMeetingId ? { ...m, status: 'COMPLETED' } : m))
        )
      }
    } catch {
      addToast('error', 'Failed to update meeting status')
    }
  }

  const activeMeeting = meetings.find((m) => m.id === activeMeetingId)

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <Calendar size={22} className="text-accent" /> Weekly 1-on-1 Advisor Meetings &amp; Action Hub
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Collaborative advisor check-ins: prepare literature review updates, set weekly action items, and bridge thesis milestones.
          </p>
        </div>

        <Button onClick={handleOpenSchedule} icon={<Plus size={16} />}>
          Schedule 1-on-1
        </Button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Meeting List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Clock size={14} className="text-accent" /> Scheduled Sessions ({meetings.length})
          </h3>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="card" height="90px" />
              ))}
            </div>
          ) : meetings.length > 0 ? (
            <div className="space-y-2.5">
              {meetings.map((m) => {
                const isSelected = m.id === activeMeetingId
                const isDone = m.status === 'COMPLETED'

                return (
                  <div
                    key={m.id}
                    onClick={() => selectMeeting(m)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-bg-secondary border-accent shadow-md'
                        : 'bg-bg-secondary/60 border-border-default hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isDone ? 'success' : 'default'} size="sm">
                        {m.status}
                      </Badge>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        {new Date(m.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-primary font-display line-clamp-1">
                      {m.title}
                    </h4>

                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <User size={12} className="text-text-tertiary" />
                      {isSupervisor ? `With: ${m.student.name}` : `Advisor: ${m.supervisor.name}`}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-tertiary glass-card space-y-2">
              <Calendar size={24} className="mx-auto opacity-30 text-accent" />
              <p>No 1-on-1 sessions recorded yet.</p>
            </div>
          )}
        </div>

        {/* Right 2 Cols: Collaborative Meeting Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {activeMeeting ? (
            <div className="glass-card p-6 md:p-8 space-y-6">
              {/* Meeting Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-accent/15 text-accent">
                      {new Date(activeMeeting.scheduledAt).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge variant={activeMeeting.status === 'COMPLETED' ? 'success' : 'default'} size="sm">
                      {activeMeeting.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary font-display">
                    {activeMeeting.title}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Student: <strong className="text-text-primary">{activeMeeting.student.name}</strong> • Supervisor:{' '}
                    <strong className="text-text-primary">{activeMeeting.supervisor.name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeMeeting.status !== 'COMPLETED' && (
                    <Button size="xs" variant="secondary" onClick={handleCompleteMeeting} icon={<CheckCircle2 size={13} />}>
                      Complete Session
                    </Button>
                  )}
                  <Button size="xs" variant="primary" onClick={handleSaveNotes} loading={savingNotes} icon={<Save size={13} />}>
                    Save Notes
                  </Button>
                </div>
              </div>

              {/* Collaborative Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Student Pre-Meeting Preparation */}
                <div className="space-y-2 p-4 rounded-2xl bg-bg-tertiary/40 border border-border-default">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen size={14} /> Student Pre-Meeting Prep
                    </h4>
                    <span className="text-[10px] text-text-tertiary">Filled by student</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    Papers synthesized this week, blockers encountered, and key discussion questions.
                  </p>

                  <textarea
                    placeholder="e.g. Synthesized 2 papers on DPO; question regarding compute bounds on Section 4 ablation..."
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    rows={7}
                    className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed"
                  />
                </div>

                {/* 2. Supervisor Faculty Guidance */}
                <div className="space-y-2 p-4 rounded-2xl bg-bg-tertiary/40 border border-border-default">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles size={14} /> Supervisor Guidance &amp; Direction
                    </h4>
                    <span className="text-[10px] text-text-tertiary">Faculty advisor</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    Strategic methodology advice, literature recommendations, and feedback.
                  </p>

                  <textarea
                    placeholder="e.g. Focus on comparing against the original RLHF baseline; review the 2023 NeurIPS survey paper..."
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    rows={7}
                    className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* 3. Action Items & Next Week Priorities */}
              <div className="p-4 rounded-2xl bg-bg-tertiary/50 border border-border-default space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-accent" /> Action Items &amp; Next Week Deliverables
                  </h4>
                  <Link href="/assignments">
                    <Button size="xs" variant="secondary" icon={<ArrowRight size={12} />}>
                      Assign Paper Task
                    </Button>
                  </Link>
                </div>

                <textarea
                  placeholder="[ ] Read & synthesize 'FlashAttention' paper by Friday&#10;[ ] Run baseline reproduction script on benchmark dataset&#10;[ ] Draft Section 2 (Related Work) literature matrix"
                  value={actionItemsText}
                  onChange={(e) => setActionItemsText(e.target.value)}
                  rows={4}
                  className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-2">
              <Calendar size={32} className="mx-auto opacity-30 text-accent" />
              <p>Select a meeting on the left to view notes and action items, or schedule a new 1-on-1.</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Calendar size={18} className="text-accent" /> Schedule 1-on-1 Research Meeting
              </h3>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              {(isSupervisor || isAdmin) && students.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Select Student Researcher *
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setIsScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Confirm Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
