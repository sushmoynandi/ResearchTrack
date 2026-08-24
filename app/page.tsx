'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  BookOpen,
  CheckCircle2,
  Star,
  FolderOpen,
  Tags,
  MessageSquare,
  ArrowRight,
  Plus,
  Flame,
  Percent,
  Clock,
  Sparkles,
  Users,
  GraduationCap,
  Building,
  ShieldCheck,
  ClipboardList,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { PaperRow } from '@/components/papers/PaperRow'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LabReadingVelocityWidget } from '@/components/analytics/LabReadingVelocityWidget'
import { StudentContributionHeatmap } from '@/components/analytics/StudentContributionHeatmap'
import { SupervisionRequestBanner } from '@/components/dashboard/SupervisionRequestBanner'
import { useAuth } from '@/components/auth/AuthProvider'
import { LandingPage } from '@/components/landing/LandingPage'
import type { Paper } from '@/lib/types'

interface DashboardData {
  systemRole?: 'STUDENT' | 'SUPERVISOR' | 'ADMIN'
  totalPapers: number
  toRead: number
  reading: number
  completed: number
  archived: number
  favorites: number
  totalNotes: number
  totalCollections: number
  totalTags: number
  recentPapers: (Paper & { _count?: { notes: number } })[]
  tagDistribution: { id: string; name: string; count: number }[]
  topCollections: { id: string; name: string; color: string | null; count: number }[]
  completionRate: number
  totalAssignedPapers?: number
  completedAssignedPapers?: number
  readingAssignedPapers?: number
  pendingAssignedPapers?: number
  assignedCompletionRate?: number
  activeLabTasks?: number
  completedLabTasks?: number
  labTasks?: any[]
  upcomingMeeting?: {
    id: string
    title: string
    scheduledAt: string
    supervisorNotes?: string | null
    supervisor?: { id: string; name: string; email: string }
  } | null
  totalMilestones?: number
  completedMilestones?: number
  myAssignments?: any[]
  pendingAssignments?: any[]
  supervisedStudents?: any[]
  issuedAssignments?: any[]
  supervisor?: {
    id: string
    name: string
    email: string
    institution?: string | null
    department?: string | null
  } | null
  recentNotifications?: {
    id: string
    title: string
    message: string
    type: string
    link?: string | null
    createdAt: string
  }[]
}

/**
 * "/" shows one of two pages: the public landing page for a visitor who isn't
 * signed in, and the dashboard for everyone who is. AppShell knows about this
 * too — it leaves signed-out visitors here instead of sending them to /login.
 */
export default function HomePage() {
  const { signedOut } = useAuth()

  if (signedOut) return <LandingPage />

  return <DashboardPage />
}

