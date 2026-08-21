'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  UserCog,
  Check,
  X,
  Clock,
  Building,
  Mail,
  Inbox,
} from 'lucide-react'

interface RoleRequestRecord {
  id: string
  currentRole: string
  requestedRole: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
    institution: string | null
    department: string | null
  }
  reviewedBy: { name: string } | null
}

const roleLabel = (role: string) =>
  role === 'SUPERVISOR' ? 'Supervisor' : role === 'ADMIN' ? 'Administrator' : 'Student Researcher'

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export default function AdminRoleRequestsPage() {
  const { addToast } = useToast()

  const [requests, setRequests] = useState<RoleRequestRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Decision modal
  const [deciding, setDeciding] = useState<{
    request: RoleRequestRecord
    decision: 'APPROVED' | 'REJECTED'
  } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/role-requests')
      if (res.ok) {
        setRequests(await res.json())
      } else {
        addToast('error', 'Could not load role requests')
      }
    } catch {
      addToast('error', 'Network error loading role requests')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    load()
  }, [load])

  const submitDecision = async () => {
    if (!deciding) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/role-requests/${deciding.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: deciding.decision, reviewNote }),
      })
      const data = await res.json()

      if (res.ok) {
        addToast(
          'success',
          deciding.decision === 'APPROVED'
            ? `${deciding.request.user.name} is now a ${roleLabel(deciding.request.requestedRole)}`
            : 'Request declined'
        )
        setDeciding(null)
        setReviewNote('')
        await load()
      } else {
        addToast('error', data.error || 'Could not save your decision')
      }
    } catch {
      addToast('error', 'Network error saving your decision')
    } finally {
      setSaving(false)
    }
  }

  const pending = requests.filter((r) => r.status === 'PENDING')
  const decided = requests.filter((r) => r.status !== 'PENDING')

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center shadow-glow shrink-0">
            <UserCog size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary font-display tracking-tight">
              Role Change Requests
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Approve or decline people asking to switch between Student Researcher
              and Supervisor.
            </p>
          </div>
        </div>

        <Badge variant={pending.length > 0 ? 'warning' : 'default'} size="md">
          {pending.length} waiting
        </Badge>
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} />}
          title="Nothing waiting"
          description="New role change requests will show up here as soon as someone sends one."
        />
      ) : (
        <div className="space-y-3">
          {pending.map((req) => (
            <div key={req.id} className="glass-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className="w-11 h-11 rounded-xl bg-accent-subtle border border-accent/30 text-accent font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {req.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={req.user.image}
                        alt={req.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      req.user.name.slice(0, 2).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-text-primary">
                      {req.user.name}
                    </p>
                    <p className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Mail size={12} className="text-accent" /> {req.user.email}
                    </p>
                    {req.user.institution && (
                      <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                        <Building size={12} className="text-accent" />
                        {req.user.institution}
                        {req.user.department && <span> · {req.user.department}</span>}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <Badge variant="outline" size="sm">
                        {roleLabel(req.currentRole)}
                      </Badge>
                      <span className="text-text-tertiary text-xs">→</span>
                      <Badge
                        variant={req.requestedRole === 'SUPERVISOR' ? 'success' : 'info'}
                        size="sm"
                      >
                        {roleLabel(req.requestedRole)}
                      </Badge>
                      <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                        <Clock size={11} /> {formatDate(req.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReviewNote('')
                      setDeciding({ request: req, decision: 'REJECTED' })
                    }}
                    icon={<X size={14} />}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setReviewNote('')
                      setDeciding({ request: req, decision: 'APPROVED' })
                    }}
                    icon={<Check size={14} />}
                  >
                    Approve
                  </Button>
                </div>
              </div>

              {req.reason && (
                <p className="text-xs text-text-secondary leading-relaxed p-3 rounded-lg bg-bg-secondary/60 border border-border-default">
                  &ldquo;{req.reason}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Already decided */}
      {decided.length > 0 && (
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary font-display border-b border-border-default pb-3">
            Already decided
          </h2>
          {decided.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center gap-2 text-xs text-text-secondary py-1.5"
            >
              <Badge variant={req.status === 'APPROVED' ? 'success' : 'danger'} size="sm">
                {req.status === 'APPROVED' ? 'Approved' : 'Declined'}
              </Badge>
              <span className="text-text-primary font-medium">{req.user.name}</span>
              <span>
                {roleLabel(req.currentRole)} → {roleLabel(req.requestedRole)}
              </span>
              <span className="text-text-tertiary">
                · {formatDate(req.reviewedAt || req.createdAt)}
                {req.reviewedBy && ` by ${req.reviewedBy.name}`}
              </span>
              {req.reviewNote && (
                <span className="text-text-tertiary italic">— {req.reviewNote}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision confirmation */}
      <Modal
        isOpen={Boolean(deciding)}
        onClose={() => (saving ? undefined : setDeciding(null))}
        size="sm"
        title={deciding?.decision === 'APPROVED' ? 'Approve this request?' : 'Decline this request?'}
        description={
          deciding
            ? deciding.decision === 'APPROVED'
              ? `${deciding.request.user.name} becomes a ${roleLabel(deciding.request.requestedRole)} straight away.`
              : `${deciding.request.user.name} keeps their current role.`
            : undefined
        }
      >
        <div className="space-y-5">
          <Textarea
            label="Note for them (optional)"
            placeholder={
              deciding?.decision === 'APPROVED'
                ? 'e.g. Confirmed with the department head.'
                : 'e.g. Please ask your department to email us first.'
            }
            rows={3}
            maxLength={300}
            showCount
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeciding(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant={deciding?.decision === 'APPROVED' ? 'primary' : 'danger'}
              onClick={submitDecision}
              loading={saving}
              icon={deciding?.decision === 'APPROVED' ? <Check size={15} /> : <X size={15} />}
            >
              {deciding?.decision === 'APPROVED' ? 'Approve' : 'Decline'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
