'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Share2,
  FileText,
  MessageSquare,
  GraduationCap,
  Building,
  Users,
  Calendar,
  Save,
  Send,
  Sparkles,
  Link as LinkIcon,
  Check,
  Trophy,
  Award,
  Layers,
  Edit,
  Plus,
  Trash2,
  Globe,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  FastForward,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_METADATA, PAPER_TRACKER_STAGES, StageDefinition } from '@/lib/paperTrackerStages'

interface StepItem {
  id: string
  stepIndex: number
  stepKey: string
  title: string
  category: 'PLANNING' | 'DATA' | 'MODELING' | 'ANALYSIS' | 'WRITING' | 'PUBLICATION'
  description?: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'BLOCKED' | 'SKIPPED'
  dueDate?: string | null
  completedAt?: string | null
  deliverableUrl?: string | null
  deliverableNotes?: string | null
  studentNotes?: string | null
  supervisorFeedback?: string | null
}

interface PaperTrackerDetail {
  id: string
  title: string
  description?: string | null
  targetVenue?: string | null
  targetDate?: string | null
  status: 'ACTIVE' | 'SUBMITTED' | 'ACCEPTED' | 'PUBLISHED' | 'ON_HOLD' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  ownerId: string
  owner: {
    id: string
    name: string
    email: string
    systemRole: string
    institution?: string | null
    department?: string | null
  }
  papers: Array<{
    id: string
    title: string
    authors: string
    slug?: string | null
    status: string
  }>
  steps: StepItem[]
  shares: Array<{
    id: string
    targetType: 'STUDENT' | 'LAB' | 'GROUP'
    user?: { id: string; name: string; email: string } | null
    lab?: { id: string; name: string; slug: string } | null
    group?: { id: string; name: string; color: string } | null
    permission: string
  }>
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PaperTrackerWorkspacePage({ params }: PageProps) {
  const resolvedParams = use(params)
  const trackerId = resolvedParams.id

  const { user, isSupervisor, isAdmin, isStudent } = useAuth()
  const { addToast } = useToast()

  const [tracker, setTracker] = useState<PaperTrackerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(1)

  // Step Editing State
  const [savingStepId, setSavingStepId] = useState<string | null>(null)
  const [reorderingStepId, setReorderingStepId] = useState<string | null>(null)
  const [stepDrafts, setStepDrafts] = useState<
    Record<
      string,
      {
        deliverableUrls: string[]
        deliverableNotes: string
        studentNotes: string
        supervisorFeedback: string
        dueDate: string
      }
    >
  >({})

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'LAB' | 'GROUP'>('INDIVIDUAL')
  const [sharePermission, setSharePermission] = useState<'COLLABORATE' | 'VIEW'>('COLLABORATE')
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [availableLabs, setAvailableLabs] = useState<
    Array<{
      id: string
      name: string
      institution: string
      groups: Array<{ id: string; name: string }>
      members: Array<{ userId: string; user: { id: string; name: string; email: string } }>
    }>
  >([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedLabIds, setSelectedLabIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [savingShare, setSavingShare] = useState(false)

  const parseDeliverableUrls = (raw: string | null | undefined): string[] => {
    if (!raw) return ['']
    try {
      if (raw.startsWith('[') && raw.endsWith(']')) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {}
    return [raw]
  }

  const fetchTracker = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/paper-trackers/${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setTracker(data)

        // Initialize drafts
        const drafts: Record<string, any> = {}
        if (data.steps) {
          for (const s of data.steps) {
            drafts[s.id] = {
              deliverableUrls: parseDeliverableUrls(s.deliverableUrl),
              deliverableNotes: s.deliverableNotes || '',
              studentNotes: s.studentNotes || '',
              supervisorFeedback: s.supervisorFeedback || '',
              dueDate: s.dueDate ? s.dueDate.slice(0, 10) : '',
            }
          }
          setStepDrafts(drafts)
        }
      } else {
        addToast('error', 'Failed to load paper tracker')
      }
    } catch {
      addToast('error', 'Network error fetching paper tracker')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracker()
  }, [trackerId])

  const handleUpdateStepStatus = async (stepId: string, newStatus: StepItem['status']) => {
    try {
      const res = await fetch(`/api/paper-trackers/${trackerId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const updatedStep = await res.json()
        setTracker((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.id === stepId ? updatedStep : s)),
          }
        })
        addToast('success', `Stage status updated to ${newStatus}`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update stage status')
      }
    } catch {
      addToast('error', 'Network error updating stage status')
    }
  }

  const handleReviewStep = async (stepId: string, action: 'ACCEPT' | 'REJECT' | 'SKIP' | 'UNSKIP', stepIndex: number) => {
    const draft = stepDrafts[stepId]
    try {
      setSavingStepId(stepId)
      const res = await fetch(`/api/paper-trackers/${trackerId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewAction: action,
          supervisorFeedback: draft?.supervisorFeedback || null,
        }),
      })

      if (res.ok) {
        if (action === 'ACCEPT') {
          addToast('success', `✓ Stage ${stepIndex} Approved! Automatically unlocked next stage.`)
          setExpandedStepIndex(stepIndex + 1)
        } else if (action === 'REJECT') {
          addToast('warning', `⚠️ Revision Requested on Stage ${stepIndex}. The stage remains pending revision.`)
        } else if (action === 'SKIP') {
          addToast('success', `⏭️ Stage ${stepIndex} marked as Skipped!`)
        } else if (action === 'UNSKIP') {
          addToast('info', `↩️ Stage ${stepIndex} restored to pending queue.`)
        }
        fetchTracker()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to submit review decision')
      }
    } catch {
      addToast('error', 'Network error submitting review decision')
    } finally {
      setSavingStepId(null)
    }
  }

