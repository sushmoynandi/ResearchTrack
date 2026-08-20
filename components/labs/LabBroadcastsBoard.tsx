'use client'

import React, { useState, useEffect } from 'react'
import {
  Megaphone,
  Pin,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  Award,
  Cpu,
  Edit2,
  Globe,
  Layers,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface BroadcastItem {
  id: string
  title: string
  content: string
  category: string
  deadline: string | null
  isPinned: boolean
  createdAt: string
  author: { id: string; name: string; email: string }
  groupId?: string | null
  group?: { id: string; name: string; color: string } | null
}

interface LabBroadcastsBoardProps {
  labId: string
  groups?: { id: string; name: string; color: string; members?: any[] }[]
  isLeadOrSupervisor: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
  CONFERENCE_DEADLINE: { label: 'Conference Deadline', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: Calendar },
  PAPER_ACCEPTED: { label: 'Paper Accepted 🎉', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Award },
  COMPUTE_NOTICE: { label: 'Compute & Cluster', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Cpu },
  ANNOUNCEMENT: { label: 'Lab Notice', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', icon: Megaphone },
}

export function LabBroadcastsBoard({ labId, groups = [], isLeadOrSupervisor }: LabBroadcastsBoardProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL')

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('CONFERENCE_DEADLINE')
  const [deadline, setDeadline] = useState('')
  const [isPinned, setIsPinned] = useState(true)
  const [groupId, setGroupId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Broadcast State
  const [editingBroadcast, setEditingBroadcast] = useState<BroadcastItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('CONFERENCE_DEADLINE')
  const [editDeadline, setEditDeadline] = useState('')
  const [editIsPinned, setEditIsPinned] = useState(false)
  const [editGroupId, setEditGroupId] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/broadcasts`)
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (labId) fetchBroadcasts()
  }, [labId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch(`/api/labs/${labId}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          deadline: deadline.trim() || undefined,
          isPinned,
          groupId: groupId || undefined,
        }),
      })

      if (res.ok) {
        addToast('success', 'Notice published to lab!')
        setIsModalOpen(false)
        setTitle('')
        setContent('')
        setDeadline('')
        setGroupId('')
        fetchBroadcasts()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to publish notice')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    try {
      const res = await fetch(`/api/labs/${labId}/broadcasts?broadcastId=${broadcastId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Notice deleted')
        fetchBroadcasts()
      }
    } catch {
      addToast('error', 'Failed to delete')
    }
  }

  const handleOpenEdit = (b: BroadcastItem) => {
    setEditingBroadcast(b)
    setEditTitle(b.title)
    setEditContent(b.content)
    setEditCategory(b.category)
    setEditDeadline(b.deadline ? b.deadline.slice(0, 10) : '')
    setEditIsPinned(b.isPinned)
    setEditGroupId(b.groupId || b.group?.id || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBroadcast) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/labs/${labId}/broadcasts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: editingBroadcast.id,
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
          deadline: editDeadline.trim() || undefined,
          isPinned: editIsPinned,
          groupId: editGroupId || '',
        }),
      })

      if (res.ok) {
        addToast('success', 'Notice updated and lab members notified!')
        setEditingBroadcast(null)
        fetchBroadcasts()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update notice')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSavingEdit(false)
    }
  }

  // Calculate days remaining helper
  const getDaysRemaining = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (selectedGroupFilter === 'ALL') return true
    if (selectedGroupFilter === 'WHOLE_LAB') return !b.group
    return b.group?.id === selectedGroupFilter || b.groupId === selectedGroupFilter
  })

  return (
    <div className="space-y-4">
      {/* Header & Post Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 font-display">
            <Megaphone size={16} className="text-accent" /> Lab Notices &amp; Conference Deadlines
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Post lab announcements, conference submission countdowns, or cluster-targeted updates.
          </p>
        </div>

        {isLeadOrSupervisor && (
          <Button size="xs" variant="primary" onClick={() => setIsModalOpen(true)} icon={<Plus size={13} />}>
            Post Notice
          </Button>
        )}
      </div>

      {/* Scope Filter Pills */}
      {groups && groups.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-text-tertiary text-[11px] font-semibold mr-1 flex items-center gap-1 shrink-0">
            Audience:
          </span>
          <button
            onClick={() => setSelectedGroupFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              selectedGroupFilter === 'ALL'
                ? 'bg-accent text-white font-bold shadow-sm'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
            }`}
          >
            All Notices ({broadcasts.length})
          </button>
          <button
            onClick={() => setSelectedGroupFilter('WHOLE_LAB')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              selectedGroupFilter === 'WHOLE_LAB'
                ? 'bg-accent text-white font-bold shadow-sm'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
            }`}
          >
            🏛️ Whole Lab ({broadcasts.filter((b) => !b.group).length})
          </button>
          {groups.map((g) => {
            const count = broadcasts.filter((b) => b.group?.id === g.id || b.groupId === g.id).length
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupFilter(g.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedGroupFilter === g.id
                    ? 'bg-accent text-white font-bold shadow-sm'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
                }`}
              >
                👥 {g.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-text-tertiary">Loading noticeboard...</div>
      ) : filteredBroadcasts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBroadcasts.map((b) => {
            const config = CATEGORY_CONFIG[b.category] || CATEGORY_CONFIG.ANNOUNCEMENT
            const Icon = config.icon
            const daysLeft = b.deadline ? getDaysRemaining(b.deadline) : null

            return (
              <div
                key={b.id}
                className={`glass-card p-5 space-y-3 relative flex flex-col justify-between transition-all ${
                  b.isPinned ? 'border-accent/40 bg-accent/5' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${config.bg}`}>
                        <Icon size={11} /> {config.label}
                      </span>

                      {/* Audience Badge: Subgroup vs Whole Lab */}
                      {b.group ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 bg-purple-500/15 text-purple-400 border-purple-500/30">
                          <Layers size={10} /> {b.group.name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          <Globe size={10} /> Whole Lab
                        </span>
                      )}
                    </div>

                    {/* Deadline Countdown Pill */}
                    {daysLeft !== null && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border shrink-0 ${
                          daysLeft <= 7
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : 'bg-bg-tertiary text-text-secondary border-border-default'
                        }`}
                      >
                        <Clock size={10} className="inline mr-1" />
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Deadline Today'}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-1.5">
                    {b.isPinned && <Pin size={13} className="text-accent shrink-0 fill-accent" />}
                    <span>{b.title}</span>
                  </h4>

                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {b.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-border-default flex items-center justify-between text-[11px] text-text-tertiary">
                  <span>Posted by <strong className="text-text-secondary">{b.author.name}</strong></span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(b.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    {isLeadOrSupervisor && (
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="text-text-tertiary hover:text-accent p-1 cursor-pointer"
                        title="Edit notice"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    {isLeadOrSupervisor && (
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-text-tertiary hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete notice"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-xs text-text-tertiary space-y-2">
          <Megaphone size={24} className="mx-auto opacity-30 text-accent" />
          <p>No notices found in this view.</p>
        </div>
      )}

      {/* Post Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Post Lab Notice or Deadline"
          description="Post notices, paper acceptances, or upcoming conference submission deadlines to all lab members or a specialized sub-group."
          size="md"
        >
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {/* Target Audience / Scope Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Target Audience / Scope *
              </label>
              <div className="space-y-2">
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">🏛️ Whole Research Lab (All Members)</option>
                  {groups && groups.length > 0 && (
                    <optgroup label="Specialized Sub-Groups / Project Teams">
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          👥 Sub-Group: {g.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-text-tertiary">
                  {groupId
                    ? 'Only members assigned to this specific sub-group will receive alerts and view this notice.'
                    : 'All faculty, supervisors, and student researchers in this lab will receive this notice.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Notice Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="CONFERENCE_DEADLINE">🚨 Conference Submission Deadline</option>
                <option value="PAPER_ACCEPTED">🎉 Paper Accepted / Grant Awarded</option>
                <option value="COMPUTE_NOTICE">⚡ Compute Cluster &amp; GPU Notice</option>
                <option value="ANNOUNCEMENT">📢 General Lab Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                placeholder="e.g. NeurIPS 2026 Abstract Submission Deadline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Deadline Date (Optional for Countdowns)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Message Content *
              </label>
              <textarea
                placeholder="e.g. Please ensure all ablation scripts are finalized and draft reviews uploaded..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinNotice"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-border-default text-accent focus:ring-accent"
              />
              <label htmlFor="pinNotice" className="text-xs text-text-primary font-medium cursor-pointer">
                Pin this notice to top of lab dashboard
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Sparkles size={13} />}>
                Publish Notice
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Notice Modal */}
      {editingBroadcast && (
        <Modal
          isOpen={Boolean(editingBroadcast)}
          onClose={() => setEditingBroadcast(null)}
          title="Edit Lab Notice"
          description="Update notice content, target audience, conference deadlines, or pin status."
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {/* Target Audience / Scope Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Target Audience / Scope *
              </label>
              <select
                value={editGroupId}
                onChange={(e) => setEditGroupId(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">🏛️ Whole Research Lab (All Members)</option>
                {groups && groups.length > 0 && (
                  <optgroup label="Specialized Sub-Groups / Project Teams">
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        👥 Sub-Group: {g.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Category *
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="CONFERENCE_DEADLINE">Conference Deadline</option>
                  <option value="PAPER_ACCEPTED">Paper Accepted 🎉</option>
                  <option value="COMPUTE_NOTICE">Compute &amp; Cluster</option>
                  <option value="ANNOUNCEMENT">Lab Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Message Content *
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                required
                rows={4}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editPinNotice"
                checked={editIsPinned}
                onChange={(e) => setEditIsPinned(e.target.checked)}
                className="rounded border-border-default text-accent focus:ring-accent"
              />
              <label htmlFor="editPinNotice" className="text-xs text-text-primary font-medium cursor-pointer">
                Pin this notice to top of lab dashboard
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setEditingBroadcast(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingEdit} icon={<Sparkles size={13} />}>
                Save Changes &amp; Notify Lab
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
