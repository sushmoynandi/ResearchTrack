'use client'

import React, { useState } from 'react'
import {
  Highlighter,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Cpu,
  Trash2,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  GraduationCap,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import type { Highlight, HighlightCategory, HighlightColor } from '@/lib/types'

interface HighlightMarginPanelProps {
  paperId: string
  highlights: Highlight[]
  onRefresh: () => void
  onJumpToPage?: (page: number) => void
}

const CATEGORY_MAP: Record<
  HighlightCategory,
  { label: string; icon: any; borderClass: string; badgeVariant: 'warning' | 'success' | 'danger' | 'info' }
> = {
  METHODOLOGY: {
    label: 'Methodology',
    icon: Cpu,
    borderClass: 'border-l-yellow-400 bg-yellow-500/5',
    badgeVariant: 'warning',
  },
  CONTRIBUTION: {
    label: 'Novelty & Contribution',
    icon: Sparkles,
    borderClass: 'border-l-emerald-400 bg-emerald-500/5',
    badgeVariant: 'success',
  },
  LIMITATION: {
    label: 'Threat to Validity',
    icon: AlertTriangle,
    borderClass: 'border-l-rose-400 bg-rose-500/5',
    badgeVariant: 'danger',
  },
  FEEDBACK: {
    label: 'Advisor Feedback',
    icon: MessageSquare,
    borderClass: 'border-l-purple-400 bg-purple-500/5',
    badgeVariant: 'info',
  },
}

export function HighlightMarginPanel({
  paperId,
  highlights,
  onRefresh,
  onJumpToPage,
}: HighlightMarginPanelProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [replyingHighlightId, setReplyingHighlightId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredHighlights = highlights.filter((h) => {
    if (filterCategory === 'ALL') return true
    return h.category === filterCategory
  })

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!confirm('Are you sure you want to delete this highlight and its discussion thread?')) return
    setDeletingId(highlightId)
    try {
      const res = await fetch(`/api/papers/${paperId}/highlights/${highlightId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Highlight removed')
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to delete highlight')
      }
    } catch {
      addToast('error', 'Network error deleting highlight')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddComment = async (highlightId: string) => {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/highlights/${highlightId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      if (res.ok) {
        addToast('success', 'Comment posted to thread')
        setReplyText('')
        setReplyingHighlightId(null)
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to post comment')
      }
    } catch {
      addToast('error', 'Network error posting comment')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDeleteComment = async (highlightId: string, commentId: string) => {
    try {
      const res = await fetch(
        `/api/papers/${paperId}/highlights/${highlightId}/comments?commentId=${commentId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        addToast('success', 'Comment deleted')
        onRefresh()
      } else {
        addToast('error', 'Failed to delete comment')
      }
    } catch {
      addToast('error', 'Network error deleting comment')
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Category Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Highlighter size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-text-primary font-display">
              Marginal Notes & Highlights
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border-default">
              {highlights.length}
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              filterCategory === 'ALL'
                ? 'bg-accent/15 border-accent text-accent font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
            }`}
          >
            All ({highlights.length})
          </button>
          <button
            onClick={() => setFilterCategory('METHODOLOGY')}
            className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              filterCategory === 'METHODOLOGY'
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
            }`}
          >
            🟡 Method ({highlights.filter((h) => h.category === 'METHODOLOGY').length})
          </button>
          <button
            onClick={() => setFilterCategory('CONTRIBUTION')}
            className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              filterCategory === 'CONTRIBUTION'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
            }`}
          >
            🟢 Novelty ({highlights.filter((h) => h.category === 'CONTRIBUTION').length})
          </button>
          <button
            onClick={() => setFilterCategory('LIMITATION')}
            className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              filterCategory === 'LIMITATION'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
            }`}
          >
            🔴 Limitations ({highlights.filter((h) => h.category === 'LIMITATION').length})
          </button>
          <button
            onClick={() => setFilterCategory('FEEDBACK')}
            className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              filterCategory === 'FEEDBACK'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
            }`}
          >
            🟣 Advisor ({highlights.filter((h) => h.category === 'FEEDBACK').length})
          </button>
        </div>
      </div>

      {/* Highlights List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredHighlights.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-2 text-text-tertiary">
            <Highlighter size={28} className="mx-auto opacity-30 text-accent" />
            <p className="text-xs font-semibold text-text-secondary">No highlights in this view</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Select text inside the paper reader to apply colored highlights and start inline marginal discussion threads.
            </p>
          </div>
        ) : (
          filteredHighlights.map((hl) => {
            const catInfo = CATEGORY_MAP[hl.category] || CATEGORY_MAP.METHODOLOGY
            const CatIcon = catInfo.icon
            const isMyHighlight = hl.userId === user?.id
            const isReplying = replyingHighlightId === hl.id

            return (
              <div
                key={hl.id}
                className={`glass-card p-3.5 space-y-2.5 border-l-4 rounded-xl transition-all ${catInfo.borderClass}`}
              >
                {/* Highlight Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={catInfo.badgeVariant} size="sm">
                      <CatIcon size={11} className="mr-1 inline" />
                      {catInfo.label}
                    </Badge>
                    {hl.pageNumber && (
                      <button
                        onClick={() => onJumpToPage?.(hl.pageNumber!)}
                        className="text-[10px] font-mono text-text-tertiary hover:text-accent transition-colors bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default"
                        title="Click to jump to page"
                      >
                        p. {hl.pageNumber}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-tertiary">
                      {hl.user?.name ? hl.user.name.split(' ')[0] : 'Researcher'}
                    </span>
                    {(isMyHighlight || user?.systemRole === 'ADMIN') && (
                      <button
                        onClick={() => handleDeleteHighlight(hl.id)}
                        disabled={deletingId === hl.id}
                        className="text-text-tertiary hover:text-rose-400 p-1 rounded transition-colors"
                        title="Delete highlight"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Highlighted Quote Text */}
                <div className="p-2 rounded-lg bg-bg-primary/70 border border-border-default text-xs text-text-primary italic font-serif leading-relaxed">
                  &ldquo;{hl.text}&rdquo;
                </div>

                {/* Threaded Comments */}
                {hl.comments && hl.comments.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border-default/60">
                    {hl.comments.map((c) => {
                      const isCommentAuthor = c.userId === user?.id
                      const isAdvisor = c.user?.systemRole === 'SUPERVISOR'
                      return (
                        <div
                          key={c.id}
                          className="flex items-start gap-2 text-xs p-2 rounded-lg bg-bg-secondary/60 border border-border-default"
                        >
                          <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {c.user?.name?.slice(0, 1) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-text-primary text-[11px]">
                                  {c.user?.name || 'User'}
                                </span>
                                {isAdvisor && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                                    Advisor
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-text-tertiary">
                                  {new Date(c.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                {(isCommentAuthor || user?.systemRole === 'ADMIN') && (
                                  <button
                                    onClick={() => handleDeleteComment(hl.id, c.id)}
                                    className="text-text-tertiary hover:text-rose-400 p-0.5 rounded transition-colors"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-text-secondary text-xs leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Reply Form */}
                {isReplying ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply or question..."
                      rows={2}
                      className="w-full text-xs p-2 rounded-xl bg-bg-primary border border-border-default focus:border-accent focus:outline-none text-text-primary resize-none placeholder:text-text-tertiary"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setReplyingHighlightId(null)
                          setReplyText('')
                        }}
                        disabled={submittingReply}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleAddComment(hl.id)}
                        disabled={submittingReply || !replyText.trim()}
                        icon={<Send size={11} />}
                      >
                        {submittingReply ? 'Replying...' : 'Reply'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReplyingHighlightId(hl.id)
                      setReplyText('')
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-accent transition-colors pt-0.5 cursor-pointer"
                  >
                    <MessageSquare size={12} />
                    <span>Reply to this thread</span>
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