  const handleReorderStep = async (stepId: string, direction: 'UP' | 'DOWN') => {
    try {
      setReorderingStepId(stepId)
      const res = await fetch(`/api/paper-trackers/${trackerId}/steps/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, direction }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.steps) {
          setTracker((prev) => (prev ? { ...prev, steps: data.steps } : prev))
        }
        addToast('success', `Milestone moved ${direction === 'UP' ? 'up 🔼' : 'down 🔽'}`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to reorder milestone')
      }
    } catch {
      addToast('error', 'Network error reordering milestone')
    } finally {
      setReorderingStepId(null)
    }
  }

  const handleSaveStepDraft = async (stepId: string, notifySupervisor = false) => {
    const draft = stepDrafts[stepId]
    if (!draft) return

    try {
      setSavingStepId(stepId)
      // Filter out empty URLs and serialize
      const cleanedUrls = (draft.deliverableUrls || []).map((u) => u.trim()).filter(Boolean)
      const deliverableUrlPayload =
        cleanedUrls.length > 1
          ? JSON.stringify(cleanedUrls)
          : cleanedUrls.length === 1
          ? cleanedUrls[0]
          : null

      const res = await fetch(`/api/paper-trackers/${trackerId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableUrl: deliverableUrlPayload,
          deliverableNotes: draft.deliverableNotes || null,
          studentNotes: draft.studentNotes || null,
          supervisorFeedback: draft.supervisorFeedback || null,
          dueDate: draft.dueDate || null,
          status: notifySupervisor ? 'SUBMITTED' : undefined,
          notifySupervisor,
        }),
      })

