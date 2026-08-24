'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  GraduationCap,
  Building,
  Mail,
  BookOpen,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  CheckSquare,
  Sparkles,
  Layers,
  TrendingUp,
  MessageSquare,
  UserCheck,
  UserPlus,
  UserX,
  Zap,
  ClipboardList,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

export interface StudentProfileData {
  id: string
  name: string
  email: string
  image: string | null
  institution: string | null
  department: string | null
  systemRole: string
  isActive: boolean
  createdAt: string
  supervisorId: string | null
  isDirectlySupervised: boolean
  pendingSupervisionRequest?: { id: string; status: string; createdAt: string } | null
  supervisor?: {
    id: string
    name: string
    email: string
    institution?: string | null
    department?: string | null
  } | null
  labMemberships: {
    role: string
    joinedAt: string
    lab: {
      id: string
      name: string
      slug: string
      leadId: string
      institution?: string
      department?: string | null
      description?: string | null
      lead?: {
        id: string
        name: string
        email: string
        department?: string | null
      } | null
    }
  }[]
  groupMemberships: {
    role: string
    group: { id: string; name: string; color: string }
  }[]
  papers: {
    id: string
    slug?: string | null
    title: string
    status: string
    priority: string
    isFavorite: boolean
    replicationStatus: string
    updatedAt: string
  }[]
  assignedPapers: {
    id: string
    status: string
    dueDate: string | null
    createdAt: string
    assignedById: string
    paper: { id: string; slug?: string | null; title: string; status: string; doi?: string | null; url?: string | null }
  }[]
  feedbackGiven?: {
    id: string
    content: string
    type: string
    createdAt: string
    paper: { id: string; slug?: string | null; title: string }
  }[]
  assignedLabTasks: {
    id: string
    title: string
    category: string
    priority: string
    status: string
    dueDate: string | null
    deliverableUrl: string | null
    createdAt: string
    labId: string
  }[]
  milestonesAsStudent: {
    id: string
    title: string
    status: string
    dueDate: string | null
  }[]
  meetingsAsStudent: {
    id: string
    title: string
    scheduledAt: string
    status: string
  }[]
  metrics: {
    totalAssignedPapers: number
    completedAssignedPapers: number
    inProgressAssignedPapers: number
    pendingAssignedPapers: number
    assignedCompletionRate: number

    totalPapers: number
    completedPapers: number
    readingPapers: number
    toReadPapers: number
    completionRate: number

    totalTasks: number
    activeTasks: number
    completedTasks: number
    totalMilestones: number
    completedMilestones: number
    totalNotes: number
    upcomingMeetingsCount?: number
    healthStatus: 'HIGH_VELOCITY' | 'ON_TRACK' | 'TASKS_DUE' | 'INACTIVE'
  }
}

interface StudentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentProfileData | null
  onLinkSuccess?: () => void
  onUnlinkSuccess?: () => void
  onOpenAssign?: (student: StudentProfileData) => void
  onOpenMeeting?: (student: StudentProfileData) => void
  onOpenAdvice?: (student: StudentProfileData) => void
}