function DashboardPage() {
  const router = useRouter()
  const { user, isStudent, isSupervisor, isAdmin } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      router.replace('/admin/users')
    }
  }, [isAdmin, router])

  useEffect(() => {
    if (isAdmin) return
    async function loadStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const stats = await res.json()
          if (isStudent) {
            const [assignmentsRes, notificationsRes] = await Promise.all([
              fetch('/api/assignments?status=PENDING'),
              fetch('/api/notifications'),
            ])
            const assignments = assignmentsRes.ok ? await assignmentsRes.json() : []
            const notificationsPayload = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] }
            stats.pendingAssignments = assignments
            stats.recentNotifications = (notificationsPayload.notifications || []).slice(0, 4)
          }
          setData(stats)
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [isAdmin, isStudent])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton variant="rect" height="60px" width="300px" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="120px" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="card" height="250px" className="md:col-span-2" />
          <Skeleton variant="card" height="250px" />
        </div>
      </div>
    )
  }

  const stats = data || {
    totalPapers: 0,
    toRead: 0,
    reading: 0,
    completed: 0,
    archived: 0,
    favorites: 0,
    totalNotes: 0,
    totalCollections: 0,
    totalTags: 0,
    recentPapers: [],
    tagDistribution: [],
    topCollections: [],
    completionRate: 0,
    myAssignments: [],
    pendingAssignments: [],
    supervisedStudents: [],
    issuedAssignments: [],
    supervisor: null,
    recentNotifications: [],
  }

  const roleBadgeColor = isAdmin
    ? 'bg-red-500/10 text-red-500 border-red-500/30'
    : isSupervisor
    ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
    : 'bg-blue-500/10 text-blue-500 border-blue-500/30'

  const roleTitle = isAdmin
    ? 'System Administrator'
    : isSupervisor
    ? 'Supervisor & Faculty Portal'
    : 'Student Research Workspace'

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card border-border-default/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className={`px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-md border ${roleBadgeColor}`}>
              {user?.systemRole || 'STUDENT'}
            </span>
            <span className="text-xs text-text-tertiary">
              {user?.department ? `${user.department} · ` : ''}{user?.institution || 'Academic Lab'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            Welcome back, {user?.name || 'Researcher'}
          </h2>
          <p className="text-xs text-text-secondary">
            {roleTitle} — Review literature, track reading goals, and annotate contributions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/papers/new">
            <Button icon={<Plus size={16} />}>Add Paper</Button>
          </Link>
          {isSupervisor && (
            <Link href="/assignments">
              <Button variant="secondary" icon={<ClipboardList size={16} />}>
                Assign Paper
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/users">
              <Button variant="secondary" icon={<ShieldCheck size={16} />}>
                Manage Users
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ─── ROLE-SPECIFIC SECTIONS ─── */}

      {/* 1. SUPERVISOR VIEW: Supervised Students Roster & Review Queue */}
      {isSupervisor && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 font-display">
              <Users size={18} className="text-purple-500" /> Supervised Students
            </h3>
            <Link href="/students" className="text-xs text-accent hover:underline flex items-center gap-1">
              View All Students <ChevronRight size={14} />
            </Link>
          </div>

          {stats.supervisedStudents && stats.supervisedStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.supervisedStudents.map((s: any) => (
                <Link key={s.id} href={`/papers?studentId=${s.id}`} className="glass-card p-4 hover:border-purple-500/40 transition-all block group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 font-bold flex items-center justify-center text-sm shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate group-hover:text-purple-400 transition-colors">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-text-tertiary truncate">
                        {s.department || 'Researcher'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-default text-center">
                    <div>
                      <p className="text-[10px] text-text-tertiary">Papers</p>
                      <p className="text-xs font-bold text-text-primary">{s._count.papers}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary">Notes</p>
                      <p className="text-xs font-bold text-text-primary">{s._count.notes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary">Assigned</p>
                      <p className="text-xs font-bold text-purple-400">{s._count.assignedPapers}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center text-xs text-text-tertiary">
              No students assigned yet. Contact your administrator or view the student directory.
            </div>
          )}
        </div>
      )}

      {/* 2. Student advisor context, performance scorecard, pending work, and recent feedback */}
      {isStudent && (
        <div className="space-y-6">
          {/* Supervision Request Invitation Banner (Accept / Reject) */}
          <SupervisionRequestBanner onRequestResolved={() => window.location.reload()} />

          {/* Synchronized Performance Scorecard for Student Researcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2 font-display">
                <GraduationCap size={18} className="text-purple-400" /> Research &amp; Lab Performance
              </h3>
              <span className="text-xs text-text-tertiary">
                Synced with Advisor: <strong>{stats.supervisor?.name || 'Faculty Mentor'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Pillar 1: Assigned Paper Reading */}
              <Link href="/assignments" className="p-4 rounded-2xl glass-card space-y-2 hover:border-purple-500/40 transition-all block group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <BookOpen size={13} className="text-purple-400" /> Assigned Reading
                  </span>
                  <span className="font-mono text-purple-400 font-bold">{stats.assignedCompletionRate || 0}%</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${stats.assignedCompletionRate || 0}%` }} />
                </div>
                <p className="text-[11px] text-text-tertiary font-mono">
                  {stats.completedAssignedPapers || 0} of {stats.totalAssignedPapers || 0} read · {stats.pendingAssignedPapers || 0} pending
                </p>
              </Link>

              {/* Pillar 2: Total Library Literature */}
              <Link href="/papers" className="p-4 rounded-2xl glass-card space-y-2 hover:border-success/40 transition-all block group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <TrendingUp size={13} className="text-success" /> Library Read
                  </span>
                  <span className="font-mono text-success font-bold">{stats.completionRate || 0}%</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-success h-full rounded-full transition-all" style={{ width: `${stats.completionRate || 0}%` }} />
                </div>
                <p className="text-[11px] text-text-tertiary font-mono">
                  {stats.completed} of {stats.totalPapers} cataloged · {stats.totalNotes} notes
                </p>
              </Link>

              {/* Pillar 3: Active Lab Deliverables */}
              <Link href="/labs" className="p-4 rounded-2xl glass-card space-y-2 hover:border-accent/40 transition-all block group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-accent" /> Lab Tasks
                  </span>
                  <span className="font-mono text-accent font-bold">{stats.activeLabTasks || 0} Active</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${stats.activeLabTasks ? 60 : 100}%` }} />
                </div>
                <p className="text-[11px] text-text-tertiary font-mono">
                  {stats.completedLabTasks || 0} deliverables completed
                </p>
              </Link>

              {/* Pillar 4: Thesis Milestones */}
              <Link href="/milestones" className="p-4 rounded-2xl glass-card space-y-2 hover:border-amber-500/40 transition-all block group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <Trophy size={13} className="text-amber-400" /> Milestones
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{stats.completedMilestones || 0} / {stats.totalMilestones || 0}</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${stats.totalMilestones ? Math.round(((stats.completedMilestones || 0) / stats.totalMilestones) * 100) : 0}%` }} />
                </div>
                <p className="text-[11px] text-text-tertiary font-mono">
                  {stats.completedMilestones || 0} approved deliverables
                </p>
              </Link>
            </div>
          </div>

          {/* Upcoming 1-on-1 Research Meeting Banner (if scheduled) */}
          {stats.upcomingMeeting && (
            <div className="p-4 rounded-2xl bg-linear-to-r from-purple-950/40 via-bg-secondary to-accent/10 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <Calendar size={10} /> Upcoming 1-on-1 Sync
                  </span>
                  <span className="text-xs font-semibold text-text-primary">
                    {stats.upcomingMeeting.title}
                  </span>
                </div>
                {stats.upcomingMeeting.supervisorNotes && (
                  <p className="text-xs text-text-secondary line-clamp-1 italic">
                    Agenda: {stats.upcomingMeeting.supervisorNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right text-xs font-mono">
                  <span className="text-accent font-semibold block">
                    {new Date(stats.upcomingMeeting.scheduledAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Link href="/meetings">
                  <Button size="xs" variant="secondary" icon={<ArrowRight size={12} />}>
                    Open Sync
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-4 border-l-4 border-l-purple-500 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-purple-400">Supervisor Contact</p>
              <p className="text-sm font-semibold text-text-primary">{stats.supervisor?.name || 'Supervisor not assigned'}</p>
              {stats.supervisor?.email && <p className="text-xs text-text-secondary">{stats.supervisor.email}</p>}
              {stats.supervisor?.department && <p className="text-[11px] text-text-tertiary">{stats.supervisor.department}</p>}
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.pendingAssignments && stats.pendingAssignments.length > 0 ? (
                stats.pendingAssignments.map((a: any) => (
                  <div key={a.id} className="glass-card p-4 border-l-4 border-l-blue-500 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                        <span>Assigned by {a.assignedBy.name}</span>
                        <Badge variant="info" size="sm">PENDING</Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary hover:text-accent transition-colors line-clamp-1">
                        <Link href={`/papers/${a.paper.slug || a.paper.id}`}>{a.paper.title}</Link>
                      </h4>
                      <p className="text-xs text-text-secondary line-clamp-1">{a.paper.authors}</p>
                    </div>
                    {a.dueDate && (
                      <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                        <Calendar size={12} className="text-accent" />
                        <span>Due {new Date(a.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="glass-card p-4 text-xs text-text-tertiary flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" /> No pending supervisor assignments.
                </div>
              )}
            </div>
          </div>

          {stats.recentNotifications && stats.recentNotifications.length > 0 ? (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-accent" /> Recent Supervisor Feedback &amp; Updates
                </p>
                <span className="text-[10px] text-text-tertiary">
                  {stats.recentNotifications.length} updates
                </span>
              </div>

              <div className="space-y-2 divide-y divide-border-default/60">
                {stats.recentNotifications.map((notification) => {
                  const Content = (
                    <div
                      key={notification.id}
                      className="flex items-start justify-between gap-3 text-xs pt-2.5 first:pt-0 hover:bg-bg-tertiary/40 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary truncate">{notification.title}</p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-mono shrink-0">
                            {notification.type || 'UPDATE'}
                          </span>
                        </div>
                        <p className="text-text-secondary text-[11px] line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-mono text-text-tertiary whitespace-nowrap">
                        {new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )

                  return notification.link ? (
                    <Link key={notification.id} href={notification.link} className="block">
                      {Content}
                    </Link>
                  ) : (
                    <div key={notification.id}>{Content}</div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 text-xs text-text-tertiary flex items-center gap-2">
              <MessageSquare size={14} className="text-text-tertiary" />
              <span>No recent supervisor feedback or updates yet.</span>
            </div>
          )}

          {/* 🌟 Student Research Contribution Heatmap & Activity (GitHub Style) */}
          <StudentContributionHeatmap />
        </div>
      )}

      {/* Lab Reading Velocity & Research Topic Cluster Map */}
      <LabReadingVelocityWidget />

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {/* Total Papers */}
        <Link href="/papers" className="block group">
          <div className="glass-card p-5 group-hover:border-accent/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {isSupervisor ? 'Lab Library' : 'My Library'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <FileText size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-display">
              {stats.totalPapers}
            </p>
            <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
              <span>{stats.completed} read</span>
              <span>·</span>
              <span>{stats.reading} in progress</span>
            </p>
          </div>
        </Link>

        {/* Reading Queue */}
        <Link href="/papers?status=READING" className="block group">
          <div className="glass-card p-5 group-hover:border-warning/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Active Reading
              </span>
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                <BookOpen size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-display">
              {stats.reading}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {stats.toRead} queued to read
            </p>
          </div>
        </Link>

        {/* Reading Completion Rate */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <Percent size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-text-primary font-display">
            {stats.completionRate}%
          </p>
          <div className="w-full bg-bg-tertiary h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-success h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Notes & Annotations */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Research Notes
            </span>
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info">
              <MessageSquare size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-text-primary font-display">
            {stats.totalNotes}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Across {stats.totalCollections} collections
          </p>
        </div>
      </div>

      {/* Main Content Layout: Recent Papers & Taxonomy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Papers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 font-display">
              <Clock size={18} className="text-accent" /> Recently Updated Literature
            </h3>
            <Link
              href="/papers"
              className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
            >
              View Full Library <ArrowRight size={13} />
            </Link>
          </div>

          {stats.recentPapers && stats.recentPapers.length > 0 ? (
            <div className="glass-card divide-y divide-border-default overflow-hidden">
              {stats.recentPapers.map((paper) => (
                <PaperRow key={paper.id} paper={paper} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h4 className="text-sm font-semibold text-text-primary">
                Your Library is Empty
              </h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Begin by adding papers via arXiv ID, DOI, or manual entry.
              </p>
              <Link href="/papers/new" className="inline-block pt-2">
                <Button size="sm" icon={<Plus size={14} />}>
                  Add Your First Paper
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right 1 Col: Collections & Topic Tags */}
        <div className="space-y-6">
          {/* Top Collections */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-display">
                <FolderOpen size={14} className="text-accent" /> Collections
              </h4>
              <Link
                href="/collections"
                className="text-[11px] text-accent hover:underline"
              >
                Manage
              </Link>
            </div>

            {stats.topCollections && stats.topCollections.length > 0 ? (
              <div className="space-y-2">
                {stats.topCollections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/papers?collection=${col.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-xs text-text-secondary hover:text-text-primary group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.color || '#06b6d4' }}
                      />
                      <span className="truncate font-medium">{col.name}</span>
                    </div>
                    <span className="text-[11px] text-text-tertiary bg-bg-primary px-1.5 py-0.5 rounded group-hover:bg-bg-secondary">
                      {col.count}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-4">
                No collections created yet
              </p>
            )}
          </div>

          {/* Research Topic Tags */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Tags size={14} className="text-accent" /> Research Topics
              </h4>
              <Link
                href="/tags"
                className="text-[11px] text-accent hover:underline"
              >
                All Tags
              </Link>
            </div>

            {stats.tagDistribution && stats.tagDistribution.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {stats.tagDistribution.map((t) => (
                  <Link key={t.id} href={`/papers?tag=${encodeURIComponent(t.name)}`}>
                    <Badge variant="default" size="sm" className="hover:border-accent/40 cursor-pointer">
                      #{t.name} <span className="text-text-tertiary text-[10px] ml-1">({t.count})</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-4">
                No tags added yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
