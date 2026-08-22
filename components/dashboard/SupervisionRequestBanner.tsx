'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building2,
  Mail,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface SupervisionRequest {
  id: string
  supervisorId: string
  studentId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message?: string | null
  createdAt: string
  supervisor: {
    id: string
    name: string
    email: string
    image?: string | null
    department?: string | null
    institution?: string | null
  }
}

interface SupervisionRequestBannerProps {
  onRequestResolved?: () => void
}

export function SupervisionRequestBanner({ onRequestResolved }: SupervisionRequestBannerProps) {
  const [requests, setRequests] = useState<SupervisionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { addToast } = useToast()

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/students/requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data || [])
      }
    } catch (err) {
      console.error('Failed to load supervision requests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()

    const handleSync = () => fetchRequests()
    window.addEventListener('supervision-requests-changed', handleSync)
    return () => window.removeEventListener('supervision-requests-changed', handleSync)
  }, [fetchRequests])

  const handleRespond = async (requestId: string, action: 'ACCEPT' | 'REJECT', supervisorName: string) => {
    setProcessingId(requestId)
    try {
      const res = await fetch(`/api/students/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        if (action === 'ACCEPT') {
          addToast('success', `Supervision connected with ${supervisorName}! 🎉`)
        } else {
          addToast('info', `Supervision invitation from ${supervisorName} declined.`)
        }
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        if (onRequestResolved) {
          onRequestResolved()
        }
        window.dispatchEvent(new Event('supervision-requests-changed'))
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to process request')
      }
    } catch {
      addToast('error', 'Network error responding to invitation')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading || requests.length === 0) return null

  return (
    <div className="space-y-4 animate-fade-in">
      {requests.map((req) => (
        <div
          key={req.id}
          className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-bg-secondary to-purple-900/20 p-5 shadow-lg shadow-purple-950/20 backdrop-blur-md"
        >
          {/* Subtle glow background */}
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-purple-500/10 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Supervisor Information */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-inner">
                <GraduationCap size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" size="sm" className="border-purple-500/40 bg-purple-500/20 text-purple-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                    Supervision Invitation
                  </Badge>
                  <span className="text-[11px] text-text-tertiary font-mono">
                    Received {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-1.5">
                  <span>{req.supervisor.name}</span>
                  <span className="text-xs font-normal text-text-tertiary">invited you to join their research roster</span>
                </h4>

                <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap pt-0.5">
                  <span className="flex items-center gap-1 text-text-tertiary">
                    <Mail size={12} /> {req.supervisor.email}
                  </span>
                  {(req.supervisor.department || req.supervisor.institution) && (
                    <span className="flex items-center gap-1 text-text-tertiary">
                      <Building2 size={12} />
                      {[req.supervisor.department, req.supervisor.institution].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>

                {req.message && (
                  <p className="text-xs text-text-secondary italic bg-bg-primary/40 px-3 py-1.5 rounded-lg border border-border-default/60 mt-1">
                    &ldquo;{req.message}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Right: Action Buttons (Accept / Reject) */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center pt-2 md:pt-0">
              <Button
                variant="secondary"
                size="sm"
                disabled={processingId === req.id}
                onClick={() => handleRespond(req.id, 'REJECT', req.supervisor.name)}
                icon={<XCircle size={14} className="text-text-tertiary hover:text-danger" />}
                className="hover:border-danger/40 hover:text-danger transition-colors cursor-pointer text-xs"
              >
                Decline
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={processingId === req.id}
                onClick={() => handleRespond(req.id, 'ACCEPT', req.supervisor.name)}
                icon={<CheckCircle2 size={14} className="text-white" />}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-600/30 cursor-pointer text-xs"
              >
                {processingId === req.id ? 'Connecting...' : 'Accept Supervision'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