export function StudentProfileModal({
  isOpen,
  onClose,
  student,
  onLinkSuccess,
  onUnlinkSuccess,
  onOpenAssign,
  onOpenMeeting,
  onOpenAdvice,
}: StudentProfileModalProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [claimMessage, setClaimMessage] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [cancelingRequest, setCancelingRequest] = useState(false)

  if (!student) return null

  const isDirect = student.isDirectlySupervised
  const hasOtherSupervisor = Boolean(student.supervisorId && student.supervisorId !== user?.id)
  const isPending = Boolean(student.pendingSupervisionRequest)
  const health = student.metrics.healthStatus

  // Send supervision claim request
  const handleClaimStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setClaiming(true)
    try {
      const res = await fetch('/api/students/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          message: claimMessage || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        addToast('success', `Supervision invitation sent to ${student.name}! 🎓`)
        setClaimMessage('')
        onLinkSuccess?.()
      } else {
        addToast('error', data.error || 'Failed to send invitation')
      }
    } catch {
      addToast('error', 'Network error sending invitation')
    } finally {
      setClaiming(false)
    }
  }

  // Cancel supervision request
  const handleCancelInvite = async () => {
    if (!student.pendingSupervisionRequest) return
    setCancelingRequest(true)
    try {
      const res = await fetch(`/api/students/requests/${student.pendingSupervisionRequest.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('info', `Supervision invite to ${student.name} canceled.`)
        onLinkSuccess?.()
      } else {
        addToast('error', 'Failed to cancel invitation')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setCancelingRequest(false)
    }
  }

  // Unlink student from supervision
  const handleUnlink = async () => {
    if (!confirm(`Are you sure you want to remove ${student.name} from your direct supervision roster?`)) return
    setUnlinking(true)
    try {
      const res = await fetch(`/api/students?studentId=${student.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', `${student.name} unlinked from your supervision roster`)
        onUnlinkSuccess?.()
      } else {
        addToast('error', 'Failed to unlink student')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Researcher Profile"
      description="View academic affiliations, lab enrollments, and reading velocity metrics."
      size="lg"
    >
      <div className="space-y-6 pt-2 select-text">
        {/* Top Student Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-bg-secondary via-bg-tertiary/60 to-bg-secondary border border-border-default space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-display font-bold text-xl flex items-center justify-center shrink-0">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-bg-primary ${
                    health === 'HIGH_VELOCITY'
                      ? 'bg-emerald-400'
                      : health === 'TASKS_DUE'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                  title={`Velocity Health: ${health}`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-text-primary font-display">
                    {student.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border shrink-0 ${
                      health === 'HIGH_VELOCITY'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : health === 'TASKS_DUE'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-bg-tertiary text-text-tertiary border-border-default'
                    }`}
                  >
                    {health === 'HIGH_VELOCITY'
                      ? '🟢 High Velocity'
                      : health === 'TASKS_DUE'
                      ? '🟡 Tasks Due'
                      : '⚪ Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-accent" /> {student.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} className="text-purple-400" />
                    {student.department || student.institution || 'Department of Computer Science'}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Supervised Status Tag */}
            <div>
              {isDirect ? (
                <span className="px-3 py-1 text-xs font-bold rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 font-mono">
                  <UserCheck size={13} /> On Your Supervision Roster
                </span>
              ) : hasOtherSupervisor ? (
                <span className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-mono">
                  <GraduationCap size={13} /> Supervised by Other Faculty
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-semibold rounded-xl bg-bg-tertiary text-text-secondary border border-border-default flex items-center gap-1.5 font-mono">
                  <Info size={13} /> Unaffiliated Researcher
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECTION 1: Academic Supervision & Lab Affiliation Details ─── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono flex items-center gap-2">
            <Building size={14} /> Academic Affiliation &amp; Research Lab Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Faculty Advisor Card */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                  <GraduationCap size={13} className="text-purple-400" /> Primary Faculty Advisor
                </span>
                {isDirect ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-400">You (Direct)</span>
                ) : hasOtherSupervisor ? (
                  <span className="text-[10px] font-mono text-blue-300">Other Faculty</span>
                ) : (
                  <span className="text-[10px] font-mono text-text-tertiary">None</span>
                )}
              </div>

              {isDirect ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-primary">
                    {user?.name} (You)
                  </p>
                  <p className="text-xs text-text-secondary">{user?.email}</p>
                  <p className="text-[11px] text-emerald-400 font-medium pt-1">
                    ✓ You have full direct supervision and assignment access for this student.
                  </p>
                </div>
              ) : student.supervisor ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-primary">
                    {student.supervisor.name}
                  </p>
                  <p className="text-xs text-text-secondary">{student.supervisor.email}</p>
                  {student.supervisor.department && (
                    <p className="text-[11px] text-text-tertiary">{student.supervisor.department}</p>
                  )}
                  <p className="text-[11px] text-blue-300 pt-1">
                    Student is supervised by {student.supervisor.name}. You can co-supervise or send a roster invitation below.
                  </p>
                </div>
              ) : (
                <div className="py-2 text-xs text-text-tertiary">
                  <p className="font-medium text-text-secondary">No primary faculty advisor assigned.</p>
                  <p className="text-[11px]">This student is open to be claimed directly to your supervision roster.</p>
                </div>
              )}
            </div>

            {/* Enrolled Research Labs Card */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                  <Building size={13} className="text-accent" /> Enrolled Research Labs ({student.labMemberships.length})
                </span>
              </div>

              {student.labMemberships.length > 0 ? (
                <div className="space-y-2">
                  {student.labMemberships.map((m) => {
                    const isMyLab = user && m.lab.leadId === user.id
                    return (
                      <div
                        key={m.lab.id}
                        className="p-2.5 rounded-lg bg-bg-tertiary border border-border-default/60 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <Link
                            href={`/labs/${m.lab.slug}`}
                            className="font-bold text-text-primary hover:text-accent transition-colors flex items-center gap-1 truncate"
                          >
                            <Building size={12} className="text-accent shrink-0" />
                            <span className="truncate">{m.lab.name}</span>
                            <ExternalLink size={10} className="text-text-tertiary" />
                          </Link>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-accent/15 text-accent shrink-0">
                            {m.role}
                          </span>
                        </div>

                        {/* Principal Investigator / Lab Lead Details */}
                        <div className="text-[11px] text-text-secondary flex items-center justify-between pt-0.5">
                          <span>
                            PI / Lab Lead:{' '}
                            <strong className="text-text-primary">
                              {isMyLab ? 'You (Lead)' : m.lab.lead?.name || 'Faculty Lead'}
                            </strong>
                          </span>
                          {m.lab.lead?.email && !isMyLab && (
                            <span className="text-[10px] text-text-tertiary">{m.lab.lead.email}</span>
                          )}
                        </div>

                        {m.lab.department && (
                          <p className="text-[10px] text-text-tertiary truncate">
                            {m.lab.department} {m.lab.institution ? `· ${m.lab.institution}` : ''}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-3 text-xs text-text-tertiary">
                  <p>Not currently enrolled in any academic laboratory.</p>
                  <p className="text-[11px] pt-1">You can assign this student directly into your research groups.</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Research Sub-Groups / Project Clusters */}
          {student.groupMemberships.length > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default text-xs space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                <Layers size={13} className="text-purple-400" /> Active Research Sub-Groups &amp; Clusters
              </span>
              <div className="flex flex-wrap gap-1.5">
                {student.groupMemberships.map((g) => (
                  <span
                    key={g.group.id}
                    className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-text-primary border border-border-default text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    {g.group.name}
                    <span className="text-[10px] text-text-tertiary font-mono">({g.role})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 2: Reading Velocity & Literature Activity ─── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono flex items-center gap-2">
            <BookOpen size={14} /> Literature Reading Velocity &amp; Deliverables
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
              <span className="text-[10px] uppercase font-mono text-text-tertiary block">Assigned Read</span>
              <span className="text-lg font-bold text-purple-400 font-display block">
                {student.metrics.completedAssignedPapers} / {student.metrics.totalAssignedPapers}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">{student.metrics.assignedCompletionRate}% completed</span>
            </div>

            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
              <span className="text-[10px] uppercase font-mono text-text-tertiary block">Library Papers</span>
              <span className="text-lg font-bold text-emerald-400 font-display block">
                {student.metrics.completedPapers} / {student.metrics.totalPapers}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">{student.metrics.completionRate}% read</span>
            </div>

            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
              <span className="text-[10px] uppercase font-mono text-text-tertiary block">Synthesized Notes</span>
              <span className="text-lg font-bold text-accent font-display block">
                {student.metrics.totalNotes}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">Literature reviews</span>
            </div>

            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
              <span className="text-[10px] uppercase font-mono text-text-tertiary block">Lab Deliverables</span>
              <span className="text-lg font-bold text-amber-400 font-display block">
                {student.metrics.completedTasks} / {student.metrics.totalTasks}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">{student.metrics.activeTasks} in progress</span>
            </div>
          </div>

          {/* Recent Reading Highlights */}
          {student.papers.length > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                  Recent Cataloged Papers in Library
                </span>
                <span className="text-[10px] text-text-tertiary">{student.papers.length} total papers</span>
              </div>
              <div className="space-y-1">
                {student.papers.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-1 text-xs border-t border-border-default/40 first:border-0 first:pt-0"
                  >
                    <span className="text-text-primary font-medium truncate flex-1">{p.title}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded font-mono shrink-0 ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.status === 'READING'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-bg-tertiary text-text-tertiary'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 3: Supervision Action & Claim Form ─── */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-text-primary flex items-center gap-1.5">
              <GraduationCap size={14} className="text-purple-400" /> Supervision Management Actions
            </h4>

            {isDirect && (
              <Button
                size="xs"
                variant="ghost"
                onClick={handleUnlink}
                loading={unlinking}
                className="text-rose-400 hover:text-rose-300 text-xs"
                icon={<UserX size={12} />}
              >
                Unlink from Roster
              </Button>
            )}
          </div>

          {isDirect ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose()
                  onOpenAssign?.(student)
                }}
                icon={<BookOpen size={14} />}
              >
                Assign Research Paper
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onClose()
                  onOpenMeeting?.(student)
                }}
                icon={<Calendar size={14} />}
              >
                Schedule 1-on-1 Sync
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onClose()
                  onOpenAdvice?.(student)
                }}
                icon={<Zap size={14} />}
              >
                Send Guidance Advice
              </Button>
            </div>
          ) : isPending ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Clock size={15} />
                <span>Supervision claim invitation is pending response from {student.name}.</span>
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={handleCancelInvite}
                loading={cancelingRequest}
                className="text-text-tertiary hover:text-danger underline"
              >
                Cancel Invitation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleClaimStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Optional Welcome Note / Research Focus
                </label>
                <input
                  type="text"
                  value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  placeholder="e.g. Welcome to our research cluster! Let's collaborate on literature reviews."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-text-tertiary">
                  {hasOtherSupervisor
                    ? `Sending an invitation will invite ${student.name} to join your supervision orbit.`
                    : `Sending an invitation allows ${student.name} to accept direct supervision.`}
                </p>

                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  loading={claiming}
                  icon={<UserPlus size={14} />}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  🎓 Send Supervision Invitation
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}