      if (res.ok) {
        const updatedStep = await res.json()
        setTracker((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.id === stepId ? updatedStep : s)),
          }
        })
        if (notifySupervisor) {
          addToast('success', '🔔 Supervisor notified of stage update! Review is now in progress.')
        } else {
          addToast('success', 'Stage update saved internally!')
        }
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to save stage information')
      }
    } catch {
      addToast('error', 'Network error saving stage information')
    } finally {
      setSavingStepId(null)
    }
  }

  const handleDeliverableUrlChange = (stepId: string, index: number, value: string) => {
    setStepDrafts((prev) => {
      const current = prev[stepId] || {
        deliverableUrls: [''],
        deliverableNotes: '',
        studentNotes: '',
        supervisorFeedback: '',
        dueDate: '',
      }
      const newUrls = [...current.deliverableUrls]
      newUrls[index] = value
      return {
        ...prev,
        [stepId]: {
          ...current,
          deliverableUrls: newUrls,
        },
      }
    })
  }

  const handleAddDeliverableUrl = (stepId: string) => {
    setStepDrafts((prev) => {
      const current = prev[stepId] || {
        deliverableUrls: [''],
        deliverableNotes: '',
        studentNotes: '',
        supervisorFeedback: '',
        dueDate: '',
      }
      return {
        ...prev,
        [stepId]: {
          ...current,
          deliverableUrls: [...current.deliverableUrls, ''],
        },
      }
    })
  }

  const handleRemoveDeliverableUrl = (stepId: string, index: number) => {
    setStepDrafts((prev) => {
      const current = prev[stepId]
      if (!current) return prev
      const newUrls = current.deliverableUrls.filter((_, i) => i !== index)
      return {
        ...prev,
        [stepId]: {
          ...current,
          deliverableUrls: newUrls.length > 0 ? newUrls : [''],
        },
      }
    })
  }

  const handleOpenShareModal = async () => {
    setIsShareModalOpen(true)
    try {
      const [studentsRes, labsRes] = await Promise.all([
        fetch('/api/students?mode=discover'),
        fetch('/api/labs'),
      ])
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setAvailableStudents(data.students || [])
      }
      if (labsRes.ok) {
        const data = await labsRes.json()
        setAvailableLabs(data.labs || [])
      }
    } catch {}
  }

  const handleSaveShare = async () => {
    try {
      setSavingShare(true)
      const res = await fetch(`/api/paper-trackers/${trackerId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          studentIds: targetType === 'INDIVIDUAL' ? selectedStudentIds : [],
          labIds: targetType === 'LAB' ? selectedLabIds : [],
          groupIds: targetType === 'GROUP' ? selectedGroupIds : [],
          permission: sharePermission,
        }),
      })

      if (res.ok) {
        addToast('success', 'Tracker shared successfully!')
        setIsShareModalOpen(false)
        fetchTracker()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to share tracker')
      }
    } catch {
      addToast('error', 'Network error sharing tracker')
    } finally {
      setSavingShare(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
        <Skeleton variant="card" height="180px" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton variant="card" height="120px" />
          <Skeleton variant="card" height="120px" />
        </div>
        <Skeleton variant="card" height="400px" />
      </div>
    )
  }

  if (!tracker) {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 space-y-4">
        <AlertTriangle size={48} className="mx-auto text-warning" />
        <h2 className="text-lg font-bold text-text-primary">Tracker Not Found</h2>
        <p className="text-xs text-text-secondary">
          You may not have permission to view this project tracker or it has been deleted.
        </p>
        <Link href="/paper-tracker">
          <Button size="sm" variant="primary">
            Return to Paper Trackers
          </Button>
        </Link>
      </div>
    )
  }

  const completedCount = tracker.steps.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED').length
  const inProgressCount = tracker.steps.filter((s) => s.status === 'IN_PROGRESS').length
  const progressPercent = Math.round((completedCount / (tracker.steps.length || 25)) * 100)

  // Group steps by Phase/Category
  const categories: Array<StageDefinition['category']> = [
    'PLANNING',
    'DATA',
    'MODELING',
    'ANALYSIS',
    'WRITING',
    'PUBLICATION',
  ]

  const isOwner = tracker.ownerId === user?.id
  const isAdminUser = isAdmin
  const isSupervisorUser = isSupervisor || isAdminUser
  const userShare = tracker.shares.find((s) => s.user?.id === user?.id)
  const isViewOnlyShare = userShare && userShare.permission === 'VIEW'
  const canEditAndComment = isOwner || isAdminUser || (!isViewOnlyShare && userShare?.permission === 'COLLABORATE')

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 animate-fade-in pb-16">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/paper-tracker"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Back to Paper Trackers
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {!canEditAndComment && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              👁️ View Only Mode
            </span>
          )}

          {tracker.papers && tracker.papers.map((p) => (
            <Link
              key={p.id}
              href={`/papers/${p.slug || p.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-tertiary border border-border-default text-xs font-medium text-text-secondary hover:text-accent transition-colors max-w-xs truncate"
              title={p.title}
            >
              <FileText size={13} className="text-accent shrink-0" />
              <span className="truncate">{p.title}</span>
              <ExternalLink size={11} className="opacity-70 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Main Project Overview Card */}
      <div className="glass-card p-6 md:p-8 space-y-6 border-accent/20 bg-gradient-to-br from-bg-secondary via-bg-tertiary/60 to-accent/5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant={
                  tracker.status === 'PUBLISHED' || tracker.status === 'ACCEPTED'
                    ? 'success'
                    : tracker.status === 'SUBMITTED'
                    ? 'info'
                    : tracker.status === 'ON_HOLD'
                    ? 'warning'
                    : 'default'
                }
                size="md"
              >
                {tracker.status}
              </Badge>

              {tracker.targetVenue && (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  🎯 Target: {tracker.targetVenue}
                </span>
              )}

              {tracker.targetDate && (
                <span className="text-xs font-mono text-text-tertiary flex items-center gap-1">
                  <Calendar size={12} className="text-accent" />
                  Due: {new Date(tracker.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-text-primary font-display">
              {tracker.title}
            </h1>

            {tracker.description && (
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                {tracker.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
              {(isOwner || isAdmin) && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Share2 size={13} className="text-purple-400" />}
                  onClick={handleOpenShareModal}
                  className="shadow-xs"
                >
                  Share Tracker
                </Button>
              )}

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-text-tertiary block">
                    Lead Researcher
                  </span>
                  <span className="text-xs font-bold text-text-primary">{tracker.owner.name}</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                  {(tracker.owner.name || 'R')[0].toUpperCase()}
                </div>
              </div>
            </div>

            {tracker.shares.length > 0 && (
              isOwner || isAdmin ? (
                <button
                  type="button"
                  onClick={handleOpenShareModal}
                  className="flex items-center gap-1.5 text-[11px] text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 font-mono hover:bg-purple-500/20 transition-all cursor-pointer"
                  title="Manage Shares"
                >
                  <Share2 size={12} />
                  <span>Shared with {tracker.shares.length} target(s)</span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 text-[11px] text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 font-mono select-none"
                >
                  <Share2 size={12} />
                  <span>Shared with {tracker.shares.length} target(s)</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Global Progress Bar (25 Stages) */}
        <div className="p-4 rounded-2xl bg-bg-primary/90 border border-border-default space-y-3 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <span className="text-text-primary font-bold flex items-center gap-2">
              <ListChecks size={16} className="text-accent" />
              <span>Research Checklist Progression</span>
            </span>
            <span className="text-text-secondary">
              <strong className="text-emerald-400 text-sm">{completedCount}</strong> of {tracker.steps.length || 25} Milestones Completed / Skipped (
              <strong className="text-accent text-sm">{progressPercent}%</strong>)
            </span>
          </div>

          {/* 25-Segment Progress Bar */}
          <div className="w-full h-3 rounded-full bg-bg-tertiary overflow-hidden flex gap-0.5 p-0.5 border border-border-default">
            {tracker.steps.map((s) => (
              <div
                key={s.id}
                title={`Stage ${s.stepIndex}: ${s.title} (${s.status})`}
                onClick={() => setExpandedStepIndex(s.stepIndex)}
                className={`h-full flex-1 rounded-xs transition-all cursor-pointer hover:brightness-125 ${
                  s.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : s.status === 'SKIPPED'
                    ? 'bg-slate-500/60'
                    : s.status === 'IN_PROGRESS'
                    ? 'bg-accent animate-pulse'
                    : 'bg-border-default/50 hover:bg-accent/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono pt-1">
            <span>Stage 1: Idea Formulation</span>
            <span>Stage 10: Model Dev</span>
            <span>Stage 17: Manuscript Writing</span>
            <span>Stage 25: Publication &amp; Release</span>
          </div>
        </div>
      </div>

      {/* ─── 25 SEQUENTIAL RESEARCH PHASES ACCORDION ─── */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryMeta = CATEGORY_METADATA[category]
          const categorySteps = tracker.steps.filter((s) => s.category === category)
          const categoryCompleted = categorySteps.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED').length

          return (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${categoryMeta.bg} ${categoryMeta.color} border ${categoryMeta.border}`}>
                    {categoryMeta.label}
                  </span>
                </div>
                <span className="text-xs font-mono text-text-tertiary">
                  {categoryCompleted}/{categorySteps.length} Completed
                </span>
              </div>

              {/* Steps in this Category */}
              <div className="space-y-3">
                {categorySteps.map((step) => {
                  const isExpanded = expandedStepIndex === step.stepIndex
                  const stageDef = PAPER_TRACKER_STAGES.find((st) => st.key === step.stepKey)
                  const draft = stepDrafts[step.id] || {
                    deliverableUrls: [''],
                    deliverableNotes: '',
                    studentNotes: '',
                    supervisorFeedback: '',
                    dueDate: '',
                  }

                  const currentIndexInAll = tracker.steps.findIndex((s) => s.id === step.id)
                  const canMoveUp = isSupervisorUser && currentIndexInAll > 0
                  const canMoveDown = isSupervisorUser && currentIndexInAll < tracker.steps.length - 1

                  return (
                    <div
                      key={step.id}
                      className={`glass-card border transition-all duration-200 overflow-hidden ${
                        step.status === 'COMPLETED'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : step.status === 'SKIPPED'
                          ? 'border-slate-500/30 bg-slate-500/5 opacity-80'
                          : step.status === 'SUBMITTED'
                          ? 'border-purple-500/40 bg-purple-500/5 shadow-md'
                          : step.status === 'REJECTED'
                          ? 'border-rose-500/40 bg-rose-500/5'
                          : step.status === 'IN_PROGRESS'
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border-default'
                      }`}
                    >
                      {/* Stage Card Header Line */}
                      <div
                        onClick={() => setExpandedStepIndex(isExpanded ? null : step.stepIndex)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-tertiary/40 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reorder Buttons for Supervisors */}
                          {isSupervisorUser && (
                            <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={!canMoveUp || reorderingStepId === step.id}
                                onClick={() => handleReorderStep(step.id, 'UP')}
                                className="p-0.5 text-text-tertiary hover:text-accent disabled:opacity-20 transition-colors cursor-pointer"
                                title="Move Milestone Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={!canMoveDown || reorderingStepId === step.id}
                                onClick={() => handleReorderStep(step.id, 'DOWN')}
                                className="p-0.5 text-text-tertiary hover:text-accent disabled:opacity-20 transition-colors cursor-pointer"
                                title="Move Milestone Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          )}

                          <span
                            className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                              step.status === 'COMPLETED'
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : step.status === 'SKIPPED'
                                ? 'bg-slate-600 text-slate-200'
                                : step.status === 'IN_PROGRESS'
                                ? 'bg-accent text-white shadow-xs'
                                : 'bg-bg-tertiary text-text-tertiary border border-border-default'
                            }`}
                          >
                            {step.stepIndex}
                          </span>

                          <div className="min-w-0">
                            <h3 className="text-xs md:text-sm font-bold text-text-primary truncate flex items-center gap-2">
                              <span className={step.status === 'SKIPPED' ? 'line-through text-text-tertiary' : ''}>{step.title}</span>
                              {step.status === 'SKIPPED' && (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20">
                                  <FastForward size={10} /> Skipped
                                </span>
                              )}
                              {step.deliverableUrl && (
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <LinkIcon size={10} />{' '}
                                  {parseDeliverableUrls(step.deliverableUrl).filter((u) => u.trim()).length > 1
                                    ? `${parseDeliverableUrls(step.deliverableUrl).filter((u) => u.trim()).length} Artifacts`
                                    : 'Artifact'}
                                </span>
                              )}
                              {step.supervisorFeedback && (
                                <span className="text-[10px] text-purple-400 font-mono flex items-center gap-0.5 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                  <MessageSquare size={10} /> Feedback
                                </span>
                              )}
                            </h3>
                            {step.description && (
                              <p className="text-[11px] text-text-tertiary truncate max-w-xl">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Toggle & Review Quick Actions */}
                        <div
                          className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Status Badge Buttons */}
                          {(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'BLOCKED', 'SKIPPED'] as const)
                            .filter((st) => {
                              if (step.status === st) return true
                              if (st === 'IN_PROGRESS' || st === 'SUBMITTED' || st === 'COMPLETED') return true
                              return false
                            })
                            .map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateStepStatus(step.id, st)}
                                disabled={!canEditAndComment}
                                className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-80 ${
                                  step.status === st
                                    ? st === 'COMPLETED'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : st === 'SUBMITTED'
                                      ? 'bg-purple-500 text-white shadow-xs'
                                      : st === 'IN_PROGRESS'
                                      ? 'bg-accent text-white shadow-xs'
                                      : st === 'REJECTED'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : st === 'BLOCKED'
                                      ? 'bg-red-500 text-white shadow-xs'
                                      : st === 'SKIPPED'
                                      ? 'bg-slate-600 text-white shadow-xs'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
                                }`}
                              >
                                {st === 'IN_PROGRESS'
                                  ? 'Active'
                                  : st === 'SUBMITTED'
                                  ? 'Under Review'
                                  : st === 'REJECTED'
                                  ? 'Revision'
                                  : st === 'SKIPPED'
                                  ? 'Skipped'
                                  : st}
                              </button>
                            ))}

                          <button
                            type="button"
                            onClick={() => setExpandedStepIndex(isExpanded ? null : step.stepIndex)}
                            className="p-1 text-text-tertiary hover:text-text-primary ml-1"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Workspace Body */}
                      {isExpanded && (
                        <div className="p-4 md:p-6 border-t border-border-default/60 space-y-4 bg-bg-primary/50 text-xs animate-slide-in">
                          {/* Guidelines / Criteria Checklist */}
                          {stageDef?.guidelines && (
                            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default/80 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-accent font-mono block">
                                Recommended Stage Deliverables &amp; Guidelines:
                              </span>
                              <ul className="space-y-1 text-text-secondary text-[11px]">
                                {stageDef.guidelines.map((g, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-accent font-bold">•</span>
                                    <span>{g}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Editable Stage Deliverables & Fields */}
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Left Column: Artifacts & Due Date */}
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-bold text-text-primary uppercase font-mono flex items-center gap-1.5">
                                    <LinkIcon size={12} className="text-accent" />
                                    <span>Deliverable Links &amp; Artifacts</span>
                                  </label>
                                  {canEditAndComment && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddDeliverableUrl(step.id)}
                                      className="text-[10px] font-mono text-accent hover:text-accent-hover flex items-center gap-1 cursor-pointer font-bold"
                                    >
                                      <Plus size={11} /> Add Artifact Link
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  {draft.deliverableUrls.map((urlVal, uIdx) => (
                                    <div key={uIdx} className="flex items-center gap-1.5">
                                      <input
                                        type="url"
                                        value={urlVal}
                                        onChange={(e) => handleDeliverableUrlChange(step.id, uIdx, e.target.value)}
                                        disabled={!canEditAndComment}
                                        placeholder="https://github.com/... or https://overleaf.com/..."
                                        className="flex-1 p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent disabled:opacity-70"
                                      />
                                      {urlVal.trim() && (
                                        <a
                                          href={urlVal.startsWith('http') ? urlVal : `https://${urlVal}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-accent transition-colors shrink-0"
                                          title="Open link"
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                      )}
                                      {canEditAndComment && draft.deliverableUrls.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDeliverableUrl(step.id, uIdx)}
                                          className="p-2 rounded-lg text-text-tertiary hover:text-danger hover:bg-bg-tertiary transition-colors shrink-0 cursor-pointer"
                                          title="Remove URL"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-text-primary uppercase font-mono block mb-1">
                                  Target Milestone Due Date
                                </label>
                                <input
                                  type="date"
                                  value={draft.dueDate}
                                  onChange={(e) =>
                                    setStepDrafts((prev) => ({
                                      ...prev,
                                      [step.id]: { ...draft, dueDate: e.target.value },
                                    }))
                                  }
                                  disabled={!canEditAndComment}
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent disabled:opacity-70"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-text-primary uppercase font-mono block mb-1">
                                  Deliverable Description &amp; Artifact Details
                                </label>
                                <textarea
                                  rows={2}
                                  value={draft.deliverableNotes}
                                  onChange={(e) =>
                                    setStepDrafts((prev) => ({
                                      ...prev,
                                      [step.id]: { ...draft, deliverableNotes: e.target.value },
                                    }))
                                  }
                                  disabled={!canEditAndComment}
                                  placeholder="Describe the attached code commits, datasets, baseline metrics, or draft section..."
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                />
                              </div>
                            </div>

                            {/* Right Column: Researcher Notes & Supervisor Feedback */}
                            <div className="space-y-3">
                              <div>
                                <label className="text-[11px] font-bold text-text-primary uppercase font-mono block mb-1">
                                  Researcher Internal Working Notes
                                </label>
                                <textarea
                                  rows={3}
                                  value={draft.studentNotes}
                                  onChange={(e) =>
                                    setStepDrafts((prev) => ({
                                      ...prev,
                                      [step.id]: { ...draft, studentNotes: e.target.value },
                                    }))
                                  }
                                  disabled={!canEditAndComment}
                                  placeholder="Formulas tried, hyperparameter settings, blockers faced, ablation details..."
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-purple-400 uppercase font-mono flex items-center gap-1.5 mb-1">
                                  <MessageSquare size={12} />
                                  <span>Supervisor / Reviewer Advice &amp; Feedback</span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={draft.supervisorFeedback}
                                  onChange={(e) =>
                                    setStepDrafts((prev) => ({
                                      ...prev,
                                      [step.id]: { ...draft, supervisorFeedback: e.target.value },
                                    }))
                                  }
                                  placeholder="Advisor comments, suggested revisions, or criteria required before moving to next stage..."
                                  disabled={!canEditAndComment}
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Save & Supervisor Review Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-default/60">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-text-tertiary">
                                {step.status === 'COMPLETED' && step.completedAt && (
                                  <span className="text-emerald-400 font-semibold font-mono bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1">
                                    ✓ Approved &amp; Completed on {new Date(step.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {step.status === 'SKIPPED' && (
                                  <span className="text-slate-400 font-semibold font-mono bg-slate-500/10 px-2 py-1 rounded-lg border border-slate-500/20 inline-flex items-center gap-1">
                                    ⏭️ Skipped by Supervisor (Optional for this paper)
                                  </span>
                                )}
                                {step.status === 'SUBMITTED' && (
                                  <span className="text-purple-300 font-bold font-mono bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30 inline-flex items-center gap-1.5 animate-pulse">
                                    <Clock size={13} className="text-purple-400" /> Student Notified Supervisor (Review in Progress)
                                  </span>
                                )}
                                {step.status === 'REJECTED' && (
                                  <span className="text-rose-400 font-semibold font-mono bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 inline-flex items-center gap-1">
                                    <AlertTriangle size={12} /> Revision Requested — Update deliverables &amp; resubmit
                                  </span>
                                )}
                                {step.status === 'IN_PROGRESS' && (
                                  <span className="text-accent font-semibold font-mono bg-accent/10 px-2 py-1 rounded-lg border border-accent/20 inline-flex items-center gap-1">
                                    ⏳ Active Working Stage
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {/* Supervisor Skip / Unskip Toggle */}
                              {isSupervisorUser && (
                                <>
                                  {step.status === 'SKIPPED' ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      loading={savingStepId === step.id}
                                      onClick={() => handleReviewStep(step.id, 'UNSKIP', step.stepIndex)}
                                      icon={<RotateCcw size={13} />}
                                    >
                                      Unskip Milestone
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      loading={savingStepId === step.id}
                                      onClick={() => handleReviewStep(step.id, 'SKIP', step.stepIndex)}
                                      icon={<FastForward size={13} />}
                                      className="text-text-tertiary hover:text-text-primary"
                                    >
                                      Skip Milestone
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Supervisor / Admin Decision Actions - ONLY SHOWN WHEN STUDENT NOTIFIED (SUBMITTED) */}
                              {isSupervisorUser && step.status === 'SUBMITTED' && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    loading={savingStepId === step.id}
                                    onClick={() => handleReviewStep(step.id, 'REJECT', step.stepIndex)}
                                    icon={<ThumbsDown size={13} />}
                                    className="bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white border-rose-500/30"
                                  >
                                    Reject (Remain on Stage {step.stepIndex})
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    loading={savingStepId === step.id}
                                    onClick={() => handleReviewStep(step.id, 'ACCEPT', step.stepIndex)}
                                    icon={<ThumbsUp size={13} />}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-bold"
                                  >
                                    Accept &amp; Advance to Next Stage →
                                  </Button>
                                </>
                              )}

                              {/* Student & Researcher Actions (for owners or student collaborators with edit access) */}
                              {canEditAndComment && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    loading={savingStepId === step.id}
                                    onClick={() => handleSaveStepDraft(step.id, false)}
                                    icon={<Save size={13} />}
                                  >
                                    Save Stage Update
                                  </Button>

                                  {!isSupervisor && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="primary"
                                      loading={savingStepId === step.id}
                                      onClick={() => handleSaveStepDraft(step.id, true)}
                                      icon={<Send size={13} />}
                                      className="bg-purple-600 hover:bg-purple-500 text-white shadow-sm font-semibold"
                                    >
                                      {step.status === 'SUBMITTED'
                                        ? 'Resend Notification to Supervisor'
                                        : 'Notify Supervisor of Stage Update'}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── SHARE TRACKER MODAL ─── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 space-y-5 border-purple-500/30 shadow-2xl bg-bg-secondary">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-purple-400" />
                <h3 className="text-base font-bold text-text-primary font-display">
                  Share Paper Tracker &amp; Assign Collaborators
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Target Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase font-mono block">
                Share Destination
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('INDIVIDUAL')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    targetType === 'INDIVIDUAL'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  <Users size={16} />
                  <span>Student Researcher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('LAB')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    targetType === 'LAB'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  <Building size={16} />
                  <span>Research Lab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('GROUP')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    targetType === 'GROUP'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  <Layers size={16} />
                  <span>Sub-Group Cluster</span>
                </button>
              </div>
            </div>

            {/* Target Picker */}
            {targetType === 'INDIVIDUAL' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary uppercase font-mono block">
                  Select Students
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-bg-tertiary border border-border-default">
                  {availableStudents.length === 0 ? (
                    <p className="text-xs text-text-tertiary p-2 text-center">No students found.</p>
                  ) : (
                    availableStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudentIds((prev) =>
                              isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            )
                          }}
                          className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                              : 'hover:bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          <div>
                            <span className="text-text-primary">{s.name}</span>
                            <span className="text-[11px] text-text-tertiary block">{s.email}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-purple-400" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {targetType === 'LAB' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary uppercase font-mono block">
                  Select Research Labs
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-bg-tertiary border border-border-default">
                  {availableLabs.length === 0 ? (
                    <p className="text-xs text-text-tertiary p-2 text-center">No labs found.</p>
                  ) : (
                    availableLabs.map((l) => {
                      const isSelected = selectedLabIds.includes(l.id)
                      return (
                        <div
                          key={l.id}
                          onClick={() => {
                            setSelectedLabIds((prev) =>
                              isSelected ? prev.filter((id) => id !== l.id) : [...prev, l.id]
                            )
                          }}
                          className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                              : 'hover:bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          <div>
                            <span className="text-text-primary font-bold">{l.name}</span>
                            <span className="text-[11px] text-text-tertiary block">{l.institution}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-purple-400" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {targetType === 'GROUP' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary uppercase font-mono block">
                  Select Sub-Group Clusters
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-bg-tertiary border border-border-default">
                  {availableLabs.flatMap((l) => l.groups.map((g) => ({ ...g, labName: l.name }))).length === 0 ? (
                    <p className="text-xs text-text-tertiary p-2 text-center">No sub-groups found.</p>
                  ) : (
                    availableLabs.flatMap((l) => l.groups.map((g) => ({ ...g, labName: l.name }))).map((g) => {
                      const isSelected = selectedGroupIds.includes(g.id)
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            setSelectedGroupIds((prev) =>
                              isSelected ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                            )
                          }}
                          className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                              : 'hover:bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          <div>
                            <span className="text-text-primary font-bold">{g.name}</span>
                            <span className="text-[11px] text-text-tertiary block">Lab: {g.labName}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-purple-400" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Permission Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase font-mono block">
                Access Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSharePermission('COLLABORATE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left space-y-0.5 ${
                    sharePermission === 'COLLABORATE'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-text-primary font-bold">
                    <Edit size={13} className="text-accent" /> Collaborate &amp; Edit
                  </div>
                  <p className="text-[11px] text-text-tertiary">Can update deliverables, notes, and checklist stages</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSharePermission('VIEW')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left space-y-0.5 ${
                    sharePermission === 'VIEW'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-text-primary font-bold">
                    <Globe size={13} className="text-accent" /> View Only
                  </div>
                  <p className="text-[11px] text-text-tertiary">Can view progress and read deliverables in read-only mode</p>
                </button>
              </div>
            </div>

            {/* Existing Shares List */}
            {tracker.shares.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border-default">
                <span className="text-[11px] font-bold text-text-tertiary uppercase font-mono block">
                  Current Shares ({tracker.shares.length})
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {tracker.shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-bg-tertiary text-xs border border-border-default/60"
                    >
                      <span className="text-text-primary font-medium">
                        {share.user ? `👤 ${share.user.name}` : share.lab ? `🏛️ ${share.lab.name}` : `🔬 ${share.group?.name}`}
                      </span>
                      <Badge variant="outline" size="sm">
                        {share.permission}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsShareModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                loading={savingShare}
                onClick={handleSaveShare}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                Apply Shares
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
