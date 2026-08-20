'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Search,
  MessageSquare,
  Trash2,
  Edit3,
  ExternalLink,
  Cpu,
  Layers,
  ChevronRight,
  Flame,
  FileText,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { REPLICATION_LABELS, REPLICATION_COLORS } from '@/lib/types'

interface JournalClubSessionItem {
  id: string
  paperId: string
  presenterId: string
  scheduledAt: string
  status: string
  notes: string | null
  paper: {
    id: string
    title: string
    authors: string
    journal: string | null
    publicationYear: number | null
    abstract?: string | null
    doi?: string | null
    url?: string | null
    replicationStatus?: string | null
    architecture?: string | null
    parameters?: string | null
    tags?: { id: string; name: string; color?: string }[]
  }
  presenter: {
    id: string
    name: string
    email: string
    image?: string | null
    department?: string
    systemRole?: string
  }
}

interface JournalClubSectionProps {
  labId: string
  groupId: string
  groupName: string
  groupMembers: { id: string; user: { id: string; name: string; email: string; systemRole?: string; department?: string } }[]
  isLeadOrSupervisor: boolean
}

type FilterTab = 'ALL' | 'UPCOMING' | 'COMPLETED'

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
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [availablePapers, setAvailablePapers] = useState<any[]>([])
  const [paperSearch, setPaperSearch] = useState('')
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [selectedPresenterId, setSelectedPresenterId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit / Notes Modal State
  const [editingSession, setEditingSession] = useState<JournalClubSessionItem | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStatus, setEditStatus] = useState('SCHEDULED')
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`)
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) {
      setLoading(true)
      fetchSessions()
    }
  }, [groupId])

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true)
    try {
      const res = await fetch('/api/papers?_t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        const papersList = Array.isArray(data) ? data : []
        setAvailablePapers(papersList)
        if (papersList.length > 0 && !selectedPaperId) {
          setSelectedPaperId(papersList[0].id)
        }
      }
      if (groupMembers.length > 0 && !selectedPresenterId) {
        setSelectedPresenterId(groupMembers[0].user.id)
      }
    } catch {
      // silent
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaperId || !selectedPresenterId || !scheduledAt) {
      addToast('error', 'Please select a paper, presenter, and date.')
      return
    }
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
        setIsCreateModalOpen(false)
        setSessionNotes('')
        setScheduledAt('')
        fetchSessions()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to schedule seminar')
      }
    } catch {
      addToast('error', 'Network error scheduling seminar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusToggle = async (sessionId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'SCHEDULED' : 'COMPLETED'
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: nextStatus }),
      })
      if (res.ok) {
        addToast('success', `Session marked as ${nextStatus.toLowerCase()}`)
        fetchSessions()
      }
    } catch {
      addToast('error', 'Failed to update status')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel and remove this seminar session?')) return

    try {
      const res = await fetch(
        `/api/labs/${labId}/groups/${groupId}/journal-club?sessionId=${sessionId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        addToast('success', 'Seminar session removed')
        fetchSessions()
      } else {
        addToast('error', 'Failed to remove session')
      }
    } catch {
      addToast('error', 'Network error removing session')
    }
  }

  const handleOpenEditModal = (s: JournalClubSessionItem) => {
    setEditingSession(s)
    setEditNotes(s.notes || '')
    setEditDate(s.scheduledAt ? new Date(s.scheduledAt).toISOString().split('T')[0] : '')
    setEditStatus(s.status)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSession) return

    setIsUpdating(true)
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/journal-club`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: editingSession.id,
          notes: editNotes,
          scheduledAt: editDate || undefined,
          status: editStatus,
        }),
      })

      if (res.ok) {
        addToast('success', 'Updated seminar details')
        setEditingSession(null)
        fetchSessions()
      } else {
        addToast('error', 'Failed to update seminar')
      }
    } catch {
      addToast('error', 'Network error updating seminar')
    } finally {
      setIsUpdating(false)
    }
  }

  // Quick Date Preset helper
  const setDatePreset = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    setScheduledAt(d.toISOString().split('T')[0])
  }

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const isCompleted = s.status === 'COMPLETED'
      if (activeTab === 'UPCOMING' && isCompleted) return false
      if (activeTab === 'COMPLETED' && !isCompleted) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = s.paper?.title?.toLowerCase().includes(query)
        const matchesPresenter = s.presenter?.name?.toLowerCase().includes(query)
        const matchesNotes = s.notes?.toLowerCase().includes(query)
        const matchesVenue = s.paper?.journal?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesPresenter && !matchesNotes && !matchesVenue) return false
      }
      return true
    })
  }, [sessions, activeTab, searchQuery])

  // Stats
  const totalCount = sessions.length
  const upcomingCount = sessions.filter((s) => s.status !== 'COMPLETED').length
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length
  const uniquePresenters = new Set(sessions.map((s) => s.presenterId)).size

  return (
    <div className="glass-card p-6 md:p-8 space-y-6 border-border-default shadow-lg">
      {/* ─── Header & Seminar Overview ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg md:text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <Sparkles size={20} className="text-accent" /> {groupName} Journal Club &amp; Seminars
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
              Interactive Seminar Suite
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Structured peer presentations, systematic literature breakdowns, and faculty critique.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isLeadOrSupervisor && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenCreateModal}
              icon={<Plus size={14} />}
            >
              Schedule Seminar
            </Button>
          )}
        </div>
      </div>

      {/* ─── Metric KPI Stats Bar ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Total Seminars
          </span>
          <p className="text-2xl font-bold text-text-primary font-display">{totalCount}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Flame size={12} /> Upcoming / Live
          </span>
          <p className="text-2xl font-bold text-amber-400 font-display">{upcomingCount}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> Completed
          </span>
          <p className="text-2xl font-bold text-emerald-400 font-display">{completedCount}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
            <User size={12} /> Presenters
          </span>
          <p className="text-2xl font-bold text-accent font-display">{uniquePresenters}</p>
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-secondary border border-border-default text-xs w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-accent text-bg-primary font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'UPCOMING'
                ? 'bg-accent text-bg-primary font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            Upcoming &amp; Live ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'COMPLETED'
                ? 'bg-accent text-bg-primary font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            Completed Archive ({completedCount})
          </button>
        </div>

        {/* Quick Search */}
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search seminars, papers, or presenters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
      </div>

      {/* ─── Seminar Schedule List ─── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-tertiary space-y-2">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading journal club presentations...</p>
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {filteredSessions.map((s) => {
            const isCompleted = s.status === 'COMPLETED'
            const sessionDate = new Date(s.scheduledAt)
            const isToday = new Date().toDateString() === sessionDate.toDateString()

            return (
              <div
                key={s.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col space-y-4 ${
                  isCompleted
                    ? 'bg-bg-secondary/60 border-border-default/80 opacity-80'
                    : isToday
                    ? 'bg-bg-secondary border-amber-500/50 shadow-md shadow-amber-500/5'
                    : 'bg-bg-secondary border-border-default hover:border-accent/50'
                }`}
              >
                {/* Top Row: Date Pill + Status + Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-bg-tertiary text-accent border border-border-default flex items-center gap-1.5">
                      <Calendar size={12} />
                      {sessionDate.toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    {isToday && !isCompleted && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                        <Flame size={11} /> LIVE SEMINAR TODAY
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {isCompleted ? 'COMPLETED' : 'SCHEDULED'}
                    </span>
                  </div>

                  {/* Presenter Pill */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-bg-tertiary border border-border-default text-xs">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-[10px] flex items-center justify-center">
                      {s.presenter.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-text-secondary">
                      Presenter: <strong className="text-text-primary">{s.presenter.name}</strong>
                    </span>
                    {s.presenter.department && (
                      <span className="text-[10px] text-text-tertiary font-mono hidden sm:inline">
                        ({s.presenter.department})
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Paper Information */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/papers/${s.paper.id}`}
                      className="text-base font-bold text-text-primary hover:text-accent transition-colors block line-clamp-2"
                    >
                      {s.paper.title}
                    </Link>
                  </div>

                  <p className="text-xs text-text-secondary line-clamp-1">
                    {s.paper.authors}
                    {s.paper.journal && <span className="text-text-tertiary"> · {s.paper.journal}</span>}
                    {s.paper.publicationYear && (
                      <span className="text-text-tertiary"> · {s.paper.publicationYear}</span>
                    )}
                  </p>

                  {/* Paper Meta Badges */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {s.paper.replicationStatus && s.paper.replicationStatus !== 'UNTESTED' && (
                      <Badge
                        variant={REPLICATION_COLORS[s.paper.replicationStatus as keyof typeof REPLICATION_COLORS] as any}
                        size="sm"
                      >
                        {REPLICATION_LABELS[s.paper.replicationStatus as keyof typeof REPLICATION_LABELS]}
                      </Badge>
                    )}
                    {s.paper.architecture && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-bg-tertiary text-accent border border-border-default">
                        <Cpu size={11} /> {s.paper.architecture}
                      </span>
                    )}
                    {s.paper.parameters && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg-elevated text-text-secondary">
                        {s.paper.parameters}
                      </span>
                    )}
                    {s.paper.tags?.map((t) => (
                      <span
                        key={t.id}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-tertiary text-text-tertiary border border-border-default"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>

                  {/* Discussion Prep Notes */}
                  {s.notes && (
                    <div className="p-3 rounded-xl bg-bg-tertiary/70 border border-border-default/60 text-xs text-text-secondary space-y-1">
                      <div className="flex items-center justify-between text-text-tertiary text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} className="text-accent" /> Seminar Focus &amp; Pre-Reading Guidance:
                        </span>
                      </div>
                      <p className="italic text-text-secondary whitespace-pre-wrap">{s.notes}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-default/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Presentation Launcher */}
                    <Link href={`/papers/${s.paper.id}/present`}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Play size={13} fill="currentColor" />}
                        className="shadow-xs"
                      >
                        Launch Presentation Mode
                      </Button>
                    </Link>

                    {/* Paper Workspace Link */}
                    <Link href={`/papers/${s.paper.id}`}>
                      <Button size="sm" variant="secondary" icon={<BookOpen size={13} />}>
                        Paper Workspace
                      </Button>
                    </Link>
                  </div>

                  {/* Management & Status Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Edit Notes & Details */}
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleOpenEditModal(s)}
                      icon={<Edit3 size={12} />}
                      title="Edit Seminar Notes / Schedule"
                    >
                      Edit Details
                    </Button>

                    {/* Mark Completed Toggle */}
                    {isLeadOrSupervisor && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleStatusToggle(s.id, s.status)}
                        icon={<CheckCircle2 size={12} className={isCompleted ? 'text-text-tertiary' : 'text-emerald-400'} />}
                      >
                        {isCompleted ? 'Re-open' : 'Mark Done'}
                      </Button>
                    )}

                    {/* Cancel / Delete */}
                    {isLeadOrSupervisor && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleDeleteSession(s.id)}
                        icon={<Trash2 size={12} className="text-rose-400" />}
                        title="Cancel Seminar Session"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-text-tertiary space-y-3 glass-card border border-dashed border-border-default rounded-2xl">
          <Calendar size={32} className="mx-auto opacity-30 text-accent" />
          <p className="text-sm font-semibold text-text-secondary">
            {searchQuery ? 'No seminars matching your search criteria.' : 'No journal club seminars scheduled yet.'}
          </p>
          <p className="text-xs text-text-tertiary max-w-md mx-auto">
            Schedule regular rotational peer presentations to build deep literature synthesis and collective research expertise.
          </p>
          {isLeadOrSupervisor && !searchQuery && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenCreateModal}
              icon={<Plus size={13} />}
              className="mt-2"
            >
              Schedule First Seminar
            </Button>
          )}
        </div>
      )}

      {/* ─── Schedule Seminar Modal ─── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={`Schedule Journal Club Seminar: ${groupName}`}
          description="Assign a literature paper, designated student presenter, presentation date, and seminar focus."
          size="lg"
        >
          <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
            {/* Paper Selector with Search */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary">
                1. Select Paper to Present *
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter papers by title..."
                  value={paperSearch}
                  onChange={(e) => setPaperSearch(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent mb-2"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border-default rounded-xl p-2 bg-bg-secondary">
                {availablePapers
                  .filter((p) => !paperSearch || p.title.toLowerCase().includes(paperSearch.toLowerCase()))
                  .map((p) => {
                    const isSelected = selectedPaperId === p.id
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPaperId(p.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-accent/15 border-accent text-text-primary font-bold shadow-xs'
                            : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:border-accent/40'
                        }`}
                      >
                        <p className="line-clamp-1">{p.title}</p>
                        <p className="text-[10px] text-text-tertiary line-clamp-1 mt-0.5">{p.authors}</p>
                      </div>
                    )
                  })}
                {availablePapers.length === 0 && (
                  <p className="text-center py-4 text-xs text-text-tertiary">
                    No papers found in your library. Add a paper first.
                  </p>
                )}
              </div>
            </div>

            {/* Presenter & Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  2. Designated Presenter *
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
                  3. Seminar Date *
                </label>
                <input
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-text-tertiary">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset(3)}
                    className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary hover:bg-bg-elevated text-text-secondary border border-border-default cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset(7)}
                    className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary hover:bg-bg-elevated text-text-secondary border border-border-default cursor-pointer"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset(14)}
                    className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary hover:bg-bg-elevated text-text-secondary border border-border-default cursor-pointer"
                  >
                    +2 Weeks
                  </button>
                </div>
              </div>
            </div>

            {/* Seminar Guidance & Agenda */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                4. Discussion Focus &amp; Pre-Reading Guidance (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Focus on Section 4 comparative ablation analysis and limitations for our current project."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon={<Sparkles size={13} />}
              >
                Confirm Seminar Schedule
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Edit Seminar Modal ─── */}
      {editingSession && (
        <Modal
          isOpen={Boolean(editingSession)}
          onClose={() => setEditingSession(null)}
          title={`Edit Seminar: ${editingSession.paper.title}`}
          description="Update presentation date, session status, or record seminar minutes."
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Seminar Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Seminar Minutes &amp; Discussion Notes
              </label>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Record group takeaways, critique points, and action items discussed during the seminar..."
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setEditingSession(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isUpdating} icon={<CheckCircle2 size={13} />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

