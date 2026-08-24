'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Highlighter,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Cpu,
  Trash2,
  Send,
  Plus,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import type { Highlight, HighlightCategory, HighlightColor } from '@/lib/types'

interface PaperHighlightsSectionProps {
  paperId: string
  paperSlug?: string | null
  canComment?: boolean
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

export function PaperHighlightsSection({
  paperId,
  paperSlug,
  canComment = true,
}: PaperHighlightsSectionProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [replyingHighlightId, setReplyingHighlightId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchHighlights = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}/highlights?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setHighlights(data)
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false)
    }
  }, [paperId])

  useEffect(() => {
    fetchHighlights()
  }, [fetchHighlights])

  const filteredHighlights = highlights.filter((h) => {
    if (filterCategory === 'ALL') return true
    return h.category === filterCategory
  })

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!confirm('Are you sure you want to delete this highlight?')) return
    setDeletingId(highlightId)
    try {
      const res = await fetch(`/api/papers/${paperId}/highlights/${highlightId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Highlight removed')
        fetchHighlights()
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
        addToast('success', 'Comment added to thread')
        setReplyText('')
        setReplyingHighlightId(null)
        fetchHighlights()
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

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
            <Highlighter size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary font-display">
                Inline PDF Highlights &amp; Marginal Discussions
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border-default">
                {highlights.length}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Passages highlighted by students and advisors with color categories and collaborative discussion threads.
            </p>
          </div>
        </div>

        <Link href={`/papers/${paperSlug || paperId}/reader`}>
          <Button size="sm" variant="primary" icon={<BookOpen size={14} />}>
            Open in PDF Reader <ArrowRight size={13} className="ml-1" />
          </Button>
        </Link>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
            filterCategory === 'ALL'
              ? 'bg-accent/15 border-accent text-accent font-semibold'
              : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
          }`}
        >
          All Highlights ({highlights.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('METHODOLOGY')}
          className={`px-3 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
            filterCategory === 'METHODOLOGY'
              ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 font-semibold'
              : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
          }`}
        >
          🟡 Methodology ({highlights.filter((h) => h.category === 'METHODOLOGY').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('CONTRIBUTION')}
          className={`px-3 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
            filterCategory === 'CONTRIBUTION'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
              : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
          }`}
        >
          🟢 Novelty &amp; Contribution ({highlights.filter((h) => h.category === 'CONTRIBUTION').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('LIMITATION')}
          className={`px-3 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
            filterCategory === 'LIMITATION'
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
              : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
          }`}
        >
          🔴 Threat to Validity ({highlights.filter((h) => h.category === 'LIMITATION').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('FEEDBACK')}
          className={`px-3 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
            filterCategory === 'FEEDBACK'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-semibold'
              : 'bg-bg-tertiary border-border-default text-text-tertiary hover:text-text-primary'
          }`}
        >
          🟣 Advisor Feedback ({highlights.filter((h) => h.category === 'FEEDBACK').length})
        </button>
      </div>

      {/* Highlights List */}
      <div className="space-y-4">
        {filteredHighlights.length === 0 ? (
          <div className="p-8 text-center glass-card border border-dashed border-border-default rounded-2xl space-y-2 text-text-tertiary">
            <Highlighter size={28} className="mx-auto opacity-30 text-accent" />
            <p className="text-sm font-semibold text-text-secondary">No highlights recorded yet</p>
            <p className="text-xs max-w-md mx-auto">
              Open the paper in the PDF Reader workspace, select any passage, and choose a color to create inline annotations and start discussion threads.
            </p>
            <div className="pt-2">
              <Link href={`/papers/${paperSlug || paperId}/reader`}>
                <Button size="xs" variant="secondary" icon={<BookOpen size={13} />}>
                  Open PDF Reader
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHighlights.map((hl) => {
              const catInfo = CATEGORY_MAP[hl.category] || CATEGORY_MAP.METHODOLOGY
              const CatIcon = catInfo.icon
              const isMyHighlight = hl.userId === user?.id
              const isReplying = replyingHighlightId === hl.id

              return (
                <div
                  key={hl.id}
                  className={`glass-card p-4 space-y-3 border-l-4 rounded-2xl transition-all flex flex-col justify-between ${catInfo.borderClass}`}
                >
                  <div className="space-y-3">
                    {/* Top Meta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={catInfo.badgeVariant} size="sm">
                          <CatIcon size={11} className="mr-1 inline" />
                          {catInfo.label}
                        </Badge>
                        {hl.pageNumber && (
                          <span className="text-[10px] font-mono text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                            Page {hl.pageNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-tertiary">
                          {hl.user?.name || 'Researcher'}
                        </span>
                        {(isMyHighlight || user?.systemRole === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHighlight(hl.id)}
                            disabled={deletingId === hl.id}
                            className="text-text-tertiary hover:text-rose-400 p-1 rounded transition-colors"
                            title="Delete highlight"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Highlight Quote */}
                    <div className="p-3 rounded-xl bg-bg-primary/70 border border-border-default text-xs text-text-primary italic font-serif leading-relaxed">
                      &ldquo;{hl.text}&rdquo;
                    </div>

                    {/* Comments Thread */}
                    {hl.comments && hl.comments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border-default/60">
                        {hl.comments.map((c) => {
                          const isAdvisor = c.user?.systemRole === 'SUPERVISOR'
                          return (
                            <div
                              key={c.id}
                              className="flex items-start gap-2 text-xs p-2.5 rounded-xl bg-bg-secondary/70 border border-border-default"
                            >
                              <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {c.user?.name?.slice(0, 1) || 'U'}
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-text-primary text-xs">
                                      {c.user?.name || 'User'}
                                    </span>
                                    {isAdvisor && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                                        Advisor
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-text-tertiary">
                                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                                <p className="text-text-secondary text-xs leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reply Action */}
                  <div className="pt-2">
                    {isReplying ? (
                      <div className="space-y-2">
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
                      canComment && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingHighlightId(hl.id)
                            setReplyText('')
                          }}
                          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          <span>Reply to this discussion</span>
                        </button>
                      )
                    )}
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
