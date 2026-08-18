'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  TrendingUp,
  Mail,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface GroupProgressData {
  paperId: string
  totalAssigned: number
  completed: number
  inProgress: number
  pending: number
  completionRate: number
  roster: {
    assignmentId: string
    studentId: string
    name: string
    email: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
    dueDate: string | null
    groups: { id: string; name: string; color: string }[]
  }[]
}

interface GroupReadingRadarCardProps {
  paperId: string
  paperTitle: string
}

export function GroupReadingRadarCard({ paperId, paperTitle }: GroupReadingRadarCardProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [data, setData] = useState<GroupProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingNudge, setSendingNudge] = useState(false)

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}/group-progress`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (paperId) fetchProgress()
  }, [paperId])

  const handleNudgePending = async () => {
    setSendingNudge(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/group-progress`, {
        method: 'POST',
      })
      if (res.ok) {
        const result = await res.json()
        addToast('success', `Sent reading reminder to ${result.remindedCount} pending student researchers!`)
      } else {
        addToast('error', 'Failed to send reminders')
      }
    } catch {
      addToast('error', 'Network error sending reminders')
    } finally {
      setSendingNudge(false)
    }
  }

  if (loading || !data || data.totalAssigned === 0) {
    return null // Only render if this paper has been assigned to students/groups
  }

  return (
    <div className="glass-card p-6 space-y-5 border-purple-500/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" /> Lab &amp; Sub-Group Reading Radar
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time reading progress across assigned student researchers.
          </p>
        </div>

        {(isSupervisor || isAdmin) && data.pending + data.inProgress > 0 && (
          <Button
            size="xs"
            variant="secondary"
            onClick={handleNudgePending}
            loading={sendingNudge}
            icon={<Zap size={13} className="text-amber-400" />}
          >
            Nudge Pending ({data.pending + data.inProgress})
          </Button>
        )}
      </div>

      {/* Progress Bar & Velocity Metric */}
      <div className="space-y-2 bg-bg-tertiary/60 p-4 rounded-xl border border-border-default/60">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary">
            Lab Reading Velocity: <strong className="text-purple-400">{data.completed} of {data.totalAssigned} Completed</strong>
          </span>
          <span className="font-bold text-text-primary font-mono">{data.completionRate}%</span>
        </div>

        <div className="w-full bg-bg-primary h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(data.completed / data.totalAssigned) * 100}%` }}
            title={`${data.completed} Completed`}
          />
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${(data.inProgress / data.totalAssigned) * 100}%` }}
            title={`${data.inProgress} In-Progress`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={12} /> {data.completed} Finished
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Clock size={12} /> {data.inProgress} In-Progress
          </span>
          <span className="flex items-center gap-1 text-text-tertiary">
            <AlertCircle size={12} /> {data.pending} Queued
          </span>
        </div>
      </div>

      {/* Member Status Grid */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase font-bold text-text-tertiary tracking-wider block">
          Assigned Researchers Roster
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {data.roster.map((student) => {
            const isCompleted = student.status === 'COMPLETED'
            const isReading = student.status === 'IN_PROGRESS'

            return (
              <div
                key={student.assignmentId}
                className="p-2.5 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-text-primary block truncate">
                    {student.name}
                  </span>
                  {student.groups.length > 0 && (
                    <span className="text-[10px] text-purple-400 truncate flex items-center gap-1">
                      <Layers size={10} /> {student.groups[0].name}
                    </span>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isReading
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-bg-tertiary text-text-tertiary border-border-default'
                  }`}
                >
                  {isCompleted ? '✓ Read' : isReading ? 'Reading' : 'Queued'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
