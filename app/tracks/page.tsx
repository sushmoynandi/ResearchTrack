'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Milestone,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  GraduationCap,
  Plus,
  Compass,
  Trophy,
  Flame,
  User,
  Users,
  Play,
  RotateCcw,
  Check,
  FileText,
  Highlighter,
  ExternalLink,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import type { Paper, Status } from '@/lib/types'

interface SupervisedStudent {
  id: string
  name: string
  email: string
  department?: string
  metrics?: {
    totalPapers: number
    completedPapers: number
    readingPapers: number
    toReadPapers: number
  }
}

export default function ReadingTracksPage() {
  const { user, isSupervisor, isAdmin, isStudent } = useAuth()
  const { addToast } = useToast()

  const [papers, setPapers] = useState<Paper[]>([])
  const [students, setStudents] = useState<SupervisedStudent[]>([])
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all')
  const [activeLaneTab, setActiveLaneTab] = useState<'all' | 'READING' | 'TO_READ' | 'COMPLETED'>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // 1. Fetch Papers
  const fetchPapers = useCallback(async () => {
    try {
      let url = '/api/papers'
      if (selectedStudentFilter !== 'all' && selectedStudentFilter !== 'own') {
        url += `?studentId=${selectedStudentFilter}`
      } else if (selectedStudentFilter === 'own') {
        url += `?scope=own`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPapers(data)
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false)
    }
  }, [selectedStudentFilter])

  // 2. Fetch Supervised Students if Supervisor or Admin
  useEffect(() => {
    if (isSupervisor || isAdmin) {
      fetch('/api/students')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setStudents(data))
        .catch(() => {})
    }
  }, [isSupervisor, isAdmin])

  useEffect(() => {
    fetchPapers()
  }, [fetchPapers])

  // 3. Status Transition Handler (1-Click Real-Time Sync)
  const handleUpdateStatus = async (paperId: string, newStatus: Status) => {
    setUpdatingId(paperId)
    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setPapers((prev) =>
          prev.map((p) => (p.id === paperId ? { ...p, status: newStatus } : p))
        )
        addToast(
          'success',
          newStatus === 'READING'
            ? '🔥 Started reading! Track synced in real-time.'
            : newStatus === 'COMPLETED'
            ? '🎓 Paper marked as Finished! Supervisor notified.'
            : 'Moved back to Reading Queue'
        )
      } else {
        addToast('error', 'Failed to update reading status')
      }
    } catch {
      addToast('error', 'Network error updating track')
    } finally {
      setUpdatingId(null)
    }
  }

  // 4. Computed Reading Lanes
  const readingPapers = useMemo(
    () => papers.filter((p) => p.status === 'READING'),
    [papers]
  )
  const toReadPapers = useMemo(
    () => papers.filter((p) => p.status === 'TO_READ'),
    [papers]
  )
  const completedPapers = useMemo(
    () => papers.filter((p) => p.status === 'COMPLETED'),
    [papers]
  )

  const completionRate =
    papers.length > 0 ? Math.round((completedPapers.length / papers.length) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="p-6 glass-card border-border-default/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
              <Milestone size={13} /> Live Reading Station
            </span>
            <span className="text-xs text-text-tertiary">
              • Bidirectionally Synced (Student ↔ Supervisor)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            Active Reading Tracks &amp; Literature Flow
          </h2>
          <p className="text-xs text-text-secondary">
            {isSupervisor
              ? "Monitor what your research students are reading right now, track completion velocity, and review literature synthesis."
              : "Track your active reading stream, line up upcoming papers, and certify completed literature reviews."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/papers/new">
            <Button size="sm" variant="primary" icon={<Plus size={14} />}>
              Add Paper to Track
            </Button>
          </Link>
        </div>
      </div>

      {/* Supervisor Student Cohort Filter Bar */}
      {(isSupervisor || isAdmin) && students.length > 0 && (
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Users size={15} className="text-purple-400" />
            <span className="font-semibold text-text-primary">Filter Student Cohort:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStudentFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                selectedStudentFilter === 'all'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
            >
              All Supervised Students ({students.length})
            </button>

            {students.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStudentFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedStudentFilter === st.id
                    ? 'bg-accent text-white font-bold shadow-sm'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                }`}
              >
                <User size={12} />
                <span>{st.name}</span>
                {st.metrics && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono">
                    {st.metrics.readingPapers} reading
                  </span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedStudentFilter('own')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                selectedStudentFilter === 'own'
                  ? 'bg-accent text-white font-bold shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
            >
              My Own Papers
            </button>
          </div>
        </div>
      )}

      {/* Live Track Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Currently Reading</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-400 font-display flex items-center gap-1.5">
            <Flame size={20} /> {readingPapers.length}
          </p>
          <p className="text-[10px] text-text-tertiary">Active in Reader workspace</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-text-tertiary block">Queued to Read</span>
          <p className="text-2xl font-bold text-text-primary font-display flex items-center gap-1.5">
            <Clock size={20} className="text-cyan-400" /> {toReadPapers.length}
          </p>
          <p className="text-[10px] text-text-tertiary">Next in literature pipeline</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-text-tertiary block">Fully Synthesized</span>
          <p className="text-2xl font-bold text-emerald-400 font-display flex items-center gap-1.5">
            <CheckCircle2 size={20} /> {completedPapers.length}
          </p>
          <p className="text-[10px] text-text-tertiary">Notes &amp; matrix completed</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-text-tertiary block">Completion Velocity</span>
          <p className="text-2xl font-bold text-purple-400 font-display flex items-center gap-1.5">
            <TrendingUp size={20} /> {completionRate}%
          </p>
          <p className="text-[10px] text-text-tertiary">
            {completedPapers.length} of {papers.length} total papers
          </p>
        </div>
      </div>

      {/* Lane Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-default text-xs font-semibold overflow-x-auto whitespace-nowrap min-w-0">
        <button
          type="button"
          onClick={() => setActiveLaneTab('all')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg cursor-pointer transition-all ${
            activeLaneTab === 'all'
              ? 'bg-bg-elevated text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          All Reading Lanes ({papers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveLaneTab('READING')}
          className={`flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeLaneTab === 'READING'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold shadow-sm'
              : 'text-amber-400/70 hover:text-amber-400'
          }`}
        >
          <Flame size={14} /> Currently Reading ({readingPapers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveLaneTab('TO_READ')}
          className={`flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeLaneTab === 'TO_READ'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold shadow-sm'
              : 'text-cyan-400/70 hover:text-cyan-400'
          }`}
        >
          <Clock size={14} /> To-Read Queue ({toReadPapers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveLaneTab('COMPLETED')}
          className={`flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeLaneTab === 'COMPLETED'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm'
              : 'text-emerald-400/70 hover:text-emerald-400'
          }`}
        >
          <CheckCircle2 size={14} /> Finished &amp; Synthesized ({completedPapers.length})
        </button>
      </div>

      {/* Main Reading Tracks Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="140px" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-3">
          <BookOpen size={36} className="mx-auto opacity-30 text-accent" />
          <h3 className="text-sm font-bold text-text-primary">No papers in this track</h3>
          <p className="max-w-sm mx-auto">
            Add papers to your library or assign literature to students to start live tracking.
          </p>
          <Link href="/papers/new">
            <Button size="xs" variant="primary" icon={<Plus size={12} />}>
              Add Paper
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* LANE 1: Currently Reading */}
          {(activeLaneTab === 'all' || activeLaneTab === 'READING') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-base font-bold text-text-primary font-display">
                    🔥 Currently Reading Right Now ({readingPapers.length})
                  </h3>
                </div>
                <span className="text-xs text-text-tertiary">Active in Canvas Reader</span>
              </div>

              {readingPapers.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border-default text-center text-xs text-text-tertiary">
                  No papers currently in active reading. Select a paper from your queue to start reading.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readingPapers.map((paper) => (
                    <ReadingTrackPaperCard
                      key={paper.id}
                      paper={paper}
                      isUpdating={updatingId === paper.id}
                      onUpdateStatus={handleUpdateStatus}
                      isSupervisor={Boolean(isSupervisor || isAdmin)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LANE 2: To-Read Queue */}
          {(activeLaneTab === 'all' || activeLaneTab === 'TO_READ') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h3 className="text-base font-bold text-text-primary font-display">
                    ⏳ Upcoming Reading Queue ({toReadPapers.length})
                  </h3>
                </div>
                <span className="text-xs text-text-tertiary">Lined up for investigation</span>
              </div>

              {toReadPapers.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border-default text-center text-xs text-text-tertiary">
                  Queue is empty. Add new papers to build your research track.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toReadPapers.map((paper) => (
                    <ReadingTrackPaperCard
                      key={paper.id}
                      paper={paper}
                      isUpdating={updatingId === paper.id}
                      onUpdateStatus={handleUpdateStatus}
                      isSupervisor={Boolean(isSupervisor || isAdmin)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LANE 3: Finished & Synthesized */}
          {(activeLaneTab === 'all' || activeLaneTab === 'COMPLETED') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-base font-bold text-text-primary font-display">
                    🎓 Finished &amp; Synthesized ({completedPapers.length})
                  </h3>
                </div>
                <span className="text-xs text-text-tertiary">Ready for thesis / literature review</span>
              </div>

              {completedPapers.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border-default text-center text-xs text-text-tertiary">
                  No completed papers yet. Keep reading to build your bibliography!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedPapers.map((paper) => (
                    <ReadingTrackPaperCard
                      key={paper.id}
                      paper={paper}
                      isUpdating={updatingId === paper.id}
                      onUpdateStatus={handleUpdateStatus}
                      isSupervisor={Boolean(isSupervisor || isAdmin)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ReadingTrackCardProps {
  paper: Paper
  isUpdating: boolean
  onUpdateStatus: (id: string, newStatus: Status) => void
  isSupervisor: boolean
}

function ReadingTrackPaperCard({
  paper,
  isUpdating,
  onUpdateStatus,
  isSupervisor,
}: ReadingTrackCardProps) {
  const isReading = paper.status === 'READING'
  const isCompleted = paper.status === 'COMPLETED'
  const isToRead = paper.status === 'TO_READ'

  const activeAssignment = paper.assignments?.[0]

  return (
    <div
      className={`glass-card p-5 border transition-all space-y-3.5 relative flex flex-col justify-between ${
        isReading
          ? 'border-amber-500/40 bg-amber-500/5 shadow-md'
          : isCompleted
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-border-default hover:border-border-hover'
      }`}
    >
      {/* Top Meta Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={
              isReading
                ? 'warning'
                : isCompleted
                ? 'success'
                : 'default'
            }
            className="text-[10px] uppercase font-bold"
          >
            {isReading ? '🔥 READING NOW' : isCompleted ? '✅ COMPLETED' : '⏳ QUEUED'}
          </Badge>

          {paper.priority && (
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                paper.priority === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300'
                  : paper.priority === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-bg-tertiary text-text-tertiary'
              }`}
            >
              {paper.priority}
            </span>
          )}

          {paper.publicationYear && (
            <span className="text-[11px] font-mono text-text-tertiary">
              ({paper.publicationYear})
            </span>
          )}
        </div>

        {/* Assigned Student / Supervisor Banner */}
        {activeAssignment && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0 flex items-center gap-1">
            <GraduationCap size={11} />
            {isSupervisor
              ? `Student: ${activeAssignment.student?.name || 'Assigned'}`
              : `Assigned by: ${activeAssignment.assignedBy?.name || 'Faculty'}`}
          </span>
        )}
      </div>

      {/* Paper Title & Authors */}
      <div className="space-y-1">
        <Link
          href={`/papers/${paper.slug || paper.id}`}
          className="text-sm font-bold text-text-primary hover:text-accent font-display line-clamp-2 transition-colors"
        >
          {paper.title}
        </Link>
        <p className="text-xs text-text-secondary truncate">
          {paper.authors} {paper.journal ? `• ${paper.journal}` : ''}
        </p>
      </div>

      {/* Key Takeaways Digest Preview if available */}
      {(paper.problemSolved || paper.keyContribution) && (
        <div className="p-2.5 rounded-lg bg-bg-secondary/80 border border-border-default text-[11px] space-y-1 leading-relaxed">
          {paper.problemSolved && (
            <p className="text-text-secondary line-clamp-1">
              <strong className="text-text-primary">Problem:</strong> {paper.problemSolved}
            </p>
          )}
          {paper.keyContribution && (
            <p className="text-text-secondary line-clamp-1">
              <strong className="text-accent">Insight:</strong> {paper.keyContribution}
            </p>
          )}
        </div>
      )}

      {/* Bottom Action Row */}
      <div className="pt-2 border-t border-border-default flex items-center justify-between gap-2 text-xs">
        {/* Notes & Highlights Count */}
        <Link
          href={`/papers/${paper.id}/reader`}
          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors"
        >
          <Highlighter size={12} className="text-amber-400" />
          <span>{paper._count?.notes || paper.notes?.length || 0} Notes / Highlights</span>
        </Link>

        {/* 1-Click Status Controls */}
        <div className="flex items-center gap-1.5">
          {isToRead && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => onUpdateStatus(paper.id, 'READING')}
              loading={isUpdating}
              icon={<Play size={11} />}
            >
              Start Reading
            </Button>
          )}

          {isReading && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => onUpdateStatus(paper.id, 'COMPLETED')}
              loading={isUpdating}
              icon={<Check size={12} />}
            >
              Mark Finished
            </Button>
          )}

          {isCompleted && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onUpdateStatus(paper.id, 'READING')}
              loading={isUpdating}
              icon={<RotateCcw size={11} />}
              title="Move back to active reading"
            >
              Re-open
            </Button>
          )}

          <Link href={`/papers/${paper.id}/reader`}>
            <Button size="xs" variant="secondary" icon={<BookOpen size={12} />}>
              Reader
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
