'use client'

import React, { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  Printer,
  Download,
  Copy,
  FileText,
  CheckCircle2,
  Trophy,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  Check,
  Building,
  CheckSquare,
  BookOpen,
  AlertCircle,
  Clock,
  ExternalLink,
  Award,
  ShieldCheck,
  TrendingUp,
  Target,
  BarChart3,
  BookmarkCheck,
  User,
  Activity,
  CheckCheck,
} from 'lucide-react'
import type { Paper } from '@/lib/types'

export interface StudentReportData {
  id: string
  name: string
  email: string
  institution?: string | null
  department?: string | null
  labMemberships?: { role?: string; lab: { id: string; name: string; slug: string } }[]
  groupMemberships?: { role?: string; group: { id: string; name: string; color: string } }[]
  assignedPapers?: {
    id: string
    status: string
    dueDate?: string | null
    paper: { id: string; title: string; status: string; publicationYear?: number | null; authors?: string | null }
  }[]
  assignedLabTasks?: {
    id: string
    title: string
    category: string
    priority: string
    status: string
    deliverableUrl?: string | null
    dueDate?: string | null
  }[]
  milestonesAsStudent?: {
    id: string
    title: string
    status: string
    dueDate?: string | null
  }[]
  meetingsAsStudent?: {
    id: string
    title: string
    scheduledAt: string
    status: string
  }[]
  metrics?: {
    totalAssignedPapers: number
    completedAssignedPapers: number
    inProgressAssignedPapers?: number
    pendingAssignedPapers?: number
    assignedCompletionRate: number
    totalPapers: number
    completedPapers: number
    readingPapers: number
    toReadPapers?: number
    completionRate: number
    totalTasks?: number
    activeTasks?: number
    completedTasks?: number
    totalMilestones?: number
    completedMilestones?: number
    totalNotes: number
    healthStatus?: string
  }
}

interface LabProgressReportModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentReportData | null
  supervisorName: string
  papers: Paper[]
}

