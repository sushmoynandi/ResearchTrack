'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Link as LinkIcon,
  Calendar,
  Clock,
  Users,
  Send,
  FileText,
  ExternalLink,
  Trash2,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  Shield,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Zap,
  Sun,
  Moon,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface UserItem {
  id: string
  name: string
  email: string
  systemRole: 'STUDENT' | 'SUPERVISOR' | 'ADMIN'
  department?: string | null
  institution?: string | null
}

interface BroadcastItem {
  id: string
  doi: string
  title: string
  authors: string
  abstract?: string | null
  journal?: string | null
  year?: number | null
  url?: string | null
  pdfUrl?: string | null
  theme?: string
  score?: string | null
  topics?: string | null
  scheduledFor: string
  status: 'SCHEDULED' | 'SENT' | 'CANCELLED'
  sentAt?: string | null
  recipientCount: number
  targetFilter: string
  createdBy: { id: string; name: string; email: string }
  recipients?: Array<{ id: string; email: string; user: { name: string; email: string; systemRole: string } }>
  createdAt: string
}

export default function AdminPaperOfTheDayPage() {
  const { user, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [doiInput, setDoiInput] = useState('')
  const [fetchingDoi, setFetchingDoi] = useState(false)
  const [autoResolved, setAutoResolved] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<'DARK' | 'LIGHT'>('DARK')
  const [showScore, setShowScore] = useState(false)
  const [paperDetails, setPaperDetails] = useState<{
    doi: string
    title: string
    authors: string
    abstract: string
    journal: string
    year: string
    url: string
    pdfUrl: string
    score: string
    topics: string
  } | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [sendNow, setSendNow] = useState(false)
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })

  const [targetFilter, setTargetFilter] = useState<'ALL' | 'STUDENTS' | 'SUPERVISORS' | 'CUSTOM'>('ALL')
  const [availableUsers, setAvailableUsers] = useState<UserItem[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          setAvailableUsers(data.users || data || [])
        }
      } catch (err) {
        console.error('Failed to load user list:', err)
      }
    }
    loadUsers()
    fetchBroadcasts()
  }, [])

  const fetchBroadcasts = async () => {
    try {
      setLoadingHistory(true)
      const res = await fetch('/api/admin/paper-of-the-day')
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data)
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Automatic DOI fetch helper
  const performFetchDoi = async (inputVal: string, isManual = false) => {
    const raw = inputVal.trim()
    if (!raw) return

    const cleanDoi = raw.replace(/^https?:\/\/doi\.org\//i, '').trim()
    if (!cleanDoi.includes('/') && cleanDoi.length < 5 && !cleanDoi.includes('.')) {
      if (isManual) addToast('error', 'Please enter a valid DOI format or arXiv URL')
      return
    }

    try {
      setFetchingDoi(true)
      setAutoResolved(false)
      const res = await fetch('/api/admin/paper-of-the-day/fetch-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: raw }),
      })

      const data = await res.json()
      if (res.ok && data.title) {
        setPaperDetails({
          doi: data.doi || cleanDoi,
          title: data.title || '',
          authors: data.authors || '',
          abstract: data.abstract || '',
          journal: data.journal || '',
          year: data.year ? String(data.year) : '',
          url: data.url || ('https://doi.org/' + (data.doi || cleanDoi)),
          pdfUrl: data.pdfUrl || '',
          score: '9.4/10',
          topics: Array.isArray(data.topics) && data.topics.length > 0 ? data.topics.slice(0, 4).join(', ') : '',
        })
        setAutoResolved(true)
        addToast('success', '⚡ Automatically fetched paper title, authors, venue & abstract!')
      } else {
        if (isManual) {
          addToast('warning', data.error || 'Could not resolve automatically. You can enter details manually.')
        }
        setPaperDetails({
          doi: cleanDoi,
          title: '',
          authors: '',
          abstract: '',
          journal: '',
          year: new Date().getFullYear().toString(),
          url: 'https://doi.org/' + cleanDoi,
          pdfUrl: '',
          score: '9.4/10',
          topics: '',
        })
      }
    } catch {
      if (isManual) addToast('error', 'Network error fetching DOI details')
    } finally {
      setFetchingDoi(false)
    }
  }

  // Auto-fetch when admin pastes or types a DOI
  const handleDoiChange = (val: string) => {
    setDoiInput(val)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    const trimmed = val.trim()
    if ((trimmed.includes('10.') && trimmed.includes('/')) || trimmed.includes('arxiv.org')) {
      debounceTimerRef.current = setTimeout(() => {
        performFetchDoi(trimmed, false)
      }, 500)
    }
  }

  const handleSelectAllFiltered = () => {
    const targetRoles =
      targetFilter === 'STUDENTS'
        ? ['STUDENT']
        : targetFilter === 'SUPERVISORS'
        ? ['SUPERVISOR']
        : ['STUDENT', 'SUPERVISOR']

    const eligible = availableUsers.filter((u) => targetRoles.includes(u.systemRole)).map((u) => u.id)
    setSelectedUserIds(eligible)
  }

  const handleClearSelection = () => {
    setSelectedUserIds([])
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleScheduleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperDetails || !paperDetails.title || !paperDetails.authors) {
      addToast('error', 'Please provide paper title and authors')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        doi: paperDetails.doi,
        title: paperDetails.title,
        authors: paperDetails.authors,
        abstract: paperDetails.abstract || null,
        journal: paperDetails.journal || null,
        year: paperDetails.year ? parseInt(paperDetails.year, 10) : null,
        url: paperDetails.url || null,
        pdfUrl: paperDetails.pdfUrl || null,
        theme: selectedTheme,
        score: showScore && paperDetails.score ? paperDetails.score.trim() : null,
        topics: paperDetails.topics ? paperDetails.topics.trim() : null,
        sendNow,
        scheduledFor: sendNow ? new Date().toISOString() : new Date(scheduledDate).toISOString(),
        targetFilter,
        recipientUserIds: targetFilter === 'CUSTOM' ? selectedUserIds : undefined,
      }

      const res = await fetch('/api/admin/paper-of-the-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        addToast(
          'success',
          sendNow
            ? '🚀 Paper of the Day broadcast dispatched immediately!'
            : '📅 Paper of the Day scheduled successfully!'
        )
        setDoiInput('')
        setPaperDetails(null)
        setAutoResolved(false)
        setSelectedUserIds([])
        fetchBroadcasts()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to schedule Paper of the Day')
      }
    } catch {
      addToast('error', 'Network error scheduling Paper of the Day')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to delete/cancel this Paper of the Day broadcast?')) return
    try {
      setDeletingId(id)
      const res = await fetch('/api/admin/paper-of-the-day/' + id, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Broadcast removed')
        setBroadcasts((prev) => prev.filter((b) => b.id !== id))
      } else {
        addToast('error', 'Failed to delete broadcast')
      }
    } catch {
      addToast('error', 'Network error deleting broadcast')
    } finally {
      setDeletingId(null)
    }
  }

  const displayedUsers = availableUsers.filter((u) => {
    if (targetFilter === 'STUDENTS' && u.systemRole !== 'STUDENT') return false
    if (targetFilter === 'SUPERVISORS' && u.systemRole !== 'SUPERVISOR') return false
    if (userSearch) {
      const q = userSearch.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              Paper of the Day Broadcast &amp; Scheduler
            </h1>
            <p className="text-xs text-text-secondary">
              Simply paste any DOI link. Title, authors, and details are fetched automatically to schedule email spotlights.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: DOI Input Card with Instant Auto-Fetch */}
          <div className="glass-card p-5 md:p-6 space-y-4 border-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" /> Step 1: Paste DOI Link (Automatic Fetch)
              </span>
              {fetchingDoi && (
                <span className="text-[11px] font-mono text-accent flex items-center gap-1 animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Resolving Title &amp; Authors...
                </span>
              )}
              {autoResolved && !fetchingDoi && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Auto-Fetched
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={doiInput}
                onChange={(e) => handleDoiChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    performFetchDoi(doiInput, true)
                  }
                }}
                placeholder="Paste DOI (e.g. 10.1038/s41586-020-2649-2 or https://doi.org/...)"
                className="flex-1 p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
              />

              <Button
                type="button"
                variant="primary"
                loading={fetchingDoi}
                onClick={() => performFetchDoi(doiInput, true)}
                icon={<Search size={14} />}
                className="bg-accent hover:bg-accent-hover text-white shrink-0"
              >
                Fetch
              </Button>
            </div>
            <p className="text-[11px] text-text-tertiary">
              💡 <strong>Automatic Title &amp; Author Lookup:</strong> Just paste the DOI link. We automatically query CrossRef, Semantic Scholar, and OpenAlex.
            </p>
          </div>

          {/* Step 2: Paper Details Preview & Editor */}
          {paperDetails && (
            <div className="glass-card p-5 md:p-6 space-y-4 border-purple-500/30 animate-slide-in">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
                <span className="text-xs font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} /> Step 2: Auto-Populated Paper Spotlight
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">DOI: {paperDetails.doi}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-text-primary block mb-1">
                    Paper Title <span className="text-accent text-[10px] font-normal">(Auto-Fetched)</span> *
                  </label>
                  <input
                    type="text"
                    value={paperDetails.title}
                    onChange={(e) => setPaperDetails({ ...paperDetails, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-semibold"
                    placeholder="Paper Title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">
                      Authors <span className="text-accent text-[10px] font-normal">(Auto-Fetched)</span> *
                    </label>
                    <input
                      type="text"
                      value={paperDetails.authors}
                      onChange={(e) => setPaperDetails({ ...paperDetails, authors: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="e.g. John Doe, Jane Smith"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">Journal / Venue</label>
                    <input
                      type="text"
                      value={paperDetails.journal}
                      onChange={(e) => setPaperDetails({ ...paperDetails, journal: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="e.g. Nature, NeurIPS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">Publication Year</label>
                    <input
                      type="number"
                      value={paperDetails.year}
                      onChange={(e) => setPaperDetails({ ...paperDetails, year: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                      placeholder="2026"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-text-primary">Impact Score</label>
                      <label className="flex items-center gap-1 text-[10px] text-text-tertiary cursor-pointer font-sans">
                        <input
                          type="checkbox"
                          checked={showScore}
                          onChange={(e) => setShowScore(e.target.checked)}
                          className="rounded border-border-default text-accent focus:ring-accent w-3 h-3"
                        />
                        <span>Show Score</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={!showScore}
                      value={paperDetails.score}
                      onChange={(e) => setPaperDetails({ ...paperDetails, score: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-opacity ${
                        showScore
                          ? 'bg-bg-tertiary border-border-default text-amber-400 focus:border-accent'
                          : 'bg-bg-tertiary/40 border-border-default/40 text-text-tertiary opacity-60 cursor-not-allowed'
                      }`}
                      placeholder="e.g. 9.4/10 (Optional)"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">
                      Topics <span className="text-text-tertiary font-normal">(Optional, comma separated)</span>
                    </label>
                    <input
                      type="text"
                      value={paperDetails.topics}
                      onChange={(e) => setPaperDetails({ ...paperDetails, topics: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                      placeholder="e.g. Computer Vision, AI (Optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-text-primary block mb-1">Abstract Summary</label>
                  <textarea
                    value={paperDetails.abstract}
                    onChange={(e) => setPaperDetails({ ...paperDetails, abstract: e.target.value })}
                    rows={3}
                    placeholder="Enter paper abstract summary..."
                    className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent resize-y"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-5 md:p-6 space-y-5 border-indigo-500/30">
            <span className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-border-default/60 pb-3">
              <Users size={13} /> Step 3: Select Email Theme &amp; Audience
            </span>

            {/* Selectable Email Visual Theme (Dark vs Light) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-primary block">Select Email Visual Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('DARK')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    selectedTheme === 'DARK'
                      ? 'border-indigo-500 bg-slate-900 text-indigo-300 shadow-md ring-2 ring-indigo-500/30'
                      : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Moon size={14} className="text-indigo-400" />
                  <span>🌙 Dark Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTheme('LIGHT')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    selectedTheme === 'LIGHT'
                      ? 'border-blue-500 bg-white text-blue-800 shadow-md ring-2 ring-blue-500/30'
                      : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sun size={14} className="text-amber-500" />
                  <span>☀️ Light Theme</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Email Card Preview */}
            {paperDetails && (
              <div className="space-y-2 border-t border-border-default/60 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-text-primary flex items-center gap-1">
                    <Eye size={13} className="text-accent" /> Live Email Card Preview
                  </label>
                  <span className="text-[10px] font-mono text-text-tertiary uppercase">{selectedTheme} MODE</span>
                </div>

                <div
                  className={`p-4 rounded-xl border transition-all text-left space-y-2.5 ${
                    selectedTheme === 'LIGHT'
                      ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      : 'bg-[#111827] border-[#1f2937] text-slate-100 border-l-4 border-l-indigo-500 shadow-md'
                  }`}
                >
                  {/* 1. Paper Title (First) */}
                  <div className={`text-xs font-bold line-clamp-2 ${selectedTheme === 'LIGHT' ? 'text-blue-600' : 'text-blue-400'}`}>
                    📄 {paperDetails.title || 'Paper Title'}
                  </div>

                  {/* 2. Authors Header (Second) */}
                  <div className={`text-[11px] font-medium ${selectedTheme === 'LIGHT' ? 'text-slate-600' : 'text-slate-400'}`}>
                    By {paperDetails.authors || 'Authors list'}
                  </div>

                  {paperDetails.abstract && (
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${selectedTheme === 'LIGHT' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {paperDetails.abstract}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border-default/40">
                    <span className={selectedTheme === 'LIGHT' ? 'text-slate-600' : 'text-slate-400'}>
                      <strong>Venue:</strong> {paperDetails.journal || 'arXiv'} • {paperDetails.year || '2026'}
                    </span>
                  </div>

                  {paperDetails.topics && paperDetails.topics.trim() && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {paperDetails.topics.split(',').map((t) => t.trim()).filter(Boolean).map((t, idx) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                            selectedTheme === 'LIGHT'
                              ? 'bg-slate-100 border border-slate-300 text-slate-700'
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Audience Filter Buttons */}
            <div className="space-y-2 border-t border-border-default/60 pt-4">
              <label className="text-[11px] font-bold text-text-primary block">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ALL', label: 'All Scholars', icon: Users },
                  { id: 'STUDENTS', label: 'Students Only', icon: GraduationCap },
                  { id: 'SUPERVISORS', label: 'Supervisors Only', icon: Shield },
                  { id: 'CUSTOM', label: 'Custom Multi-Select', icon: CheckSquare },
                ].map((t) => {
                  const Icon = t.icon
                  const active = targetFilter === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetFilter(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all text-left ${
                        active
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-sm'
                          : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary hover:border-border-hover'
                      }`}
                    >
                      <Icon size={14} className={active ? 'text-indigo-400' : 'text-text-tertiary'} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {targetFilter === 'CUSTOM' && (
              <div className="space-y-2.5 p-3 rounded-xl bg-bg-tertiary/70 border border-border-default animate-slide-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search scholars..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-bg-secondary text-text-tertiary hover:text-text-primary"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {displayedUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id)
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleUser(u.id)}
                        className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ' + (
                          isSelected
                            ? 'bg-indigo-500/15 border border-indigo-500/30 text-text-primary'
                            : 'hover:bg-bg-elevated border border-transparent text-text-secondary'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <CheckSquare size={13} className="text-indigo-400 shrink-0" />
                          ) : (
                            <Square size={13} className="text-text-tertiary shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-semibold block truncate text-[11px] text-text-primary">{u.name}</span>
                            <span className="text-[10px] text-text-tertiary truncate block">{u.email}</span>
                          </div>
                        </div>
                        <Badge size="sm" variant={u.systemRole === 'SUPERVISOR' ? 'info' : 'default'} className="text-[9px]">
                          {u.systemRole}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
                <div className="text-[10px] text-text-tertiary text-right font-mono">
                  {selectedUserIds.length} scholar(s) selected
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-border-default/60 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-400" />
                  <span>Scheduled Delivery Time</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNow}
                    onChange={(e) => setSendNow(e.target.checked)}
                    className="rounded border-border-default text-accent focus:ring-accent"
                  />
                  <span>Send Immediately</span>
                </label>
              </div>

              {!sendNow && (
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                />
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={!paperDetails}
              onClick={handleScheduleBroadcast}
              icon={sendNow ? <Send size={14} /> : <Clock size={14} />}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg"
            >
              {sendNow ? '🚀 Dispatch Paper of the Day Now' : '📅 Schedule Automated Email Broadcast'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-accent" />
            <h2 className="text-base font-bold text-text-primary">Scheduled &amp; Past Paper Spotlights</h2>
          </div>
          <span className="text-xs font-mono text-text-tertiary">{broadcasts.length} Broadcast(s)</span>
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-2">
            <Sparkles size={28} className="text-text-tertiary mx-auto opacity-50" />
            <p className="text-xs text-text-secondary">No Paper of the Day scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const isSent = b.status === 'SENT'
              return (
                <div
                  key={b.id}
                  className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border-default hover:border-border-hover transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        size="sm"
                        variant={isSent ? 'success' : 'warning'}
                        className="font-mono text-[10px] font-bold"
                      >
                        {isSent ? 'SENT' : 'SCHEDULED'}
                      </Badge>
                      <span className="text-xs font-bold text-text-primary truncate">{b.title}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-tertiary flex-wrap">
                      <span><strong>Authors:</strong> {b.authors}</span>
                      <span>•</span>
                      <span className="font-mono"><strong>DOI:</strong> {b.doi}</span>
                      <span>•</span>
                      <span><strong>Audience:</strong> {b.targetFilter} ({b.recipientCount} Recipients)</span>
                      <span>•</span>
                      <span>
                        <strong>{isSent ? 'Sent at:' : 'Scheduled for:'}</strong>{' '}
                        {new Date(isSent && b.sentAt ? b.sentAt : b.scheduledFor).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={b.url || ('https://doi.org/' + b.doi)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent transition-colors"
                      title="Open Paper Source"
                    >
                      <ExternalLink size={14} />
                    </a>

                    <button
                      type="button"
                      disabled={deletingId === b.id}
                      onClick={() => handleDeleteBroadcast(b.id)}
                      className="p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Broadcast"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
