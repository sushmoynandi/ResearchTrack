'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { LabProgressReportModal } from '@/components/reports/LabProgressReportModal'
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  Mail,
  Building,
  CheckCircle2,
  Printer,
  Zap,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { Paper } from '@/lib/types'

interface StudentData {
  id: string
  name: string
  email: string
  image: string | null
  institution: string | null
  department: string | null
  systemRole: string
  isActive: boolean
  createdAt: string
  supervisor?: { id: string; name: string } | null
  metrics: {
    totalPapers: number
    completedPapers: number
    readingPapers: number
    toReadPapers: number
    completionRate: number
    pendingAssignments: number
    totalNotes: number
  }
}

export default function StudentsPage() {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [reportStudent, setReportStudent] = useState<StudentData | null>(null)
  const [reportPapers, setReportPapers] = useState<Paper[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  // Nudge Modal State
  const [nudgeStudent, setNudgeStudent] = useState<StudentData | null>(null)
  const [nudgeMessage, setNudgeMessage] = useState('')
  const [sendingNudge, setSendingNudge] = useState(false)

  const handleOpenReport = async (student: StudentData) => {
    setReportStudent(student)
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/papers?studentId=${student.id}`)
      if (res.ok) {
        const data = await res.json()
        setReportPapers(data)
      }
    } catch {
      // silent
    } finally {
      setLoadingReport(false)
    }
  }

  const handleOpenNudge = (student: StudentData) => {
    setNudgeStudent(student)
    setNudgeMessage(`Hi ${student.name.split(' ')[0]}, keep up the momentum! Please check your weekly reading assignments and milestone roadmap.`)
  }

  const handleSendNudge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nudgeStudent) return
    setSendingNudge(true)
    try {
      const res = await fetch('/api/students/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: nudgeStudent.id,
          message: nudgeMessage,
        }),
      })

      if (res.ok) {
        addToast('success', `Encouragement nudge sent to ${nudgeStudent.name}!`)
        setNudgeStudent(null)
      } else {
        addToast('error', 'Failed to send nudge')
      }
    } catch {
      addToast('error', 'Network error sending nudge')
    } finally {
      setSendingNudge(false)
    }
  }

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/students')
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
        }
      } catch (err) {
        console.error('Failed to load students:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <Users size={22} className="text-purple-500" /> Supervised Student Researchers
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Track student reading volume, review completion rates, and examine synthesized notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/assignments">
            <Button icon={<ClipboardList size={16} />}>Assign Reading</Button>
          </Link>
        </div>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="220px" />
          ))}
        </div>
      ) : students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((student) => {
            const isOnTrack = student.metrics.completionRate >= 50 || student.metrics.completedPapers >= 2
            const hasPending = student.metrics.pendingAssignments > 0

            return (
              <div
                key={student.id}
                className="glass-card p-6 flex flex-col justify-between space-y-5 hover:border-purple-500/40 transition-all group"
              >
                <div className="space-y-4">
                  {/* Avatar & Meta */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-500 font-bold text-base flex items-center justify-center shrink-0">
                      {student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base font-bold text-text-primary group-hover:text-purple-400 transition-colors truncate font-display">
                          {student.name}
                        </h3>
                        {/* Health Indicator Badge */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                            isOnTrack
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : hasPending
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isOnTrack ? '🟢 On Track' : hasPending ? '🟡 Tasks Due' : '🔴 Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary truncate flex items-center gap-1 mt-0.5">
                        <Mail size={12} className="text-accent" /> {student.email}
                      </p>
                      <p className="text-[11px] text-text-tertiary truncate flex items-center gap-1 mt-0.5">
                        <GraduationCap size={12} className="text-purple-400" />
                        {student.department || 'Student Researcher'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Metric Bar */}
                  <div className="space-y-1.5 bg-bg-tertiary/60 p-3 rounded-xl border border-border-default/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium flex items-center gap-1">
                        <TrendingUp size={13} className="text-success" /> Reading Progress
                      </span>
                      <span className="font-bold text-text-primary">
                        {student.metrics.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-success h-full rounded-full transition-all duration-500"
                        style={{ width: `${student.metrics.completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-1">
                      <span>{student.metrics.completedPapers} completed</span>
                      <span>{student.metrics.readingPapers} active</span>
                      <span>{student.metrics.toReadPapers} queued</span>
                    </div>
                  </div>

                  {/* KPI counts */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-lg bg-bg-tertiary/40 border border-border-default/40">
                      <p className="text-[10px] text-text-tertiary">Library</p>
                      <p className="text-sm font-bold text-text-primary">{student.metrics.totalPapers}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-bg-tertiary/40 border border-border-default/40">
                      <p className="text-[10px] text-text-tertiary">Notes</p>
                      <p className="text-sm font-bold text-text-primary">{student.metrics.totalNotes}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-bg-tertiary/40 border border-border-default/40">
                      <p className="text-[10px] text-text-tertiary">Pending</p>
                      <p className="text-sm font-bold text-warning">{student.metrics.pendingAssignments}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-border-default flex items-center gap-2">
                  <Link
                    href={`/papers?studentId=${student.id}`}
                    className="flex-1"
                  >
                    <Button size="xs" variant="secondary" className="w-full justify-center" icon={<ArrowRight size={13} />}>
                      Library
                    </Button>
                  </Link>

                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleOpenNudge(student)}
                    icon={<Zap size={13} className="text-amber-400" />}
                    title="Send Research Encouragement Nudge"
                  >
                    Nudge
                  </Button>

                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleOpenReport(student)}
                    icon={<Printer size={13} />}
                  >
                    Report
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            No Supervised Students Assigned
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            When students register and select your institution or are assigned to you by the department administrator, they will appear here.
          </p>
        </div>
      )}

      {/* Lab Progress Report Modal */}
      {reportStudent && (
        <LabProgressReportModal
          isOpen={Boolean(reportStudent)}
          onClose={() => setReportStudent(null)}
          studentName={reportStudent.name}
          studentEmail={reportStudent.email}
          supervisorName={user?.name || 'Faculty Supervisor'}
          institution={reportStudent.institution || 'Academic Research Laboratory'}
          papers={reportPapers}
        />
      )}

      {/* Quick Research Nudge Modal */}
      {nudgeStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-md p-6 shadow-modal space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Zap size={18} className="text-amber-400" /> Send Research Nudge to {nudgeStudent.name}
              </h3>
              <button
                onClick={() => setNudgeStudent(null)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendNudge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Nudge Message *
                </label>
                <textarea
                  value={nudgeMessage}
                  onChange={(e) => setNudgeMessage(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Quick Template Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {[
                    '🔥 Great reading momentum! Keep pushing on Section 2.',
                    '⚡ Remember to complete the 20-col survey for your assigned paper.',
                    '📅 Let’s review your thesis milestone draft at our next 1-on-1 check-in.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNudgeMessage(preset)}
                      className="px-2 py-1 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default text-[10px] text-left cursor-pointer"
                    >
                      {preset.slice(0, 45)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setNudgeStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={sendingNudge} icon={<Zap size={13} className="text-amber-400" />}>
                  Send Nudge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
