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
}

interface LabBroadcastsBoardProps {
  labId: string
  isLeadOrSupervisor: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
  CONFERENCE_DEADLINE: { label: 'Conference Deadline', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: Calendar },
  PAPER_ACCEPTED: { label: 'Paper Accepted 🎉', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Award },
  COMPUTE_NOTICE: { label: 'Compute & Cluster', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Cpu },
  ANNOUNCEMENT: { label: 'Lab Notice', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', icon: Megaphone },
}

export function LabBroadcastsBoard({ labId, isLeadOrSupervisor }: LabBroadcastsBoardProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('CONFERENCE_DEADLINE')
  const [deadline, setDeadline] = useState('')
  const [isPinned, setIsPinned] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
        }),
      })

      if (res.ok) {
        addToast('success', 'Broadcast published to lab!')
        setIsModalOpen(false)
        setTitle('')
        setContent('')
        setDeadline('')
        fetchBroadcasts()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to publish broadcast')
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

  // Calculate days remaining helper
  const getDaysRemaining = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Megaphone size={16} className="text-accent" /> Lab Noticeboard &amp; Conference Deadlines
        </h3>

        {isLeadOrSupervisor && (
          <Button size="xs" variant="primary" onClick={() => setIsModalOpen(true)} icon={<Plus size={13} />}>
            Post Notice
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-text-tertiary">Loading noticeboard...</div>
      ) : broadcasts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {broadcasts.map((b) => {
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
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${config.bg}`}>
                      <Icon size={11} /> {config.label}
                    </span>

                    {/* Deadline Countdown Pill */}
                    {daysLeft !== null && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${
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
          <p>No active notices or conference countdowns posted yet.</p>
        </div>
      )}

      {/* Post Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Post Lab Announcement or Deadline"
          description="Broadcast notices, paper acceptances, or upcoming conference submission deadlines to all lab members."
          size="md"
        >
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
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
                <option value="ANNOUNCEMENT">📢 General Lab Announcement</option>
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
    </div>
  )
}
