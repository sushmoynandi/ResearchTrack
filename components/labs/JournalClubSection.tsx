'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface JournalClubSessionItem {
  id: string
  paperId: string
  presenterId: string
  scheduledAt: string
  status: string
  notes: string | null
  paper: { id: string; title: string; authors: string; journal: string | null; publicationYear: number | null }
  presenter: { id: string; name: string; email: string; department?: string }
}

interface JournalClubSectionProps {
  labId: string
  groupId: string
  groupName: string
  groupMembers: { id: string; user: { id: string; name: string; email: string } }[]
  isLeadOrSupervisor: boolean
}

export function JournalClubSection({
  labId,
  groupId,
  groupName,
  groupMembers,
  isLeadOrSupervisor,
}: JournalClubSectionProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [sessions, setSessions] = useState<JournalClubSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [availablePapers, setAvailablePapers] = useState<{ id: string; title: string }[]>([])
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [selectedPresenterId, setSelectedPresenterId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) fetchSessions()
  }, [groupId])

  const handleOpenModal = async () => {
    setIsModalOpen(true)
    try {
      const res = await fetch('/api/papers?scope=own')
      if (res.ok) {
        const data = await res.json()
        setAvailablePapers(data.map((p: any) => ({ id: p.id, title: p.title })))
        if (data.length > 0) setSelectedPaperId(data[0].id)
      }
      if (groupMembers.length > 0) {
        setSelectedPresenterId(groupMembers[0].user.id)
      }
    } catch {
      // silent
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaperId || !selectedPresenterId || !scheduledAt) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: selectedPaperId,
          presenterId: selectedPresenterId,
          scheduledAt,
          notes: sessionNotes,
        }),
      })

      if (res.ok) {
        addToast('success', 'Scheduled Journal Club seminar!')
        setIsModalOpen(false)
        setSessionNotes('')
        fetchSessions()
      } else {
        addToast('error', 'Failed to schedule seminar')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (sessionId: string, status: string) => {
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status }),
      })
      if (res.ok) {
        addToast('success', `Session marked as ${status.toLowerCase()}`)
        fetchSessions()
      }
    } catch {
      addToast('error', 'Failed to update status')
    }
  }

  return (
    <div className="glass-card p-6 space-y-5 border-border-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
            <Calendar size={18} className="text-accent" /> {groupName} Journal Club &amp; Seminars
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Weekly rotational student presentations and group literature discussions.
          </p>
        </div>

        {isLeadOrSupervisor && (
          <Button size="xs" variant="primary" onClick={handleOpenModal} icon={<Plus size={13} />}>
            Schedule Seminar
          </Button>
        )}
      </div>

      {/* Sessions Schedule */}
      {loading ? (
        <div className="p-6 text-center text-xs text-text-tertiary">Loading journal club schedule...</div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isCompleted = s.status === 'COMPLETED'
            const sessionDate = new Date(s.scheduledAt)

            return (
              <div
                key={s.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCompleted
                    ? 'bg-bg-tertiary/40 border-border-default opacity-75'
                    : 'bg-bg-secondary border-accent/30 hover:border-accent/60'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-bg-tertiary text-accent border border-border-default">
                      {sessionDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <Link
                    href={`/papers/${s.paper.id}`}
                    className="text-sm font-bold text-text-primary hover:text-accent transition-colors block truncate"
                  >
                    {s.paper.title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <User size={12} className="text-accent" /> Presenter: <strong className="text-text-secondary">{s.presenter.name}</strong>
                    </span>
                    {s.notes && <span className="italic">• {s.notes}</span>}
                  </div>
                </div>

                {/* Launch Presentation & Status Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-default">
                  <Link href={`/papers/${s.paper.id}/present`}>
                    <Button size="xs" variant="primary" icon={<Play size={12} fill="currentColor" />}>
                      Launch Journal Club
                    </Button>
                  </Link>

                  {isLeadOrSupervisor && !isCompleted && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleStatusChange(s.id, 'COMPLETED')}
                      icon={<CheckCircle2 size={12} className="text-success" />}
                    >
                      Mark Done
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-text-tertiary space-y-2">
          <Calendar size={24} className="mx-auto opacity-30 text-accent" />
          <p>No journal club seminar sessions scheduled yet for this cluster.</p>
        </div>
      )}

      {/* Schedule Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Schedule Journal Club Seminar: ${groupName}`}
          description="Assign a student presenter, selected literature paper, and presentation date."
          size="md"
        >
          <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Paper to Present *
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                required
              >
                {availablePapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Assigned Presenter *
                </label>
                <select
                  value={selectedPresenterId}
                  onChange={(e) => setSelectedPresenterId(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  required
                >
                  {groupMembers.map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Seminar Date *
                </label>
                <input
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Discussion Focus &amp; Pre-Reading Guidance
              </label>
              <input
                type="text"
                placeholder="e.g. Lead discussion on Section 5 comparative benchmarks."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Sparkles size={13} />}>
                Confirm Seminar Schedule
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
