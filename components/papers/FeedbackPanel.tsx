'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  User,
} from 'lucide-react'
import type { FeedbackType } from '@/lib/types'

interface FeedbackItem {
  id: string
  content: string
  type: FeedbackType
  createdAt: string
  author: {
    id: string
    name: string
    image?: string | null
    systemRole: string
    institution?: string | null
  }
}

interface FeedbackPanelProps {
  paperId: string
  paperOwnerId: string
  selectedStudentId?: string
  selectedStudentName?: string
}

export function FeedbackPanel({
  paperId,
  paperOwnerId,
  selectedStudentId,
  selectedStudentName,
}: FeedbackPanelProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [type, setType] = useState<FeedbackType>('COMMENT')
  const [submitting, setSubmitting] = useState(false)

  const loadFeedback = async () => {
    try {
      const url = `/api/feedback?paperId=${paperId}${
        selectedStudentId ? `&studentId=${selectedStudentId}` : ''
      }`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setFeedbackList(data)
      }
    } catch (err) {
      console.error('Failed to load feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [paperId, selectedStudentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          content,
          type,
          targetUserId: selectedStudentId || paperOwnerId,
        }),
      })

      if (res.ok) {
        addToast('success', `Feedback posted for ${selectedStudentName || 'student'}`)
        setContent('')
        loadFeedback()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to post feedback')
      }
    } catch {
      addToast('error', 'Network error posting feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeBadge = (t: FeedbackType) => {
    switch (t) {
      case 'APPROVAL':
        return <Badge variant="success" size="sm">Approval</Badge>
      case 'SUGGESTION':
        return <Badge variant="info" size="sm">Suggestion</Badge>
      case 'REVISION_REQUEST':
        return <Badge variant="warning" size="sm">Revision Requested</Badge>
      default:
        return <Badge variant="default" size="sm">Supervisor Note</Badge>
    }
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
          <MessageSquare size={18} className="text-purple-500" />
          Supervisor Feedback &amp; Review Remarks
          {selectedStudentName && isSupervisor && (
            <span className="text-xs font-normal text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
              for {selectedStudentName}
            </span>
          )}
        </h3>
        <span className="text-xs text-text-tertiary">
          {feedbackList.length} feedback {feedbackList.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Post Feedback Form (for Supervisors and Admins) */}
      {(isSupervisor || isAdmin) && (
        <form onSubmit={handleSubmit} className="space-y-3 bg-bg-tertiary/40 p-4 rounded-xl border border-border-default/60">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-secondary">
              Leave Faculty Review / Feedback:
            </span>
            <div className="flex items-center gap-1.5">
              {(['COMMENT', 'SUGGESTION', 'APPROVAL', 'REVISION_REQUEST'] as FeedbackType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    type === t
                      ? 'bg-purple-600 text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write constructive review remarks, methodology suggestions, or validation feedback..."
            className="w-full bg-bg-secondary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-purple-500 resize-none h-24"
            required
          />

          <div className="flex justify-end">
            <Button size="sm" type="submit" loading={submitting} icon={<Send size={13} />}>
              Submit Feedback
            </Button>
          </div>
        </form>
      )}

      {/* Feedback List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-text-tertiary">Loading feedback...</p>
        ) : feedbackList.length > 0 ? (
          feedbackList.map((f) => (
            <div
              key={f.id}
              className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2.5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 font-bold text-xs flex items-center justify-center">
                    {f.author.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary">{f.author.name}</span>
                    <span className="text-[10px] text-text-tertiary ml-1.5 font-medium uppercase tracking-wider">
                      ({f.author.systemRole})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getTypeBadge(f.type)}
                  <span className="text-[10px] text-text-tertiary">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap pl-9">
                {f.content}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-text-tertiary text-center py-6">
            No supervisor feedback posted yet on this paper.
          </p>
        )}
      </div>
    </div>
  )
}
