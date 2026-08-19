'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Send,
  ExternalLink,
  Sparkles,
  FileText,
  User,
  GraduationCap,
  MessageSquare,
  Award,
  Building,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface MilestoneItem {
  id: string
  title: string
  description: string
  dueDate: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED'
  deliverableUrl: string | null
  deliverableNotes: string | null
  feedback: string | null
  createdAt: string
  student: { id: string; name: string; email: string; department?: string }
  supervisor: { id: string; name: string; email: string }
}

export default function MilestonesPage() {
  const { user, isSupervisor, isAdmin, isStudent } = useAuth()
  const { addToast } = useToast()

  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'LAB' | 'GROUP'>('INDIVIDUAL')
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([])
  const [labs, setLabs] = useState<
    Array<{
      id: string
      name: string
      institution: string
      groups: Array<{ id: string; name: string; members?: any[] }>
      members: Array<{ userId: string; user: { id: string; name: string; email: string } }>
      _count?: { members: number; groups: number }
    }>
  >([])
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedLabId, setSelectedLabId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [creating, setCreating] = useState(false)

  // Submit deliverable modal
  const [submitMilestone, setSubmitMilestone] = useState<MilestoneItem | null>(null)
  const [deliverableUrl, setDeliverableUrl] = useState('')
  const [deliverableNotes, setDeliverableNotes] = useState('')
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false)

  // Evaluate deliverable modal
  const [evalMilestone, setEvalMilestone] = useState<MilestoneItem | null>(null)
  const [evalFeedback, setEvalFeedback] = useState('')
  const [evaluating, setEvaluating] = useState(false)

  const fetchMilestones = async () => {
    try {
      const res = await fetch('/api/milestones')
      if (res.ok) {
        const data = await res.json()
        setMilestones(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMilestones()
  }, [])

  const handleOpenCreate = async () => {
    setIsCreateOpen(true)
    if (isSupervisor || isAdmin) {
      try {
        const [studentsRes, labsRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/labs'),
        ])
        if (studentsRes.ok) {
          const data = await studentsRes.json()
          setStudents(data)
          if (data.length > 0) setSelectedStudentId(data[0].id)
        }
        if (labsRes.ok) {
          const labsData = await labsRes.json()
          setLabs(labsData)
          if (labsData.length > 0) {
            setSelectedLabId(labsData[0].id)
            if (labsData[0].groups?.length > 0) {
              setSelectedGroupId(labsData[0].groups[0].id)
            }
          }
        }
      } catch {
        // silent
      }
    }
  }

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload: Record<string, unknown> = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        dueDate: newDueDate || undefined,
        targetType,
        supervisorId: isSupervisor || isAdmin ? user?.id : (user?.supervisorId || undefined),
      }

      if (targetType === 'LAB') {
        payload.labId = selectedLabId || (labs[0]?.id)
      } else if (targetType === 'GROUP') {
        payload.groupId = selectedGroupId || (labs.flatMap((l) => l.groups)[0]?.id)
      } else {
        payload.studentId = isSupervisor || isAdmin ? (selectedStudentId || students[0]?.id || user?.id) : user?.id
      }

      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        const count = data.count || 1
        addToast(
          'success',
          targetType === 'LAB'
            ? `Lab-wide milestone established for ${count} researcher(s)!`
            : targetType === 'GROUP'
            ? `Sub-group milestone established for ${count} researcher(s)!`
            : 'Thesis milestone established!'
        )
        setIsCreateOpen(false)
        setNewTitle('')
        setNewDesc('')
        fetchMilestones()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create milestone')
      }
    } catch {
      addToast('error', 'Network error creating milestone')
    } finally {
      setCreating(false)
    }
  }

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submitMilestone) return
    setSubmittingDeliverable(true)
    try {
      const res = await fetch('/api/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submitMilestone.id,
          status: 'SUBMITTED',
          deliverableUrl,
          deliverableNotes,
        }),
      })

      if (res.ok) {
        addToast('success', 'Deliverable submitted for supervisor review!')
        setSubmitMilestone(null)
        fetchMilestones()
      } else {
        addToast('error', 'Failed to submit deliverable')
      }
    } catch {
      addToast('error', 'Network error submitting deliverable')
    } finally {
      setSubmittingDeliverable(false)
    }
  }

  const handleEvaluate = async (status: 'APPROVED' | 'REVISION_REQUESTED') => {
    if (!evalMilestone) return
    setEvaluating(true)
    try {
      const res = await fetch('/api/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: evalMilestone.id,
          status,
          feedback: evalFeedback,
        }),
      })

      if (res.ok) {
        addToast('success', `Milestone marked as ${status.replace('_', ' ')}!`)
        setEvalMilestone(null)
        fetchMilestones()
      } else {
        addToast('error', 'Failed to update milestone evaluation')
      }
    } catch {
      addToast('error', 'Network error evaluating milestone')
    } finally {
      setEvaluating(false)
    }
  }

  const completedCount = milestones.filter((m) => m.status === 'APPROVED').length

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <Trophy size={22} className="text-amber-400" /> Thesis Milestones &amp; Research Deliverables Tracker
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Formal graduate milestones: Related Work chapters, manuscript drafts, conference submissions, and defense certifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>
            New Milestone
          </Button>
        </div>
      </div>

      {/* Progress Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Total Milestones</span>
          <p className="text-2xl font-bold text-text-primary font-display">{milestones.length}</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Certified &amp; Approved</span>
          <p className="text-2xl font-bold text-emerald-400 font-display">{completedCount}</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Under Evaluation</span>
          <p className="text-2xl font-bold text-amber-400 font-display">
            {milestones.filter((m) => m.status === 'SUBMITTED').length}
          </p>
        </div>
      </div>

      {/* Milestones Cards Grid */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="120px" />
          ))}
        </div>
      ) : milestones.length > 0 ? (
        <div className="space-y-4">
          {milestones.map((m) => {
            const isApproved = m.status === 'APPROVED'
            const isSubmitted = m.status === 'SUBMITTED'
            const isRevision = m.status === 'REVISION_REQUESTED'

            return (
              <div
                key={m.id}
                className={`glass-card p-6 border transition-all space-y-4 ${
                  isApproved
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : isSubmitted
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border-default'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : isSubmitted
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-bg-tertiary text-text-tertiary'
                      }`}
                    >
                      {isApproved ? <CheckCircle2 size={20} /> : <Trophy size={18} />}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-text-primary font-display">{m.title}</h3>
                      <p className="text-xs text-text-secondary">
                        Student: <strong className="text-text-primary">{m.student.name}</strong> • Supervisor:{' '}
                        <strong className="text-text-primary">{m.supervisor.name}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isSubmitted
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : isRevision
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-bg-tertiary text-text-tertiary border-border-default'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>

                    {m.dueDate && (
                      <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                        <Clock size={12} /> Due: {new Date(m.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{m.description}</p>

                {/* Deliverable Section (if submitted) */}
                {(m.deliverableUrl || m.deliverableNotes) && (
                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default text-xs space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-accent block">Submitted Deliverable</span>
                    {m.deliverableUrl && (
                      <a
                        href={m.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-xs font-medium"
                      >
                        <ExternalLink size={12} /> {m.deliverableUrl}
                      </a>
                    )}
                    {m.deliverableNotes && <p className="text-text-secondary italic">&ldquo;{m.deliverableNotes}&rdquo;</p>}
                  </div>
                )}

                {/* Supervisor Feedback (if given) */}
                {m.feedback && (
                  <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400 block">Supervisor Review Feedback</span>
                    <p className="text-text-primary italic">&ldquo;{m.feedback}&rdquo;</p>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {/* Student Submit Button */}
                  {(isStudent || user?.id === m.student.id) && m.status !== 'APPROVED' && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        setSubmitMilestone(m)
                        setDeliverableUrl(m.deliverableUrl || '')
                        setDeliverableNotes(m.deliverableNotes || '')
                      }}
                      icon={<Send size={12} />}
                    >
                      {m.status === 'SUBMITTED' ? 'Update Submission' : 'Submit Deliverable'}
                    </Button>
                  )}

                  {/* Supervisor Evaluate Button */}
                  {(isSupervisor || isAdmin) && m.status === 'SUBMITTED' && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        setEvalMilestone(m)
                        setEvalFeedback(m.feedback || '')
                      }}
                      icon={<Award size={13} />}
                    >
                      Evaluate &amp; Certify
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-2">
          <Trophy size={32} className="mx-auto opacity-30 text-amber-400" />
          <p>No thesis milestones defined yet.</p>
        </div>
      )}

      {/* Create Milestone Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-md p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" /> Create Research Milestone
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Related Work Synthesis (20 Papers)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              {(isSupervisor || isAdmin) && (
                <div className="space-y-3 p-3 rounded-xl bg-bg-primary border border-border-default">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Assign Milestone To
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-bg-tertiary rounded-lg border border-border-default text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setTargetType('INDIVIDUAL')}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          targetType === 'INDIVIDUAL'
                            ? 'bg-accent text-white font-bold shadow-sm'
                            : 'text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        <User size={13} /> Student
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetType('LAB')
                          if (labs.length > 0 && !selectedLabId) setSelectedLabId(labs[0].id)
                        }}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          targetType === 'LAB'
                            ? 'bg-accent text-white font-bold shadow-sm'
                            : 'text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        <Building size={13} /> Entire Lab
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetType('GROUP')
                          if (labs.length > 0) {
                            const allGroups = labs.flatMap((l) => l.groups || [])
                            if (allGroups.length > 0 && !selectedGroupId) setSelectedGroupId(allGroups[0].id)
                          }
                        }}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          targetType === 'GROUP'
                            ? 'bg-accent text-white font-bold shadow-sm'
                            : 'text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        <Users size={13} /> Sub-Group
                      </button>
                    </div>
                  </div>

                  {/* 1. Individual Student Selector */}
                  {targetType === 'INDIVIDUAL' && (
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Select Student Researcher *
                      </label>
                      {students.length > 0 ? (
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
                      ) : (
                        <p className="text-[11px] text-text-tertiary italic">
                          No students in roster. Will assign to your personal workspace.
                        </p>
                      )}
                    </div>
                  )}

                  {/* 2. Research Lab Selector */}
                  {targetType === 'LAB' && (
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Select Research Lab *
                      </label>
                      {labs.length > 0 ? (
                        <select
                          value={selectedLabId}
                          onChange={(e) => setSelectedLabId(e.target.value)}
                          className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                          required
                        >
                          {labs.map((l) => (
                            <option key={l.id} value={l.id}>
                              🏛️ {l.name} ({l.members?.length || l._count?.members || 1} Researchers)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-text-tertiary italic">
                          No labs found. Create a Research Lab first in the Labs portal.
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Research Sub-Group Selector */}
                  {targetType === 'GROUP' && (
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Select Research Sub-Group *
                      </label>
                      {labs.flatMap((l) => l.groups || []).length > 0 ? (
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                          required
                        >
                          {labs.map((l) =>
                            (l.groups || []).map((g) => (
                              <option key={g.id} value={g.id}>
                                🔬 {l.name} ➔ {g.name} ({g.members?.length || 0} Members)
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <p className="text-[11px] text-text-tertiary italic">
                          No sub-groups found in your research labs.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Description &amp; Acceptance Criteria *
                </label>
                <textarea
                  placeholder="e.g. Complete 20-column survey matrix for 15 papers, synthesize core architectural trade-offs in Section 2 draft."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creating}>
                  Create Milestone
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Deliverable Modal */}
      {submitMilestone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-md p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Send size={18} className="text-accent" /> Submit Research Deliverable
              </h3>
              <button
                onClick={() => setSubmitMilestone(null)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Deliverable Link / Manuscript URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://overleaf.com/read/... or GitHub / Google Drive link"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Submission Summary &amp; Notes *
                </label>
                <textarea
                  placeholder="e.g. Completed synthesis of all 15 Transformer papers; literature matrix attached in Collection 'LLM Foundations'."
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  rows={4}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setSubmitMilestone(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submittingDeliverable}>
                  Submit to Advisor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluate Deliverable Modal */}
      {evalMilestone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-md p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Award size={18} className="text-purple-400" /> Evaluate Milestone Deliverable
              </h3>
              <button
                onClick={() => setEvalMilestone(null)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Faculty Review Remarks
                </label>
                <textarea
                  placeholder="e.g. Thorough survey and rigorous analysis. Ready for inclusion in thesis draft."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  rows={4}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleEvaluate('REVISION_REQUESTED')}
                  loading={evaluating}
                >
                  Request Revision
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleEvaluate('APPROVED')}
                  loading={evaluating}
                >
                  Approve &amp; Certify 🎓
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
