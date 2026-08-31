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
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'BLOCKED'
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
          return parsed.filter((u) => typeof u === 'string')
        }
      }
    } catch {}
    // Fallback: newline or comma separated or single URL
    const lines = raw.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
    return lines.length > 0 ? lines : ['']
  }

  const fetchTracker = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/paper-trackers/${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setTracker(data)

        // Initialize draft states
        const drafts: any = {}
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

  const handleReviewStep = async (stepId: string, action: 'ACCEPT' | 'REJECT', stepIndex: number) => {
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
          addToast('success', `✓ Stage ${stepIndex} Approved! Automatically unlocked Stage ${stepIndex + 1}.`)
          setExpandedStepIndex(stepIndex + 1)
        } else {
          addToast('warning', `⚠️ Revision Requested on Stage ${stepIndex}. The stage remains pending revision.`)
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

  // Open Share Modal & fetch candidates
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true)
    fetch('/api/students')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailableStudents(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch('/api/labs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailableLabs(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const handleSaveShares = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudentIds.length === 0 && selectedLabIds.length === 0 && selectedGroupIds.length === 0) {
      addToast('error', 'Please select at least one student, lab, or sub-group to share with')
      return
    }

    try {
      setSavingShare(true)
      const res = await fetch(`/api/paper-trackers/${trackerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission: sharePermission,
          newStudentIds: selectedStudentIds,
          newLabIds: selectedLabIds,
          newGroupIds: selectedGroupIds,
        }),
      })

      if (res.ok) {
        addToast('success', 'Tracker shared successfully!')
        setIsShareModalOpen(false)
        setSelectedStudentIds([])
        setSelectedLabIds([])
        setSelectedGroupIds([])
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
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!tracker) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 glass-card p-8">
        <AlertTriangle size={32} className="text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-text-primary">Paper Tracker Not Found</h2>
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

  const completedCount = tracker.steps.filter((s) => s.status === 'COMPLETED').length
  const inProgressCount = tracker.steps.filter((s) => s.status === 'IN_PROGRESS').length
  const progressPercent = Math.round((completedCount / 25) * 100)

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
              <strong className="text-emerald-400 text-sm">{completedCount}</strong> of 25 Milestones Completed (
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
          const categoryCompleted = categorySteps.filter((s) => s.status === 'COMPLETED').length

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

              {/* Stage Cards inside this Category */}
              <div className="space-y-2.5">
                {categorySteps.map((step) => {
                  const isExpanded = expandedStepIndex === step.stepIndex
                  const stageDef = PAPER_TRACKER_STAGES.find((s) => s.index === step.stepIndex)
                  const draft = stepDrafts[step.id] || {
                    deliverableUrls: [''],
                    deliverableNotes: '',
                    studentNotes: '',
                    supervisorFeedback: '',
                    dueDate: '',
                  }

                  return (
                    <div
                      key={step.id}
                      className={`glass-card overflow-hidden transition-all border ${
                        step.status === 'COMPLETED'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
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
                          <span
                            className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                              step.status === 'COMPLETED'
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : step.status === 'IN_PROGRESS'
                                ? 'bg-accent text-white shadow-xs'
                                : 'bg-bg-tertiary text-text-tertiary border border-border-default'
                            }`}
                          >
                            {step.stepIndex}
                          </span>

                          <div className="min-w-0">
                            <h3 className="text-xs md:text-sm font-bold text-text-primary truncate flex items-center gap-2">
                              <span>{step.title}</span>
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
                          {(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'BLOCKED'] as const)
                            .filter((st) => {
                              // If not in that status and not common, keep list compact
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

                          {/* Deliverable Artifact Link & Notes Form */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Column: Artifacts & Student Synthesis (Full visibility for Supervisor & Student) */}
                            <div className="space-y-3">
                              {/* Deliverable Links & Artifact URLs */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                                    <LinkIcon size={12} className="text-accent" />
                                    <span>Deliverable Links &amp; Artifact URLs</span>
                                  </label>
                                  {canEditAndComment && !isSupervisor && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentUrls = draft.deliverableUrls || ['']
                                        setStepDrafts({
                                          ...stepDrafts,
                                          [step.id]: { ...draft, deliverableUrls: [...currentUrls, ''] },
                                        })
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline cursor-pointer"
                                    >
                                      <Plus size={11} /> Add Link
                                    </button>
                                  )}
                                </div>

                                {isSupervisor ? (
                                  /* Supervisor Read/Inspection View */
                                  <div className="space-y-1.5 p-2.5 rounded-lg bg-bg-tertiary border border-border-default">
                                    {(draft.deliverableUrls || []).filter((u) => u.trim()).length > 0 ? (
                                      <div className="flex flex-col gap-1.5">
                                        {(draft.deliverableUrls || [])
                                          .filter((u) => u.trim())
                                          .map((url, idx) => (
                                            <a
                                              key={idx}
                                              href={url.startsWith('http') ? url : `https://${url}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary hover:bg-accent/10 border border-border-default hover:border-accent transition-all group text-xs text-text-primary"
                                            >
                                              <div className="flex items-center gap-2 truncate">
                                                <Globe size={13} className="text-accent shrink-0 group-hover:scale-110 transition-transform" />
                                                <span className="truncate font-mono text-[11px] text-accent font-semibold">{url}</span>
                                              </div>
                                              <ExternalLink size={12} className="text-text-tertiary group-hover:text-accent shrink-0" />
                                            </a>
                                          ))}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-text-tertiary italic flex items-center gap-1">
                                        <AlertTriangle size={12} className="text-amber-400/80" /> No deliverable links attached yet
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  /* Student Editing Input View */
                                  <div className="space-y-2">
                                    {(draft.deliverableUrls || ['']).map((url, urlIndex) => (
                                      <div key={urlIndex} className="flex items-center gap-1.5">
                                        <input
                                          type="url"
                                          value={url}
                                          onChange={(e) => {
                                            const updatedUrls = [...(draft.deliverableUrls || [''])]
                                            updatedUrls[urlIndex] = e.target.value
                                            setStepDrafts({
                                              ...stepDrafts,
                                              [step.id]: { ...draft, deliverableUrls: updatedUrls },
                                            })
                                          }}
                                          disabled={!canEditAndComment}
                                          placeholder={
                                            urlIndex === 0
                                              ? stageDef?.deliverablePlaceholder || 'https://github.com/... or https://overleaf.com/...'
                                              : `https://... (Deliverable link #${urlIndex + 1})`
                                         }
                                          className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono disabled:opacity-70"
                                        />

                                        {url.trim() && (
                                          <a
                                            href={url.startsWith('http') ? url : `https://${url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent hover:text-white transition-colors shrink-0"
                                            title={`Open Link #${urlIndex + 1}`}
                                          >
                                            <ExternalLink size={13} />
                                          </a>
                                        )}

                                        {canEditAndComment && (draft.deliverableUrls || []).length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedUrls = (draft.deliverableUrls || []).filter((_, idx) => idx !== urlIndex)
                                              setStepDrafts({
                                                ...stepDrafts,
                                                [step.id]: {
                                                  ...draft,
                                                  deliverableUrls: updatedUrls.length > 0 ? updatedUrls : [''],
                                                },
                                              })
                                            }}
                                            className="p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                            title="Remove Link"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Deliverable Notes & Findings */}
                              <div>
                                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 mb-1">
                                  <FileText size={12} className="text-cyan-400" />
                                  <span>Deliverable Notes &amp; Findings</span>
                                </label>
                                {isSupervisor ? (
                                  <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary min-h-[60px] whitespace-pre-wrap">
                                    {draft.deliverableNotes?.trim() ? (
                                      draft.deliverableNotes
                                    ) : (
                                      <span className="text-text-tertiary italic text-[11px]">No deliverable findings documented yet.</span>
                                    )}
                                  </div>
                                ) : (
                                  <textarea
                                    value={draft.deliverableNotes}
                                    onChange={(e) =>
                                      setStepDrafts({
                                        ...stepDrafts,
                                        [step.id]: { ...draft, deliverableNotes: e.target.value },
                                      })
                                    }
                                    placeholder="Document key results, checkpoints, dataset splits, code commit hashes..."
                                    rows={3}
                                    disabled={!canEditAndComment}
                                    className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                  />
                                )}
                              </div>

                              {/* Student Working Notes & Open Questions */}
                              <div>
                                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 mb-1">
                                  <GraduationCap size={12} className="text-blue-400" />
                                  <span>Student Working Notes &amp; Open Questions</span>
                                </label>
                                {isSupervisor ? (
                                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-text-primary min-h-[50px] whitespace-pre-wrap">
                                    {draft.studentNotes?.trim() ? (
                                      draft.studentNotes
                                    ) : (
                                      <span className="text-text-tertiary italic text-[11px]">No open student questions or blockers noted.</span>
                                    )}
                                  </div>
                                ) : (
                                  <textarea
                                    value={draft.studentNotes}
                                    onChange={(e) =>
                                      setStepDrafts({
                                        ...stepDrafts,
                                        [step.id]: { ...draft, studentNotes: e.target.value },
                                      })
                                    }
                                    placeholder="Unresolved questions for supervisor, blockers, GPU compute constraints..."
                                    rows={2}
                                    disabled={!canEditAndComment}
                                    className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Right Column: Supervisor Feedback & Stage Deadline */}
                            <div className="space-y-3">
                              <div>
                                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 mb-1">
                                  <Calendar size={12} className="text-amber-400" />
                                  <span>Target Completion Date</span>
                                </label>
                                <input
                                  type="date"
                                  value={draft.dueDate}
                                  onChange={(e) =>
                                    setStepDrafts({
                                      ...stepDrafts,
                                      [step.id]: { ...draft, dueDate: e.target.value },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 mb-1">
                                  <MessageSquare size={12} className="text-purple-400" />
                                  <span>Review Comments &amp; Feedback</span>
                                </label>
                                <textarea
                                  value={draft.supervisorFeedback}
                                  onChange={(e) =>
                                    setStepDrafts({
                                      ...stepDrafts,
                                      [step.id]: { ...draft, supervisorFeedback: e.target.value },
                                    })
                                  }
                                  placeholder="Provide constructive feedback, approve methodology, or leave review remarks..."
                                  rows={5}
                                  disabled={!canEditAndComment}
                                  className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y disabled:opacity-70"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Save & Supervisor Review Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-default/60">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-tertiary">
                                {step.status === 'COMPLETED' && step.completedAt && (
                                  <span className="text-emerald-400 font-semibold font-mono bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1">
                                    ✓ Approved &amp; Completed on {new Date(step.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {step.status === 'SUBMITTED' && (
                                  <span className="text-purple-300 font-bold font-mono bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30 inline-flex items-center gap-1.5 animate-pulse">
                                    <Clock size={13} className="text-purple-400" /> Review on process (Awaiting Supervisor Decision)
                                  </span>
                                )}
                                {step.status === 'REJECTED' && (
                                  <span className="text-rose-400 font-semibold font-mono bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 inline-flex items-center gap-1">
                                    <AlertTriangle size={12} /> Revision Requested — Update deliverables &amp; resubmit
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {/* Supervisor / Admin ONLY Review Decision Actions */}
                              {(isSupervisor || isAdmin) && (
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
                              {canEditAndComment && !isSupervisor && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xl max-h-[90vh] flex flex-col p-6 space-y-5 border-accent/30 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-display">
                    Share Paper Tracker
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Distribute this checklist to lab members, cluster groups, or individual peers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated"
              >
                ✕
              </button>
            </div>

            {/* Currently Active Shares List */}
            {tracker.shares.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-bg-primary border border-border-default">
                <span className="text-[11px] font-bold text-text-primary block font-mono">
                  Currently Shared With ({tracker.shares.length}):
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {tracker.shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-1.5 rounded bg-bg-tertiary border border-border-default text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {s.targetType === 'STUDENT' ? (
                          <GraduationCap size={13} className="text-blue-400" />
                        ) : s.targetType === 'LAB' ? (
                          <Building size={13} className="text-purple-400" />
                        ) : (
                          <Users size={13} className="text-cyan-400" />
                        )}
                        <span className="font-semibold text-text-primary">
                          {s.user?.name || s.lab?.name || s.group?.name || s.targetType}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            s.permission === 'COLLABORATE'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-sky-500/20 text-sky-400'
                          }`}
                        >
                          {s.permission === 'COLLABORATE' ? 'Edit & Comment' : 'View Only'}
                        </span>
                      </div>

                      {canEditAndComment && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/paper-trackers/${trackerId}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ removeShareId: s.id }),
                              })
                              if (res.ok) {
                                addToast('success', 'Access revoked successfully')
                                fetchTracker()
                              }
                            } catch {
                              addToast('error', 'Failed to revoke access')
                            }
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveShares} className="space-y-4 text-xs">
              {/* Permission Level Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary block">
                  Add New Access &amp; Permission Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSharePermission('COLLABORATE')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      sharePermission === 'COLLABORATE'
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold text-xs block text-accent">✏️ Edit &amp; Comment</span>
                    <span className="text-[10px] text-text-tertiary block mt-0.5">
                      Can update checklist status, link artifacts, and write feedback.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSharePermission('VIEW')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      sharePermission === 'VIEW'
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold text-xs block text-sky-400">👁️ View Only</span>
                    <span className="text-[10px] text-text-tertiary block mt-0.5">
                      Read-only visibility into milestones and progress.
                    </span>
                  </button>
                </div>
              </div>

              {/* Target Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary block">
                  Select Recipients
                </label>
                <div className="flex items-center gap-2 border-b border-border-default pb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTargetType('INDIVIDUAL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      targetType === 'INDIVIDUAL'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <GraduationCap size={13} /> {isSupervisor ? 'Supervised Students' : 'Individual Peer Students'} ({availableStudents.length})
                  </button>

                  {(isSupervisor || isAdmin) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTargetType('LAB')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          targetType === 'LAB'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <Building size={13} /> Research Labs ({availableLabs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetType('GROUP')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          targetType === 'GROUP'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <Users size={13} /> Sub-Groups
                      </button>
                    </>
                  )}
                </div>

                {/* Individual Students Checkbox List */}
                {targetType === 'INDIVIDUAL' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                      <span>Select researchers:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIds.length === availableStudents.length) {
                            setSelectedStudentIds([])
                          } else {
                            setSelectedStudentIds(availableStudents.map((s) => s.id))
                          }
                        }}
                        className="text-accent hover:underline font-mono"
                      >
                        {selectedStudentIds.length === availableStudents.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                      {availableStudents.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-tertiary transition-colors cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, s.id])
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id))
                              }
                            }}
                            className="accent-accent rounded"
                          />
                          <span className="font-semibold text-text-primary">{s.name}</span>
                          <span className="text-[11px] text-text-tertiary">({s.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Research Labs Checkbox List */}
                {targetType === 'LAB' && (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                      {availableLabs.map((l) => (
                        <label
                          key={l.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-tertiary transition-colors cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLabIds.includes(l.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLabIds([...selectedLabIds, l.id])
                              } else {
                                setSelectedLabIds(selectedLabIds.filter((id) => id !== l.id))
                              }
                            }}
                            className="accent-accent rounded"
                          />
                          <span className="font-semibold text-text-primary">{l.name}</span>
                          <span className="text-[11px] text-text-tertiary">({l.institution})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Groups Checkbox List */}
                {targetType === 'GROUP' && (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                      {availableLabs.flatMap((l) =>
                        l.groups.map((g) => (
                          <label
                            key={g.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-tertiary transition-colors cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroupIds([...selectedGroupIds, g.id])
                                } else {
                                  setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id))
                                }
                              }}
                              className="accent-accent rounded"
                            />
                            <span className="font-semibold text-text-primary">{g.name}</span>
                            <span className="text-[11px] text-text-tertiary">(Lab: {l.name})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsShareModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingShare}
                  icon={<Share2 size={13} />}
                >
                  Save &amp; Share
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
