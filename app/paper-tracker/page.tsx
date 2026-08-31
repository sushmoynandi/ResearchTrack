'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ListChecks,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Building,
  GraduationCap,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Share2,
  FileText,
  Trash2,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_METADATA } from '@/lib/paperTrackerStages'

interface StepItem {
  id: string
  stepIndex: number
  stepKey: string
  title: string
  category: 'PLANNING' | 'DATA' | 'MODELING' | 'ANALYSIS' | 'WRITING' | 'PUBLICATION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  deliverableUrl?: string | null
  dueDate?: string | null
}

interface PaperTrackerItem {
  id: string
  title: string
  description?: string | null
  targetVenue?: string | null
  targetDate?: string | null
  status: 'ACTIVE' | 'SUBMITTED' | 'ACCEPTED' | 'PUBLISHED' | 'ON_HOLD' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
    systemRole: string
  }
  papers: Array<{
    id: string
    title: string
    authors: string
    slug?: string | null
  }>
  steps: StepItem[]
  shares: Array<{
    id: string
    targetType: 'STUDENT' | 'LAB' | 'GROUP'
    user?: { id: string; name: string; email: string } | null
    lab?: { id: string; name: string } | null
    group?: { id: string; name: string } | null
    permission: string
  }>
}

export default function PaperTrackerDashboardPage() {
  const { user, isSupervisor, isAdmin, isStudent } = useAuth()
  const { addToast } = useToast()

  const [trackers, setTrackers] = useState<PaperTrackerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTargetVenue, setNewTargetVenue] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [availablePapers, setAvailablePapers] = useState<Array<{ id: string; title: string; authors: string }>>([])

  // Multi-Target Assignment State
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'LAB' | 'GROUP'>('INDIVIDUAL')
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [labs, setLabs] = useState<
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
  const [sharePermission, setSharePermission] = useState<'COLLABORATE' | 'VIEW'>('COLLABORATE')
  const [creating, setCreating] = useState(false)

  const fetchTrackers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/paper-trackers')
      if (res.ok) {
        const data = await res.json()
        setTrackers(Array.isArray(data) ? data : [])
      }
    } catch {
      addToast('error', 'Failed to load paper trackers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackers()
  }, [])

  // Fetch available papers, students & labs when opening create modal
  useEffect(() => {
    if (isCreateModalOpen) {
      fetch('/api/papers')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setAvailablePapers(Array.isArray(data) ? data : data.papers || []))
        .catch(() => {})

      fetch('/api/students')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setStudents(Array.isArray(data) ? data : []))
        .catch(() => {})

      fetch('/api/labs')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setLabs(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [isCreateModalOpen])

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      addToast('error', 'Please provide a project or paper title')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/paper-trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          targetVenue: newTargetVenue.trim() || null,
          targetDate: newTargetDate || null,
          paperIds: selectedPaperIds,
          studentIds: selectedStudentIds,
          labIds: selectedLabIds,
          groupIds: selectedGroupIds,
          permission: sharePermission,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        addToast('success', 'Paper Tracker created successfully!')
        setIsCreateModalOpen(false)
        setNewTitle('')
        setNewDescription('')
        setNewTargetVenue('')
        setNewTargetDate('')
        setSelectedPaperIds([])
        setSelectedStudentIds([])
        setSelectedLabIds([])
        setSelectedGroupIds([])
        fetchTrackers()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create tracker')
      }
    } catch {
      addToast('error', 'Network error creating paper tracker')
    } finally {
      setCreating(false)
    }
  }

  // Filtered trackers
  const filteredTrackers = trackers.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.targetVenue && t.targetVenue.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.owner.name && t.owner.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Global Statistics
  const totalTrackers = trackers.length
  const completedStagesTotal = trackers.reduce(
    (acc, t) => acc + t.steps.filter((s) => s.status === 'COMPLETED').length,
    0
  )
  const totalPossibleStages = totalTrackers * 25
  const overallProgressPct =
    totalPossibleStages > 0 ? Math.round((completedStagesTotal / totalPossibleStages) * 100) : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-accent/20 bg-gradient-to-br from-bg-secondary via-bg-tertiary/60 to-accent/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center shadow-xs">
              <ListChecks size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary font-display flex items-center gap-2">
                Paper Tracker
              </h1>
              <p className="text-xs md:text-sm text-text-secondary mt-0.5">
                {isSupervisor
                  ? 'Supervise research workflows, review student deliverables, and track project milestones.'
                  : 'Track your publication journey from Research Idea Selection to Final Dissemination.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md"
          >
            Start New Paper Tracker
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            Active Projects
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary font-display">{totalTrackers}</span>
            <ListChecks size={18} className="text-accent" />
          </div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            Stages Completed
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-display">
              {completedStagesTotal}
            </span>
            <span className="text-xs text-text-tertiary font-mono">/ {totalPossibleStages}</span>
          </div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            Overall Completion
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-cyan-400 font-display">
              {overallProgressPct}%
            </span>
            <TrendingUp size={18} className="text-cyan-400" />
          </div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            Collaborators &amp; Labs
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-400 font-display">
              {trackers.reduce((acc, t) => acc + t.shares.length, 0)}
            </span>
            <Users size={18} className="text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card p-3.5">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, conference venue, or researcher..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SUBMITTED', 'ACCEPTED', 'PUBLISHED', 'ON_HOLD'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tracker Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card p-5 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : filteredTrackers.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4 border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto">
            <ListChecks size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-text-primary">No Paper Trackers Found</h3>
            <p className="text-xs text-text-secondary">
              Start tracking a research paper across the 25 sequential milestones or adjust your search filters.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create First Tracker
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTrackers.map((tracker) => {
            const completedCount = tracker.steps.filter((s) => s.status === 'COMPLETED').length
            const inProgressCount = tracker.steps.filter((s) => s.status === 'IN_PROGRESS').length
            const currentStep =
              tracker.steps.find((s) => s.status === 'IN_PROGRESS') ||
              tracker.steps.find((s) => s.status === 'PENDING') ||
              tracker.steps[tracker.steps.length - 1]
            const progressPercent = Math.round((completedCount / 25) * 100)

            return (
              <div
                key={tracker.id}
                className="glass-card p-5 md:p-6 space-y-4 border-border-default hover:border-accent/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                          size="sm"
                        >
                          {tracker.status}
                        </Badge>

                        {tracker.targetVenue && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            🎯 {tracker.targetVenue}
                          </span>
                        )}

                        {tracker.targetDate && (
                          <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                            <Calendar size={11} className="text-accent" />
                            {new Date(tracker.targetDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                        <Link href={`/paper-tracker/${tracker.id}`}>{tracker.title}</Link>
                      </h3>
                    </div>

                    <Link
                      href={`/paper-tracker/${tracker.id}`}
                      className="p-2 rounded-xl bg-bg-tertiary hover:bg-accent hover:text-white text-text-secondary transition-all cursor-pointer shrink-0"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>

                  {tracker.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {tracker.description}
                    </p>
                  )}

                  {/* Owner & Collaborator Badges */}
                  <div className="flex items-center gap-3 text-xs text-text-tertiary pt-1 border-t border-border-default/50 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={13} className="text-accent" />
                      <span>Owner: <strong className="text-text-primary">{tracker.owner.name}</strong></span>
                    </div>

                    {tracker.shares.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-purple-400 font-mono text-[11px] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          <Share2 size={11} />
                          <span>
                            Shared ({tracker.shares.length}):{' '}
                            {tracker.shares
                              .slice(0, 2)
                              .map((s) => s.user?.name || s.lab?.name || s.group?.name || s.targetType)
                              .join(', ')}
                            {tracker.shares.length > 2 ? ` +${tracker.shares.length - 2} more` : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-text-tertiary font-mono text-[11px]">
                        <span>🔒 Private (Not shared)</span>
                      </div>
                    )}

                    {tracker.papers && tracker.papers.length > 0 && (
                      <div className="flex items-center gap-1 text-sky-400 truncate max-w-[240px]">
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">
                          {tracker.papers.length === 1
                            ? tracker.papers[0].title
                            : `${tracker.papers.length} linked papers`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress & Current Stage Widget */}
                <div className="p-3.5 rounded-xl bg-bg-tertiary/70 border border-border-default/60 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary font-medium">
                      Current Stage ({currentStep ? `${currentStep.stepIndex}/25` : 'Done'}):
                    </span>
                    <span className="font-bold text-accent">{progressPercent}%</span>
                  </div>

                  {/* 25-Segment Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-bg-primary overflow-hidden flex gap-0.5 p-0.5 border border-border-default/40">
                    {tracker.steps.map((s) => (
                      <div
                        key={s.id}
                        title={`Stage ${s.stepIndex}: ${s.title} (${s.status})`}
                        className={`h-full flex-1 rounded-xs transition-all ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : s.status === 'IN_PROGRESS'
                            ? 'bg-accent animate-pulse'
                            : 'bg-border-default/40'
                        }`}
                      />
                    ))}
                  </div>

                  {currentStep && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-text-primary truncate">
                        {currentStep.stepIndex}. {currentStep.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          currentStep.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : currentStep.status === 'IN_PROGRESS'
                            ? 'bg-accent/20 text-accent'
                            : 'bg-bg-elevated text-text-tertiary'
                        }`}
                      >
                        {currentStep.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── CREATE NEW PAPER TRACKER MODAL ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col p-6 md:p-8 space-y-5 border-accent/30 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                  <ListChecks size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display">
                    Start Paper Tracker
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Initialize serial research stages with multi-target sharing across students &amp; labs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTracker} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">
                  Research Project / Working Paper Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Scalable Diffusion Transformers for Medical Image Synthesis"
                  required
                  className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">
                  Description / Scientific Objective
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief synopsis of core hypothesis, target dataset, and contribution goals..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1.5">
                    Target Publication Venue
                  </label>
                  <input
                    type="text"
                    value={newTargetVenue}
                    onChange={(e) => setNewTargetVenue(e.target.value)}
                    placeholder="e.g. CVPR 2027, NeurIPS, IEEE TPAMI"
                    className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1.5">
                    Target Submission Deadline
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              {/* Multi-Select Link to Library Papers */}
              {availablePapers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <FileText size={13} className="text-accent" />
                      Link to Library Papers (Optional - Multi-Select)
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-text-tertiary">
                        {selectedPaperIds.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPaperIds.length === availablePapers.length) {
                            setSelectedPaperIds([])
                          } else {
                            setSelectedPaperIds(availablePapers.map((p) => p.id))
                          }
                        }}
                        className="text-accent hover:underline font-mono"
                      >
                        {selectedPaperIds.length === availablePapers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                    {availablePapers.map((p) => {
                      const isChecked = selectedPaperIds.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-2.5 p-1.5 rounded hover:bg-bg-tertiary transition-colors cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaperIds([...selectedPaperIds, p.id])
                              } else {
                                setSelectedPaperIds(selectedPaperIds.filter((id) => id !== p.id))
                              }
                            }}
                            className="accent-accent rounded mt-0.5"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary block truncate">
                              {p.title}
                            </span>
                            {p.authors && (
                              <span className="text-[11px] text-text-tertiary block truncate">
                                {p.authors}
                              </span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Multi-Target Sharing Section (Individual Students/Peers, Labs, Sub-Groups) */}
              <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Share2 size={13} className="text-accent" />
                    Share / Distribute Tracker With
                  </label>

                  {/* 2 Type Sharing Permission Selector: View Only vs Edit & Comment */}
                  <div className="flex items-center gap-1 bg-bg-primary p-0.5 rounded-lg border border-border-default">
                    <button
                      type="button"
                      onClick={() => setSharePermission('COLLABORATE')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        sharePermission === 'COLLABORATE'
                          ? 'bg-accent text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      ✏️ Edit &amp; Comment
                    </button>
                    <button
                      type="button"
                      onClick={() => setSharePermission('VIEW')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        sharePermission === 'VIEW'
                          ? 'bg-accent text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      👁️ View Only
                    </button>
                  </div>
                </div>

                {/* Target Scope Switcher */}
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
                    <GraduationCap size={13} /> {isSupervisor ? 'Supervised Students' : 'Peer Students'} ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('LAB')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      targetType === 'LAB'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Building size={13} /> Research Labs ({labs.length})
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
                    <Users size={13} /> Sub-Group Clusters
                  </button>
                </div>

                  {/* Individual Students Checkbox List */}
                  {targetType === 'INDIVIDUAL' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                        <span>Select student researchers:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedStudentIds.length === students.length) {
                              setSelectedStudentIds([])
                            } else {
                              setSelectedStudentIds(students.map((s) => s.id))
                            }
                          }}
                          className="text-accent hover:underline font-mono"
                        >
                          {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                        {students.map((s) => (
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
                      <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                        {labs.map((l) => (
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

                  {/* Research Sub-Groups Checkbox List */}
                  {targetType === 'GROUP' && (
                    <div className="space-y-2">
                      <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-bg-primary border border-border-default">
                        {labs.flatMap((l) =>
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
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={creating}
                  icon={<Sparkles size={14} />}
                >
                  Initialize Tracker
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
