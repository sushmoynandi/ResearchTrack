'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { LabProgressReportModal } from '@/components/reports/LabProgressReportModal'
import { StudentProfileModal, StudentProfileData } from '@/components/students/StudentProfileModal'
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
  Calendar,
  Sparkles,
  Search,
  Plus,
  Layers,
  Clock,
  ExternalLink,
  CheckSquare,
  AlertCircle,
  Zap,
  UserCheck,
  UserPlus,
  UserX,
  Info,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  GithubIcon,
  LinkedInIcon,
  GoogleScholarIcon,
  OrcidIcon,
  HuggingFaceIcon,
} from '@/components/ui/Icons'
import type { Paper } from '@/lib/types'

type StudentData = StudentProfileData

export default function StudentsPage() {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TASKS_DUE' | 'HIGH_VELOCITY' | 'INACTIVE'>('ALL')
  const [viewMode, setViewMode] = useState<'SUPERVISED' | 'DISCOVER'>('SUPERVISED')

  // Detailed Student Profile & Affiliation Modal
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<StudentData | null>(null)

  // Report Modal
  const [reportStudent, setReportStudent] = useState<StudentData | null>(null)
  const [reportPapers, setReportPapers] = useState<Paper[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  // Advice Modal
  const [adviceStudent, setAdviceStudent] = useState<StudentData | null>(null)
  const [adviceMessage, setAdviceMessage] = useState('')
  const [sendingAdvice, setSendingAdvice] = useState(false)

  // Assign Paper Modal
  const [assignStudent, setAssignStudent] = useState<StudentData | null>(null)
  const [availablePapers, setAvailablePapers] = useState<Paper[]>([])
  const [selectedStudentPaperIds, setSelectedStudentPaperIds] = useState<string[]>([])
  const [studentPaperSearch, setStudentPaperSearch] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigningPaper, setAssigningPaper] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState(false)

  // Schedule Meeting Modal
  const [meetingStudent, setMeetingStudent] = useState<StudentData | null>(null)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDiscussionTopic, setMeetingDiscussionTopic] = useState('')
  const [meetingScheduledAt, setMeetingScheduledAt] = useState('')
  const [schedulingMeeting, setSchedulingMeeting] = useState(false)

  const fetchStudents = async () => {
    if (!user || (!isSupervisor && !isAdmin)) return
    setLoading(true)
    try {
      const modeParam = viewMode === 'DISCOVER' ? '?mode=all' : ''
      const res = await fetch(`/api/students${modeParam}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('API Error in students page:', err)
        addToast('error', err.error || 'Failed to load students roster')
      }
    } catch (err) {
      console.error('Failed to load students:', err)
      addToast('error', 'Network error loading students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && (isSupervisor || isAdmin)) {
      fetchStudents()
    } else if (user) {
      setLoading(false)
    }
  }, [viewMode, user, isSupervisor, isAdmin])

  // Send Supervision Claim Invitation
  const handleLinkStudent = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch('/api/students/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      if (res.ok) {
        addToast('success', `Supervision invitation sent to ${studentName}! 🎓`)
        fetchStudents()
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to send invitation')
      }
    } catch {
      addToast('error', 'Network error sending invitation')
    }
  }

  // Cancel Pending Supervision Invitation
  const handleCancelRequest = async (requestId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/students/requests/${requestId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('info', `Invitation to ${studentName} canceled`)
        fetchStudents()
      } else {
        addToast('error', 'Failed to cancel invitation')
      }
    } catch {
      addToast('error', 'Network error canceling invitation')
    }
  }

  // Unlink Student
  const handleUnlinkStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from your direct supervision roster?`)) return
    try {
      const res = await fetch(`/api/students?studentId=${studentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', `${studentName} unlinked from supervision roster`)
        fetchStudents()
      } else {
        addToast('error', 'Failed to unlink student')
      }
    } catch {
      addToast('error', 'Network error unlinking student')
    }
  }

  // Handle Assign Paper
  const handleOpenAssign = async (student: StudentData) => {
    setAssignStudent(student)
    setAssignDueDate('')
    setAssignNote('')
    if (availablePapers.length === 0) {
      setLoadingPapers(true)
      try {
        const res = await fetch('/api/papers')
        if (res.ok) {
          const data = await res.json()
          setAvailablePapers(data)
          if (data.length > 0 && selectedStudentPaperIds.length === 0) {
            setSelectedStudentPaperIds([data[0].id])
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingPapers(false)
      }
    } else if (availablePapers.length > 0 && selectedStudentPaperIds.length === 0) {
      setSelectedStudentPaperIds([availablePapers[0].id])
    }
  }

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignStudent || selectedStudentPaperIds.length === 0) {
      addToast('error', 'Please select at least one paper')
      return
    }
    setAssigningPaper(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperIds: selectedStudentPaperIds,
          studentId: assignStudent.id,
          targetType: 'STUDENT',
          dueDate: assignDueDate || undefined,
          note: assignNote || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addToast('success', data.message || `Assigned ${selectedStudentPaperIds.length} paper(s) to ${assignStudent.name}!`)
        setAssignStudent(null)
        setSelectedStudentPaperIds([])
        fetchStudents()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to assign paper(s)')
      }
    } catch {
      addToast('error', 'Network error assigning paper')
    } finally {
      setAssigningPaper(false)
    }
  }

  // Handle Meeting Scheduling
  const handleOpenMeeting = (student: StudentData) => {
    setMeetingStudent(student)
    setMeetingTitle(`1-on-1 Meeting: ${student.name}`)
    setMeetingDiscussionTopic('')
    const defaultTime = new Date()
    defaultTime.setDate(defaultTime.getDate() + 2)
    defaultTime.setHours(10, 0, 0, 0)
    setMeetingScheduledAt(defaultTime.toISOString().slice(0, 16))
  }

  const handleConfirmMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetingStudent || !meetingScheduledAt) return
    setSchedulingMeeting(true)

    try {
      const localFormattedTime = new Date(meetingScheduledAt).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle.trim() || `1-on-1 Meeting: ${meetingStudent.name}`,
          topic: meetingDiscussionTopic.trim() || undefined,
          scheduledAt: new Date(meetingScheduledAt).toISOString(),
          formattedTime: localFormattedTime,
          studentId: meetingStudent.id,
          supervisorId: user?.id,
        }),
      })

      if (res.ok) {
        addToast('success', `Meeting scheduled with ${meetingStudent.name} and student notified!`)
        setMeetingStudent(null)
        fetchStudents()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to schedule meeting')
      }
    } catch {
      addToast('error', 'Network error scheduling meeting')
    } finally {
      setSchedulingMeeting(false)
    }
  }

  // Handle Progress Report
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

  // Handle Advice
  const handleOpenAdvice = (student: StudentData) => {
    setAdviceStudent(student)
    setAdviceMessage(`Hi ${student.name.split(' ')[0]}, keep up the great momentum! Focus on your weekly paper reading goals and lab deliverables.`)
  }

  const handleSendAdvice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adviceStudent) return
    setSendingAdvice(true)
    try {
      const res = await fetch('/api/students/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: adviceStudent.id,
          message: adviceMessage,
        }),
      })

      if (res.ok) {
        addToast('success', `Research advice & mobile push sent to ${adviceStudent.name}!`)
        setAdviceStudent(null)
      } else {
        addToast('error', 'Failed to send advice')
      }
    } catch {
      addToast('error', 'Network error sending advice')
    } finally {
      setSendingAdvice(false)
    }
  }

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = s.name.toLowerCase().includes(q)
      const matchEmail = s.email.toLowerCase().includes(q)
      const matchDept = s.department?.toLowerCase().includes(q)
      const matchLab = s.labMemberships.some((m) => m.lab.name.toLowerCase().includes(q))
      if (!matchName && !matchEmail && !matchDept && !matchLab) return false
    }

    if (statusFilter === 'TASKS_DUE') return s.metrics.healthStatus === 'TASKS_DUE'
    if (statusFilter === 'HIGH_VELOCITY') return s.metrics.healthStatus === 'HIGH_VELOCITY'
    if (statusFilter === 'INACTIVE') return s.metrics.healthStatus === 'INACTIVE'
    return true
  })

  // Aggregate Supervisor Analytics
  const totalStudents = students.length
  const totalAssignedPapers = students.reduce((acc, s) => acc + (s.metrics.totalAssignedPapers || 0), 0)
  const totalCompletedAssigned = students.reduce((acc, s) => acc + (s.metrics.completedAssignedPapers || 0), 0)
  const overallAssignedRate = totalAssignedPapers > 0 ? Math.round((totalCompletedAssigned / totalAssignedPapers) * 100) : 0
  const totalCompletedLibraryPapers = students.reduce((acc, s) => acc + s.metrics.completedPapers, 0)
  const totalActiveReading = students.reduce((acc, s) => acc + s.metrics.readingPapers, 0)
  const totalActiveTasks = students.reduce((acc, s) => acc + s.metrics.activeTasks, 0)
  const totalTasksDue = students.filter((s) => s.metrics.healthStatus === 'TASKS_DUE').length

  if (user && !isSupervisor && !isAdmin) {
    return (
      <div className="max-w-xl mx-auto glass-card p-12 text-center space-y-4 my-12">
        <Users size={36} className="mx-auto text-purple-400 opacity-40" />
        <h3 className="text-lg font-bold text-text-primary font-display">Supervisor Access Only</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          The Student Supervision Roster is dedicated for faculty advisors and lab leads. View your assigned readings and lab tasks from your personal dashboard.
        </p>
        <Link href="/dashboard">
          <Button variant="primary" size="sm">
            Back to Student Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-purple-500/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Advisor Supervision Hub
            </span>
            <span className="text-xs text-text-tertiary">
              {user?.name} · {user?.department || user?.institution || 'Faculty Supervisor'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2.5">
            <Users size={26} className="text-purple-400" /> Student Supervision &amp; Mentorship
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
            Live synchronization with all your student researchers. Track paper reading completion, examine synthesized notes, assign lab deliverables, and conduct 1-on-1 syncs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/assignments">
            <Button size="sm" variant="secondary" icon={<ClipboardList size={14} />}>
              Reading Assignments
            </Button>
          </Link>
          <Link href="/labs">
            <Button size="sm" variant="primary" icon={<CheckSquare size={14} />}>
              Lab Tasks Suite
            </Button>
          </Link>
        </div>
      </div>

      {/* Executive Supervision Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="glass-card p-4 space-y-1 border-border-default/80">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Supervised Students</span>
            <GraduationCap size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{totalStudents}</p>
          <p className="text-[11px] text-text-tertiary">Active researchers in your orbit</p>
        </div>

        <div className="glass-card p-4 space-y-1 border-border-default/80">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Assigned Paper Reading</span>
            <BookOpen size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary font-display">
            {totalCompletedAssigned} <span className="text-base text-text-tertiary font-normal">/ {totalAssignedPapers}</span>
          </p>
          <p className="text-[11px] text-text-tertiary">
            {overallAssignedRate}% assigned reading completion
          </p>
        </div>

        <div className="glass-card p-4 space-y-1 border-border-default/80">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Papers Read</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{totalCompletedLibraryPapers}</p>
          <p className="text-[11px] text-text-tertiary">{totalActiveReading} currently in progress across libraries</p>
        </div>

        <div className="glass-card p-4 space-y-1 border-border-default/80">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Lab Tasks</span>
            <CheckSquare size={16} className="text-accent" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{totalActiveTasks}</p>
          <p className="text-[11px] text-text-tertiary">{totalTasksDue} students with pending actions</p>
        </div>
      </div>

      {/* Toolbar & Tab Switcher Bar */}
      <div className="space-y-4">
        {/* Main Tab Navigation */}
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('SUPERVISED')
                setStatusFilter('ALL')
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'SUPERVISED'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default'
              }`}
            >
              <GraduationCap size={15} />
              <span>My Supervised Students</span>
              {viewMode === 'SUPERVISED' && !loading && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                  {students.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setViewMode('DISCOVER')
                setStatusFilter('ALL')
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'DISCOVER'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default'
              }`}
            >
              <UserPlus size={15} />
              <span>Find &amp; Add Students</span>
              {viewMode === 'DISCOVER' && !loading && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                  {students.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-text-tertiary font-mono hidden sm:inline-block">
            {viewMode === 'SUPERVISED' ? 'Active Supervision Roster' : 'Campus Student Directory'}
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-2xl bg-bg-secondary border border-border-default">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder={
                viewMode === 'DISCOVER'
                  ? 'Search student name, email, department to add...'
                  : 'Search student by name, email, department, lab...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Filter Pills (Shown in Supervised view) */}
          {viewMode === 'SUPERVISED' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All Students' },
                { id: 'TASKS_DUE', label: '📥 Needs Attention / Tasks Due' },
                { id: 'HIGH_VELOCITY', label: '🟢 High Velocity' },
                { id: 'INACTIVE', label: '⚪ Inactive' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Sparkles size={14} className="text-amber-400" />
              <span>Click <strong>&ldquo;+ Add to My Supervision&rdquo;</strong> to link student researchers to your advisory hub.</span>
            </div>
          )}
        </div>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="320px" />
          ))}
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => {
            const isDirect = student.isDirectlySupervised
            const health = student.metrics?.healthStatus || 'INACTIVE'

            // --- DISCOVERY CARD: Clean, Privacy-Conscious & User-Friendly ---
            if (viewMode === 'DISCOVER') {
              return (
                <div
                  key={student.id}
                  className="glass-card p-5 flex flex-col justify-between space-y-4 border-border-default/80 hover:border-accent/50 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name & Dept */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center font-bold text-accent text-base shrink-0 border border-border-default overflow-hidden">
                        {student.image ? (
                          <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors truncate font-display">
                          {student.name}
                        </h3>
                        <p className="text-xs text-text-tertiary truncate flex items-center gap-1 mt-0.5">
                          <Mail size={12} className="text-accent shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </p>
                        <p className="text-[11px] text-text-secondary truncate flex items-center gap-1 mt-0.5">
                          <GraduationCap size={12} className="text-purple-400 shrink-0" />
                          <span>{student.department || student.institution || 'Student Researcher'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bio Snippet if available */}
                    {student.bio && (
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed bg-bg-tertiary/50 p-2.5 rounded-xl border border-border-default/50">
                        {student.bio}
                      </p>
                    )}

                    {/* Advisor / Supervision Status Pill */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {isDirect ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                          <UserCheck size={10} /> Already Supervised by You
                        </span>
                      ) : student.supervisor ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <GraduationCap size={10} /> Advisor: {student.supervisor.name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Available for Supervision
                        </span>
                      )}

                      {/* Lab Membership if any */}
                      {student.labMemberships && student.labMemberships.length > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-bg-tertiary text-text-secondary border border-border-default flex items-center gap-1">
                          <Building size={10} className="text-accent" /> {student.labMemberships[0].lab.name}
                        </span>
                      )}
                    </div>

                    {/* Social & Academic Profile Badges */}
                    {(student.githubUrl || student.linkedinUrl || student.googleScholarUrl || student.orcidUrl || student.huggingFaceUrl) && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {student.githubUrl && (
                          <a
                            href={student.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-tertiary hover:text-text-primary transition-colors p-1 rounded-md bg-bg-tertiary"
                            title="GitHub Profile"
                          >
                            <GithubIcon size={12} />
                          </a>
                        )}
                        {student.linkedinUrl && (
                          <a
                            href={student.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400/70 hover:text-blue-400 transition-colors p-1 rounded-md bg-bg-tertiary"
                            title="LinkedIn Profile"
                          >
                            <LinkedInIcon size={12} />
                          </a>
                        )}
                        {student.googleScholarUrl && (
                          <a
                            href={student.googleScholarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400/70 hover:text-sky-400 transition-colors p-1 rounded-md bg-bg-tertiary"
                            title="Google Scholar Profile"
                          >
                            <GoogleScholarIcon size={12} />
                          </a>
                        )}
                        {student.orcidUrl && (
                          <a
                            href={student.orcidUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400/70 hover:text-emerald-400 transition-colors p-1 rounded-md bg-bg-tertiary"
                            title="ORCID iD"
                          >
                            <OrcidIcon size={12} />
                          </a>
                        )}
                        {student.huggingFaceUrl && (
                          <a
                            href={student.huggingFaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400/70 hover:text-amber-400 transition-colors p-1 rounded-md bg-bg-tertiary"
                            title="Hugging Face Models"
                          >
                            <HuggingFaceIcon size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discovery Action Footer */}
                  <div className="pt-3 border-t border-border-default/60 flex items-center justify-end">
                    {isDirect ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <UserCheck size={13} /> Supervised
                      </span>
                    ) : student.pendingSupervisionRequest ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Clock size={12} /> Invite Pending
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(student.pendingSupervisionRequest!.id, student.name)}
                          className="text-[11px] text-text-tertiary hover:text-danger transition-colors cursor-pointer underline"
                          title="Cancel invitation"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleLinkStudent(student.id, student.name)}
                        icon={<UserPlus size={13} />}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-sm"
                      >
                        + Add to My Supervision
                      </Button>
                    )}
                  </div>
                </div>
              )
            }

            // --- SUPERVISED CARD: Full Analytics, Reading Stats, Deliverables & Actions ---
            return (
              <div
                key={student.id}
                className={`glass-card p-6 flex flex-col justify-between space-y-5 transition-all duration-200 group hover:border-purple-500/50 relative ${
                  health === 'TASKS_DUE'
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : health === 'HIGH_VELOCITY'
                    ? 'border-emerald-500/30'
                    : 'border-border-default/80'
                }`}
              >
                {/* Header: Student Info & Health Status */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-base shadow-md overflow-hidden">
                        {student.image ? (
                          <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-bg-primary ${
                          health === 'HIGH_VELOCITY'
                            ? 'bg-emerald-400'
                            : health === 'TASKS_DUE'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-text-tertiary'
                        }`}
                        title={`Status: ${health}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base font-bold text-text-primary group-hover:text-purple-400 transition-colors truncate font-display">
                          {student.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border shrink-0 ${
                            health === 'HIGH_VELOCITY'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : health === 'TASKS_DUE'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-bg-tertiary text-text-tertiary border-border-default'
                          }`}
                        >
                          {health === 'HIGH_VELOCITY'
                            ? '🟢 High Velocity'
                            : health === 'TASKS_DUE'
                            ? '🟡 Tasks Due'
                            : '⚪ Inactive'}
                        </span>
                      </div>

                      <p className="text-xs text-text-tertiary truncate flex items-center gap-1">
                        <Mail size={12} className="text-accent shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </p>

                      <p className="text-[11px] text-text-secondary truncate flex items-center gap-1">
                        <GraduationCap size={12} className="text-purple-400 shrink-0" />
                        <span>{student.department || student.institution || 'Student Researcher'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Enrolled Research Labs & Academic Supervision Chips */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isDirect ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <GraduationCap size={10} /> Directly Supervised
                        </span>
                      ) : student.supervisor ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProfileStudent(student)}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Primary Advisor: ${student.supervisor.name} (${student.supervisor.email})`}
                        >
                          <GraduationCap size={10} /> Advisor: {student.supervisor.name}
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-bg-tertiary text-text-tertiary border border-border-default flex items-center gap-1">
                          <Info size={10} /> No Advisor
                        </span>
                      )}

                      {student.labMemberships.map((m) => {
                        const isMyLab = user && m.lab.leadId === user.id
                        return (
                          <button
                            key={m.lab.id}
                            type="button"
                            onClick={() => setSelectedProfileStudent(student)}
                            className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors flex items-center gap-1 cursor-pointer"
                            title={`Lab: ${m.lab.name} · PI / Lead: ${isMyLab ? 'You' : m.lab.lead?.name || 'Faculty Lead'}`}
                          >
                            <Building size={10} /> {m.lab.name} {m.lab.lead?.name ? `(${isMyLab ? 'Your Lab' : m.lab.lead.name})` : ''}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Paper Reading Progress (Assigned vs Total Library) */}
                  <div className="space-y-2.5 bg-bg-tertiary/60 p-3.5 rounded-xl border border-border-default/60">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-primary font-semibold flex items-center gap-1.5">
                          <BookOpen size={13} className="text-purple-400" /> Paper Reading (Assigned)
                        </span>
                        <span className="font-bold text-purple-400 font-mono text-xs">
                          {student.metrics.completedAssignedPapers || 0} / {student.metrics.totalAssignedPapers || 0} Read ({student.metrics.assignedCompletionRate || 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${student.metrics.assignedCompletionRate || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border-default/50 flex items-center justify-between text-[11px] text-text-secondary">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-success" /> Total Library Read:
                      </span>
                      <span className="font-semibold text-text-primary font-mono text-[11px]">
                        {student.metrics.completedPapers} / {student.metrics.totalPapers} ({student.metrics.completionRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Active Lab Tasks */}
                  {student.assignedLabTasks.length > 0 && (
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                          <CheckSquare size={11} /> Lab Tasks ({student.assignedLabTasks.length})
                        </span>
                      </div>
                      {student.assignedLabTasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-2 text-[11px] py-1 border-t border-border-default/40 first:border-0 first:pt-0">
                          <span className="text-text-primary truncate font-medium flex-1">{task.title}</span>
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded font-mono shrink-0 ${task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'}`}>{task.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Supervision Action Matrix */}
                <div className="pt-3 border-t border-border-default space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="xs" variant="secondary" onClick={() => handleOpenAssign(student)} className="text-[11px] justify-center" icon={<BookOpen size={12} />}>Assign</Button>
                    <Button size="xs" variant="secondary" onClick={() => handleOpenMeeting(student)} className="text-[11px] justify-center" icon={<Calendar size={12} />}>Meet</Button>
                    <Button size="xs" variant="secondary" onClick={() => handleOpenAdvice(student)} className="text-[11px] justify-center text-amber-300 hover:text-amber-200" icon={<Zap size={12} />}>Advice</Button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button type="button" onClick={() => setSelectedProfileStudent(student)} className="text-[11px] text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                      <Users size={12} /> Profile
                    </button>
                    {isDirect ? (
                      <button type="button" onClick={() => handleUnlinkStudent(student.id, student.name)} className="text-[10px] text-text-tertiary hover:text-rose-400 transition-colors flex items-center gap-0.5 cursor-pointer">
                        <UserX size={10} /> Unlink
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleLinkStudent(student.id, student.name)} className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer">
                        <UserPlus size={12} /> + Add to My Supervision
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-3">
          <Users size={32} className="mx-auto opacity-30 text-purple-400" />
          <h4 className="text-base font-bold text-text-primary">No Student Researchers Found</h4>
          <p className="max-w-md mx-auto leading-relaxed">
            {viewMode === 'DISCOVER'
              ? 'No registered student researchers matching your search query in the institution.'
              : 'You do not have any students assigned to your supervision roster or enrolled in your labs yet.'}
          </p>
          {viewMode === 'SUPERVISED' && (
            <Button size="sm" variant="primary" onClick={() => setViewMode('DISCOVER')} icon={<UserPlus size={14} />}>
              Find &amp; Add Students
            </Button>
          )}
        </div>
      )}

      {/* Direct Assign Paper Modal */}
      {assignStudent && (
        <Modal
          isOpen={Boolean(assignStudent)}
          onClose={() => setAssignStudent(null)}
          title={`Assign Reading Paper: ${assignStudent.name}`}
          description="Select a research paper from your library to assign to this student."
          size="md"
        >
          <form onSubmit={handleConfirmAssign} className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Select Research Papers * ({selectedStudentPaperIds.length} selected)
                </label>
                {availablePapers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentPaperIds.length === availablePapers.length) {
                        setSelectedStudentPaperIds([])
                      } else {
                        setSelectedStudentPaperIds(availablePapers.map((p) => p.id))
                      }
                    }}
                    className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
                  >
                    {selectedStudentPaperIds.length === availablePapers.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {loadingPapers ? (
                <div className="text-xs text-text-tertiary p-3">Loading papers...</div>
              ) : availablePapers.length > 0 ? (
                <div className="space-y-2">
                  {availablePapers.length > 5 && (
                    <input
                      type="text"
                      placeholder="Search papers to assign..."
                      value={studentPaperSearch}
                      onChange={(e) => setStudentPaperSearch(e.target.value)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-1.5 bg-bg-tertiary/60 border border-border-default rounded-lg p-2 divide-y divide-border-default/40">
                    {availablePapers
                      .filter(
                        (p) =>
                          !studentPaperSearch ||
                          p.title.toLowerCase().includes(studentPaperSearch.toLowerCase()) ||
                          (p.authors && p.authors.toLowerCase().includes(studentPaperSearch.toLowerCase()))
                      )
                      .map((p) => {
                        const isChecked = selectedStudentPaperIds.includes(p.id)
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                              isChecked
                                ? 'bg-accent/15 text-text-primary font-medium'
                                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentPaperIds((prev) => [...prev, p.id])
                                } else {
                                  setSelectedStudentPaperIds((prev) => prev.filter((id) => id !== p.id))
                                }
                              }}
                              className="mt-0.5 accent-accent cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-text-primary leading-tight">{p.title}</span>
                              {p.authors && (
                                <span className="block truncate text-[10px] text-text-tertiary mt-0.5">{p.authors}</span>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    {availablePapers.filter(
                      (p) =>
                        !studentPaperSearch ||
                        p.title.toLowerCase().includes(studentPaperSearch.toLowerCase()) ||
                        (p.authors && p.authors.toLowerCase().includes(studentPaperSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-3 text-center text-xs text-text-tertiary">No matching papers found.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-text-tertiary p-3 bg-bg-tertiary rounded-lg">
                  No papers in your library. Add papers first.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Target Due Date (Optional)
              </label>
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Advisor Guidance &amp; Reading Objectives
              </label>
              <textarea
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Focus on Methodology Section 3.2 and examine their dataset ablation results..."
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setAssignStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={assigningPaper} icon={<Sparkles size={13} />}>
                Assign &amp; Notify Student
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Schedule 1-on-1 Meeting Modal */}
      {meetingStudent && (
        <Modal
          isOpen={Boolean(meetingStudent)}
          onClose={() => setMeetingStudent(null)}
          title={`Schedule 1-on-1 Meeting with ${meetingStudent.name}`}
          description="Set up an advisor-student research sync with discussion agenda and instant notifications."
          size="md"
        >
          <form onSubmit={handleConfirmMeeting} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Meeting Title *
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Weekly Research Sync, Model Architecture Review"
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Discussion Topic &amp; Agenda (Optional)
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  'Review literature synthesis notes',
                  'Examine ablation experiment findings',
                  'Thesis milestone roadmap review',
                  'LoRA fine-tuning code walkthrough',
                ].map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMeetingDiscussionTopic((prev) => (prev ? `${prev}\n• ${topic}` : `• ${topic}`))}
                    className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-elevated text-text-secondary transition-colors cursor-pointer"
                  >
                    + {topic}
                  </button>
                ))}
              </div>
              <textarea
                value={meetingDiscussionTopic}
                onChange={(e) => setMeetingDiscussionTopic(e.target.value)}
                placeholder="• Discuss Methodology Section 3.2&#10;• Review baseline evaluation results&#10;• Set deliverables for next sprint..."
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Scheduled Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                value={meetingScheduledAt}
                onChange={(e) => setMeetingScheduledAt(e.target.value)}
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setMeetingStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={schedulingMeeting} icon={<Calendar size={13} />}>
                Schedule &amp; Notify Student
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Advice Modal */}
      {adviceStudent && (
        <Modal
          isOpen={Boolean(adviceStudent)}
          onClose={() => setAdviceStudent(null)}
          title={`Send Advisor Advice: ${adviceStudent.name}`}
          description="Send direct research advice, guidance, or feedback with instant mobile push alerts to this student."
          size="sm"
        >
          <form onSubmit={handleSendAdvice} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Quick Advice Templates:
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  'Keep up the great momentum! 🚀',
                  'Focus on methodology section 3.2 in paper reading.',
                  'Checking in on your ablation experiment results.',
                  'Great job on your literature synthesis notes! 👏',
                  'Please update your deliverable before our upcoming meeting.',
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAdviceMessage(tmpl)}
                    className="text-[10px] px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-elevated text-text-secondary transition-colors cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>

              <textarea
                value={adviceMessage}
                onChange={(e) => setAdviceMessage(e.target.value)}
                rows={3}
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setAdviceStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={sendingAdvice} icon={<Zap size={13} />}>
                Send Advice Alert
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Lab Progress Report Modal */}
      {reportStudent && (
        <LabProgressReportModal
          isOpen={Boolean(reportStudent)}
          onClose={() => setReportStudent(null)}
          student={reportStudent}
          supervisorName={user?.name || 'Faculty Advisor'}
          papers={reportPapers}
        />
      )}

      {/* Detailed Student Researcher Profile & Affiliation Modal */}
      {selectedProfileStudent && (
        <StudentProfileModal
          isOpen={Boolean(selectedProfileStudent)}
          onClose={() => setSelectedProfileStudent(null)}
          student={selectedProfileStudent}
          onLinkSuccess={() => {
            fetchStudents()
            setSelectedProfileStudent(null)
          }}
          onUnlinkSuccess={() => {
            fetchStudents()
            setSelectedProfileStudent(null)
          }}
          onOpenAssign={(s) => handleOpenAssign(s)}
          onOpenMeeting={(s) => handleOpenMeeting(s)}
          onOpenAdvice={(s) => handleOpenAdvice(s)}
        />
      )}
    </div>
  )
}