export function LabProgressReportModal({
  isOpen,
  onClose,
  student,
  supervisorName,
  papers,
}: LabProgressReportModalProps) {
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'SCORECARD' | 'LITERATURE'>('AUDIT')
  const reportRef = useRef<HTMLDivElement>(null)

  if (!student) return null

  const studentName = student.name
  const studentEmail = student.email
  const institution = student.institution || 'Academic Research Laboratory'
  const department = student.department || 'Department of Computer Science & Engineering'
  const labName = student.labMemberships && student.labMemberships.length > 0
    ? student.labMemberships.map((m) => m.lab.name).join(', ')
    : 'Central Research Lab'
  const groupName = student.groupMemberships && student.groupMemberships.length > 0
    ? student.groupMemberships.map((g) => g.group.name).join(', ')
    : 'Core Research Cluster'

  // Detailed Metrics computation
  const totalAssigned = student.metrics?.totalAssignedPapers ?? (student.assignedPapers?.length || 0)
  const completedAssigned = student.metrics?.completedAssignedPapers ?? (student.assignedPapers?.filter((a) => a.status === 'COMPLETED').length || 0)
  const inProgressAssigned = student.metrics?.inProgressAssignedPapers ?? (student.assignedPapers?.filter((a) => a.status === 'IN_PROGRESS').length || 0)
  const pendingAssigned = student.metrics?.pendingAssignedPapers ?? (student.assignedPapers?.filter((a) => a.status === 'PENDING').length || 0)
  const assignedRate = student.metrics?.assignedCompletionRate ?? (totalAssigned > 0 ? Math.round((completedAssigned / totalAssigned) * 100) : 0)

  const completedPapers = papers.filter((p) => p.status === 'COMPLETED')
  const inProgressPapers = papers.filter((p) => p.status === 'READING')
  const toReadPapers = papers.filter((p) => p.status === 'TO_READ')
  const totalNotes = student.metrics?.totalNotes ?? papers.reduce((acc, p) => acc + (p.notes?.length || 0), 0)
  const libraryRate = papers.length > 0 ? Math.round((completedPapers.length / papers.length) * 100) : 0

  const labTasks = student.assignedLabTasks || []
  const completedTasks = labTasks.filter((t) => t.status === 'COMPLETED')
  const inReviewTasks = labTasks.filter((t) => t.status === 'IN_REVIEW')
  const inProgressTasks = labTasks.filter((t) => t.status === 'IN_PROGRESS')
  const taskRate = labTasks.length > 0 ? Math.round((completedTasks.length / labTasks.length) * 100) : 0

  const milestones = student.milestonesAsStudent || []
  const completedMilestones = milestones.filter((m) => m.status === 'APPROVED')
  const milestoneRate = milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0

  const meetings = student.meetingsAsStudent || []

  // Cumulative Research Performance Index (CRI Score out of 100)
  // Weighting: Assigned Paper Reading 35%, Lab Deliverables 35%, Synthesis & Notes 15%, Milestones & Syncs 15%
  const assignedScore = totalAssigned > 0 ? (completedAssigned / totalAssigned) * 35 : (completedPapers.length > 0 ? 30 : 20)
  const taskScore = labTasks.length > 0 ? (completedTasks.length / labTasks.length) * 35 : 30
  const notesScore = Math.min(15, (totalNotes / 5) * 15)
  const milestoneScore = milestones.length > 0 ? (completedMilestones.length / milestones.length) * 15 : (meetings.length > 0 ? 12 : 10)
  const cumulativeIndex = Math.min(100, Math.round(assignedScore + taskScore + notesScore + milestoneScore))

  // Academic Standing & Grade
  let gradeLetter = 'B'
  let gradeTitle = 'Satisfactory Research Progress'
  let gradeColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
  let gradeVerdict = 'Consistent progress. Continues to meet core research deliverables and survey reading objectives.'

  if (cumulativeIndex >= 90) {
    gradeLetter = 'A+'
    gradeTitle = 'Distinguished Research Scholar'
    gradeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15'
    gradeVerdict = 'Exceptional research velocity. Outstanding mastery of literature, experimental deliverables, and synthesis.'
  } else if (cumulativeIndex >= 80) {
    gradeLetter = 'A'
    gradeTitle = 'High Research Velocity'
    gradeColor = 'text-purple-400 border-purple-500/40 bg-purple-500/15'
    gradeVerdict = 'High performance across reading and experimental tasks. Actively advances laboratory objectives.'
  } else if (cumulativeIndex >= 70) {
    gradeLetter = 'B+'
    gradeTitle = 'Commendable Progress'
    gradeColor = 'text-blue-400 border-blue-500/40 bg-blue-500/15'
    gradeVerdict = 'Solid momentum. Steady completion of literature review with ongoing experimental work.'
  } else if (cumulativeIndex < 60) {
    gradeLetter = 'C'
    gradeTitle = 'Needs Academic Alignment'
    gradeColor = 'text-amber-400 border-amber-500/40 bg-amber-500/15'
    gradeVerdict = 'Requires advisor sync. Delinquent paper reading or pending experimental tasks require immediate attention.'
  }

  const handlePrint = () => {
    window.print()
  }

  const generateMarkdownReport = () => {
    let md = `# OFFICIAL ACADEMIC RESEARCH PROGRESS & LABORATORY AUDIT REPORT\n\n`
    md += `**Document Identifier:** REF-LAB-${student.id.slice(-6).toUpperCase()}-${new Date().getFullYear()}\n`
    md += `**Institution / University:** ${institution}\n`
    md += `**Department:** ${department}\n`
    md += `**Research Laboratory:** ${labName} · Cluster: ${groupName}\n`
    md += `**Student Researcher:** ${studentName} (${studentEmail})\n`
    md += `**Faculty Supervisor (PI):** ${supervisorName}\n`
    md += `**Evaluation Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}\n`
    md += `**Cumulative Research Index (CRI):** ${cumulativeIndex} / 100 (Grade: ${gradeLetter} - ${gradeTitle})\n\n`
    md += `> **Supervisor Evaluation Summary:** ${gradeVerdict}\n\n`
    md += `---\n\n`

    md += `## 1. Multi-Dimensional Performance Scorecard\n`
    md += `- **Assigned Paper Reading:** ${completedAssigned} / ${totalAssigned} Completed (${assignedRate}%)\n`
    md += `- **Total Library Literature:** ${completedPapers.length} / ${papers.length} Synthesized (${libraryRate}%)\n`
    md += `- **Lab Experimental Tasks:** ${completedTasks.length} / ${labTasks.length} Delivered (${taskRate}%)\n`
    md += `- **Literature Synthesis Notes:** ${totalNotes} annotations recorded\n`
    md += `- **Milestones Approved:** ${completedMilestones.length} / ${milestones.length} milestones\n`
    md += `- **1-on-1 Advisor Syncs:** ${meetings.length} meetings conducted\n\n`

    if (student.assignedPapers && student.assignedPapers.length > 0) {
      md += `## 2. Supervisor-Assigned Paper Reading Matrix\n\n`
      md += `| Assigned Literature | Due Date | Status |\n`
      md += `| :--- | :--- | :--- |\n`
      student.assignedPapers.forEach((a) => {
        const due = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'Self-paced'
        md += `| **${a.paper.title.replace(/\|/g, '-')}** | ${due} | ${a.status} |\n`
      })
      md += `\n`
    }

    if (labTasks.length > 0) {
      md += `## 3. Laboratory Experimental Deliverables & Tasks\n\n`
      md += `| Task Title | Category | Priority | Status | Deliverable Link |\n`
      md += `| :--- | :--- | :--- | :--- | :--- |\n`
      labTasks.forEach((t) => {
        md += `| **${t.title.replace(/\|/g, '-')}** | ${t.category} | ${t.priority} | ${t.status} | ${t.deliverableUrl || 'Pending'} |\n`
      })
      md += `\n`
    }

    if (completedPapers.length > 0) {
      md += `## 4. Completed Literature Review Matrix\n\n`
      md += `| Paper Title | Year | Core Contribution / Findings |\n`
      md += `| :--- | :--- | :--- |\n`
      completedPapers.forEach((p) => {
        md += `| **${p.title.replace(/\|/g, '-')}** | ${p.publicationYear || 'N/A'} | ${(p.keyContribution || p.problemSolved || 'Empirical validation complete').slice(0, 80).replace(/\|/g, '-')} |\n`
      })
      md += `\n`
    }

    md += `## 5. Faculty Endorsement & Certification\n\n`
    md += `I hereby certify that the student researcher's performance and laboratory deliverables have been evaluated in accordance with departmental standards.\n\n`
    md += `**Faculty Supervisor Signature:** ____________________________   **Date:** ${new Date().toLocaleDateString()}\n`
    return md
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport())
    setCopied(true)
    addToast('success', 'Copied Academic Progress Report to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = generateMarkdownReport()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `academic_progress_report_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('success', 'Downloaded Progress Report (.md)')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Academic Progress & Performance Report"
      description="Formal evaluation transcript covering paper reading, lab deliverables, and research velocity."
      size="lg"
    >
      <div className="space-y-6 pt-2">
        {/* Top Control & Tab Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg-tertiary rounded-2xl border border-border-default">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-border-default">
            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'AUDIT'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <FileText size={13} /> Full Audit Report
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SCORECARD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SCORECARD'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <BarChart3 size={13} /> Performance Pillars
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LITERATURE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LITERATURE'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <BookOpen size={13} /> Literature Survey ({completedPapers.length})
            </button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="secondary"
              onClick={handleCopy}
              icon={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            >
              {copied ? 'Copied' : 'Copy MD'}
            </Button>
            <Button size="xs" variant="secondary" onClick={handleDownload} icon={<Download size={12} />}>
              Download .md
            </Button>
            <Button size="xs" variant="primary" onClick={handlePrint} icon={<Printer size={12} />}>
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Printable Official Academic Transcript Canvas */}
        <div
          ref={reportRef}
          className="p-8 sm:p-10 rounded-2xl bg-bg-primary border border-border-default space-y-8 text-text-primary shadow-lg font-sans"
        >
          {/* Institutional Official Header */}
          <div className="border-b-2 border-purple-500/70 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-widest border border-purple-500/30 flex items-center gap-1">
                  <Building size={12} /> {institution}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">
                  ID: REF-LAB-{student.id.slice(-6).toUpperCase()}-{new Date().getFullYear()}
                </span>
              </div>
              <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
                Academic Research Progress &amp; Laboratory Audit
              </h2>
              <p className="text-xs text-text-secondary">
                {department} · {labName} · Evaluation Cycle {new Date().getFullYear()}
              </p>
            </div>

            {/* Performance Grade Badge */}
            <div className="sm:text-right space-y-1">
              <div className="text-xs text-text-tertiary font-mono">
                Evaluated: {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${gradeColor}`}>
                <Trophy size={14} />
                <span>Grade {gradeLetter} · {gradeTitle}</span>
              </div>
            </div>
          </div>

          {/* Student & Supervisor Dossier Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-bg-secondary border border-border-default text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold flex items-center justify-center text-sm">
                  {studentName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Student Researcher</span>
                  <strong className="text-sm text-text-primary font-display">{studentName}</strong>
                </div>
              </div>
              <div className="space-y-0.5 text-text-secondary pl-10">
                <p>Email: {studentEmail}</p>
                <p>Laboratory: <span className="text-accent font-medium">{labName}</span></p>
                <p>Research Cluster: <span className="text-purple-400 font-medium">{groupName}</span></p>
              </div>
            </div>

            <div className="space-y-2 md:border-l md:border-border-default md:pl-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm">
                  PI
                </div>
                <div>
                  <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Faculty Supervisor (PI)</span>
                  <strong className="text-sm text-text-primary font-display">{supervisorName}</strong>
                </div>
              </div>
              <div className="space-y-0.5 text-text-secondary pl-10">
                <p>Role: Principal Investigator &amp; Graduate Mentor</p>
                <p>Standing: Primary Advisory Committee</p>
                <p className="text-emerald-400 font-semibold pt-0.5">Status: Active Supervision</p>
              </div>
            </div>
          </div>

          {/* Cumulative Scorecard & Grade Radar Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-bg-secondary to-accent/10 border border-purple-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Cumulative Research Index (CRI)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-display text-text-primary">{cumulativeIndex}</span>
                  <span className="text-xs text-text-tertiary font-mono">/ 100 Index Points</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${gradeColor}`}>
                    Tier {gradeLetter}
                  </span>
                </div>
              </div>

              <div className="text-xs text-text-secondary max-w-sm sm:text-right italic">
                &ldquo;{gradeVerdict}&rdquo;
              </div>
            </div>

            <div className="w-full bg-bg-primary h-2.5 rounded-full overflow-hidden border border-border-default/80">
              <div
                className="bg-gradient-to-r from-purple-500 via-accent to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${cumulativeIndex}%` }}
              />
            </div>
          </div>

          {/* 4 Multi-Dimensional Activity Pillars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Award size={14} className="text-purple-400" /> Whole Laboratory Performance Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Pillar 1: Assigned Paper Reading */}
              <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <BookOpen size={13} className="text-purple-400" /> Assigned Reading
                  </span>
                  <span className="font-mono text-purple-400 font-bold">{assignedRate}%</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${assignedRate}%` }} />
                </div>
                <div className="text-[11px] text-text-tertiary space-y-0.5 font-mono">
                  <p className="text-text-primary font-semibold">{completedAssigned} of {totalAssigned} completed</p>
                  <p>{inProgressAssigned} reading · {pendingAssigned} pending</p>
                </div>
              </div>

              {/* Pillar 2: Total Library Literature */}
              <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <TrendingUp size={13} className="text-success" /> Library Literature
                  </span>
                  <span className="font-mono text-success font-bold">{libraryRate}%</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-success h-full rounded-full" style={{ width: `${libraryRate}%` }} />
                </div>
                <div className="text-[11px] text-text-tertiary space-y-0.5 font-mono">
                  <p className="text-text-primary font-semibold">{completedPapers.length} of {papers.length} read</p>
                  <p>{inProgressPapers.length} in queue · {toReadPapers.length} planned</p>
                </div>
              </div>

              {/* Pillar 3: Lab Deliverables & Tasks */}
              <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <CheckSquare size={13} className="text-accent" /> Lab Deliverables
                  </span>
                  <span className="font-mono text-accent font-bold">{taskRate}%</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-accent h-full rounded-full" style={{ width: `${taskRate}%` }} />
                </div>
                <div className="text-[11px] text-text-tertiary space-y-0.5 font-mono">
                  <p className="text-text-primary font-semibold">{completedTasks.length} of {labTasks.length} delivered</p>
                  <p>{inReviewTasks.length} in review · {inProgressTasks.length} in progress</p>
                </div>
              </div>

              {/* Pillar 4: Synthesis & Mentorship */}
              <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <Target size={13} className="text-amber-400" /> Synthesis &amp; Syncs
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{totalNotes} Notes</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, totalNotes * 20)}%` }} />
                </div>
                <div className="text-[11px] text-text-tertiary space-y-0.5 font-mono">
                  <p className="text-text-primary font-semibold">{totalNotes} annotations recorded</p>
                  <p>{meetings.length} 1-on-1 syncs attended</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Supervisor-Assigned Paper Reading Log */}
          {student.assignedPapers && student.assignedPapers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <BookOpen size={14} className="text-purple-400" /> 1. Supervisor-Assigned Paper Reading Log ({student.assignedPapers.length})
                </h4>
                <span className="text-xs font-mono text-purple-400 font-semibold">
                  {completedAssigned} / {totalAssigned} Completed ({assignedRate}%)
                </span>
              </div>

              <div className="border border-border-default rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                    <tr>
                      <th className="p-3">Assigned Literature Title</th>
                      <th className="p-3">Authors / Year</th>
                      <th className="p-3">Target Due</th>
                      <th className="p-3 text-right">Reading Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                    {student.assignedPapers.map((a) => (
                      <tr key={a.id} className="hover:bg-bg-tertiary/40">
                        <td className="p-3 font-medium text-text-primary max-w-sm truncate">
                          {a.paper.title}
                        </td>
                        <td className="p-3 text-text-secondary text-[11px] truncate max-w-xs">
                          {a.paper.authors || '—'} ({a.paper.publicationYear || 'N/A'})
                        </td>
                        <td className="p-3 text-text-secondary font-mono text-[11px]">
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Self-Paced'}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              a.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : a.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Laboratory Experimental Deliverables & Tasks */}
          {labTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-accent" /> 2. Experimental Deliverables &amp; Research Tasks ({labTasks.length})
                </h4>
                <span className="text-xs font-mono text-accent font-semibold">
                  {completedTasks.length} / {labTasks.length} Delivered ({taskRate}%)
                </span>
              </div>

              <div className="border border-border-default rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                    <tr>
                      <th className="p-3">Task Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Deliverable Asset</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                    {labTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-bg-tertiary/40">
                        <td className="p-3 font-medium text-text-primary max-w-xs truncate">{t.title}</td>
                        <td className="p-3 text-text-secondary text-[11px]">{t.category}</td>
                        <td className="p-3 font-mono text-[10px] text-text-secondary">{t.priority}</td>
                        <td className="p-3 text-[11px]">
                          {t.deliverableUrl ? (
                            <a
                              href={t.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline flex items-center gap-1 font-mono font-medium"
                            >
                              <ExternalLink size={11} /> Asset Link
                            </a>
                          ) : (
                            <span className="text-text-tertiary italic">In Progress</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : t.status === 'IN_REVIEW'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Completed Literature Survey Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success" /> 3. Completed Literature Review &amp; Synthesis Matrix ({completedPapers.length})
              </h4>
              <span className="text-xs font-mono text-success font-semibold">
                {completedPapers.length} of {papers.length} Cataloged
              </span>
            </div>

            {completedPapers.length > 0 ? (
              <div className="border border-border-default rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                    <tr>
                      <th className="p-3">Synthesized Literature</th>
                      <th className="p-3">Year</th>
                      <th className="p-3">Architecture</th>
                      <th className="p-3">Core Innovation &amp; Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                    {completedPapers.map((p) => (
                      <tr key={p.id} className="hover:bg-bg-tertiary/40">
                        <td className="p-3 font-medium text-text-primary max-w-xs truncate">{p.title}</td>
                        <td className="p-3 text-text-secondary font-mono">{p.publicationYear || '—'}</td>
                        <td className="p-3 text-accent font-medium">{p.architecture || 'Standard'}</td>
                        <td className="p-3 text-text-secondary truncate max-w-sm">{p.keyContribution || p.problemSolved || 'Empirical validation complete'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default text-xs text-text-tertiary italic text-center">
                No completed literature papers recorded yet in this evaluation cycle.
              </div>
            )}
          </div>

          {/* Section 4: Faculty Certification & Sign-Off Block */}
          <div className="pt-8 border-t-2 border-border-default grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="space-y-6">
              <p className="text-text-secondary leading-relaxed">
                I hereby certify that the student researcher has met the research milestones, paper readings, and experimental deliverables evaluated in this laboratory audit.
              </p>
              <div className="pt-6 border-t border-border-default text-text-tertiary space-y-1">
                <strong className="text-text-primary block text-sm font-display">Faculty Supervisor Signature</strong>
                <span>Dr. {supervisorName.replace(/^Dr\.\s*/i, '')} · Principal Investigator</span>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-text-secondary leading-relaxed">
                Officially archived into Graduate Research Laboratory Evaluation records.
              </p>
              <div className="pt-6 border-t border-border-default text-text-tertiary space-y-1">
                <strong className="text-text-primary block text-sm font-display">Department Stamp &amp; Date</strong>
                <span>Certified on: {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
