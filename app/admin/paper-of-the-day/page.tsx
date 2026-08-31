'use client'

import React, { useState, useEffect } from 'react'
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
  const [paperDetails, setPaperDetails] = useState<{
    doi: string
    title: string
    authors: string
    abstract: string
    journal: string
    year: string
    url: string
    pdfUrl: string
  } | null>(null)

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

  const handleFetchDoi = async () => {
    if (!doiInput.trim()) {
      addToast('error', 'Please enter a DOI link or identifier')
      return
    }

    try {
      setFetchingDoi(true)
      const res = await fetch('/api/admin/paper-of-the-day/fetch-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doiInput }),
      })

      const data = await res.json()
      if (res.ok) {
        setPaperDetails({
          doi: data.doi || doiInput,
          title: data.title || '',
          authors: data.authors || '',
          abstract: data.abstract || '',
          journal: data.journal || '',
          year: data.year ? String(data.year) : '',
          url: data.url || ('https://doi.org/' + (data.doi || doiInput)),
          pdfUrl: data.pdfUrl || '',
        })
        addToast('success', 'Paper metadata successfully resolved!')
      } else {
        addToast('warning', data.error || 'Could not automatically resolve. You can fill details manually.')
        const cleanD = doiInput.replace(/^https?:\/\/doi\.org\//i, '').trim()
        setPaperDetails({
          doi: cleanD,
          title: '',
          authors: '',
          abstract: '',
          journal: '',
          year: new Date().getFullYear().toString(),
          url: 'https://doi.org/' + cleanD,
          pdfUrl: '',
        })
      }
    } catch {
      addToast('error', 'Network error fetching DOI details')
    } finally {
      setFetchingDoi(false)
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
            ? 'Paper of the Day broadcast dispatched immediately!'
            : 'Paper of the Day scheduled successfully!'
        )
        setDoiInput('')
        setPaperDetails(null)
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
              Input any DOI link, select target scholars, schedule delivery time, and dispatch automated spotlight emails.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card p-5 md:p-6 space-y-4 border-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent font-mono uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon size={13} /> Step 1: Enter DOI Link
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={doiInput}
                onChange={(e) => setDoiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleFetchDoi()
                  }
                }}
                placeholder="e.g. 10.1038/s41586-020-2649-2 or https://doi.org/10.1145/3357384.3357972"
                className="flex-1 p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
              />

              <Button
                type="button"
                variant="primary"
                loading={fetchingDoi}
                onClick={handleFetchDoi}
                icon={<Search size={14} />}
                className="bg-accent hover:bg-accent-hover text-white shrink-0"
              >
                Fetch Metadata
              </Button>
            </div>
            <p className="text-[11px] text-text-tertiary">
              Automatically resolves Title, Authors, Abstract, Journal, Publication Year, and OpenAccess PDF via CrossRef &amp; Semantic Scholar.
            </p>
          </div>

          {paperDetails && (
            <div className="glass-card p-5 md:p-6 space-y-4 border-purple-500/30 animate-slide-in">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
                <span className="text-xs font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} /> Step 2: Review &amp; Edit Paper Spotlight
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">DOI: {paperDetails.doi}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-text-primary block mb-1">Paper Title *</label>
                  <input
                    type="text"
                    value={paperDetails.title}
                    onChange={(e) => setPaperDetails({ ...paperDetails, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-medium"
                    placeholder="Paper Title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">Authors *</label>
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
                      placeholder="e.g. Nature, NeurIPS 2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-text-primary block mb-1">Year</label>
                    <input
                      type="number"
                      value={paperDetails.year}
                      onChange={(e) => setPaperDetails({ ...paperDetails, year: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                      placeholder="2026"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-text-primary block mb-1">Paper URL / DOI Link</label>
                    <input
                      type="url"
                      value={paperDetails.url}
                      onChange={(e) => setPaperDetails({ ...paperDetails, url: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-text-primary block mb-1">Abstract Summary</label>
                  <textarea
                    value={paperDetails.abstract}
                    onChange={(e) => setPaperDetails({ ...paperDetails, abstract: e.target.value })}
                    rows={4}
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
              <Users size={13} /> Step 3: Target Recipients &amp; Schedule
            </span>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-primary block">Select Target Audience</label>
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
                      className={'p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all text-left ' + (
                        active
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-sm'
                          : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary hover:border-border-hover'
                      )}
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
                      placeholder="Search users..."
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
                  {selectedUserIds.length} user(s) selected
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
              {sendNow ? 'Dispatch Paper of the Day Now' : 'Schedule Automated Email Broadcast'}
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
