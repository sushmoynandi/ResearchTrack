'use client'

import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import type { Paper } from '@/lib/types'

interface LabProgressReportModalProps {
  isOpen: boolean
  onClose: () => void
  studentName: string
  studentEmail: string
  supervisorName: string
  institution?: string | null
  papers: Paper[]
}

export function LabProgressReportModal({
  isOpen,
  onClose,
  studentName,
  studentEmail,
  supervisorName,
  institution = 'Academic Research Laboratory',
  papers,
}: LabProgressReportModalProps) {
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const completedPapers = papers.filter((p) => p.status === 'COMPLETED')
  const inProgressPapers = papers.filter((p) => p.status === 'READING')
  const totalNotes = papers.reduce((acc, p) => acc + (p.notes?.length || 0), 0)
  const completionRate = papers.length > 0 ? Math.round((completedPapers.length / papers.length) * 100) : 0

  const handlePrint = () => {
    window.print()
  }

  const generateMarkdownReport = () => {
    let md = `# ACADEMIC LITERATURE REVIEW & RESEARCH PROGRESS REPORT\n`
    md += `**Institution:** ${institution}\n`
    md += `**Student Researcher:** ${studentName} (${studentEmail})\n`
    md += `**Faculty Supervisor:** ${supervisorName}\n`
    md += `**Date of Evaluation:** ${new Date().toLocaleDateString()}\n\n`
    md += `---\n\n`
    md += `## 1. Executive Summary & Reading Metrics\n`
    md += `- **Total Cataloged Literature:** ${papers.length} papers\n`
    md += `- **Synthesized & Completed:** ${completedPapers.length} papers (${completionRate}%)\n`
    md += `- **Active Reading Queue:** ${inProgressPapers.length} papers\n`
    md += `- **Total Research Notes / Annotations:** ${totalNotes} annotations\n\n`
    md += `## 2. Completed Literature Review Matrix\n\n`
    md += `| Paper Title | Year | Architecture / Mechanism | Key Contribution | Outcome |\n`
    md += `| :--- | :--- | :--- | :--- | :--- |\n`

    completedPapers.forEach((p) => {
      md += `| **${p.title.replace(/\|/g, '-')}** | ${p.publicationYear || 'N/A'} | ${p.architecture || 'Standard'} | ${(p.keyContribution || p.problemSolved || 'Empirical validation').slice(0, 80).replace(/\|/g, '-')} | Complete |\n`
    })

    md += `\n## 3. Supervisor Endorsements & Committee Signatures\n\n`
    md += `I hereby certify that the student researcher has completed the literature survey requirements outlined above.\n\n`
    md += `**Faculty Supervisor Signature:** ____________________________   **Date:** ____________\n`
    return md
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport())
    setCopied(true)
    addToast('success', 'Copied Progress Report (Markdown) to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = generateMarkdownReport()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progress_report_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('success', 'Downloaded progress report file')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Progress & Thesis Literature Report"
      description="Formal evaluation dossier for faculty meetings, thesis milestones, and grant reporting."
      size="lg"
    >
      <div className="space-y-6 pt-2">
        {/* Action Header */}
        <div className="flex items-center justify-between gap-2 p-3 bg-bg-tertiary rounded-xl border border-border-default">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <GraduationCap size={16} className="text-accent" />
            <span>Formal Report for <strong>{studentName}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" onClick={handleCopy} icon={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}>
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

        {/* Printable Report Canvas */}
        <div
          ref={reportRef}
          className="p-8 rounded-2xl bg-bg-primary border border-border-default space-y-6 text-text-primary shadow-sm font-sans"
        >
          {/* Institutional Header */}
          <div className="border-b-2 border-accent pb-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-bold">
                {institution}
              </span>
              <h2 className="text-xl font-bold font-display text-text-primary mt-1">
                Literature Review &amp; Research Progress Report
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Evaluation Period: Academic Year {new Date().getFullYear()}
              </p>
            </div>

            <div className="text-right text-xs text-text-secondary font-mono">
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <Badge variant="success" size="sm" className="mt-1">
                OFFICIAL REPORT
              </Badge>
            </div>
          </div>

          {/* Student & Supervisor Meta */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-bg-secondary border border-border-default text-xs">
            <div>
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Student Researcher</span>
              <strong className="text-sm text-text-primary">{studentName}</strong>
              <p className="text-text-secondary">{studentEmail}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Faculty Supervisor</span>
              <strong className="text-sm text-text-primary">{supervisorName}</strong>
              <p className="text-text-secondary">Principal Investigator</p>
            </div>
          </div>

          {/* Quantitative Metrics Scorecard */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default">
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Total Papers</span>
              <span className="text-xl font-bold text-text-primary font-display">{papers.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default">
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Synthesized</span>
              <span className="text-xl font-bold text-success font-display">{completedPapers.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default">
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Completion</span>
              <span className="text-xl font-bold text-accent font-display">{completionRate}%</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-default">
              <span className="text-[10px] uppercase text-text-tertiary font-semibold block">Research Notes</span>
              <span className="text-xl font-bold text-purple-400 font-display">{totalNotes}</span>
            </div>
          </div>

          {/* Literature Review Roster */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-accent" /> Completed Literature Survey Matrix ({completedPapers.length})
            </h4>

            {completedPapers.length > 0 ? (
              <div className="border border-border-default rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                    <tr>
                      <th className="p-2.5">Paper Title</th>
                      <th className="p-2.5">Year</th>
                      <th className="p-2.5">Architecture</th>
                      <th className="p-2.5">Core Innovation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                    {completedPapers.map((p) => (
                      <tr key={p.id} className="hover:bg-bg-tertiary/40">
                        <td className="p-2.5 font-medium text-text-primary max-w-xs truncate">{p.title}</td>
                        <td className="p-2.5 text-text-secondary font-mono">{p.publicationYear || '—'}</td>
                        <td className="p-2.5 text-accent">{p.architecture || 'Standard'}</td>
                        <td className="p-2.5 text-text-secondary truncate max-w-xs">{p.keyContribution || p.problemSolved || 'Empirical review'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic p-3 bg-bg-secondary rounded-lg">
                No completed papers yet in this evaluation period.
              </p>
            )}
          </div>

          {/* Faculty Endorsement & Signature Lines */}
          <div className="pt-6 border-t border-border-default grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-6">
              <p className="text-text-secondary leading-relaxed">
                I confirm that the research literature surveyed adheres to doctoral/graduate program standards.
              </p>
              <div className="pt-4 border-t border-border-default text-text-tertiary">
                <strong>Supervisor Signature</strong> (Dr. {supervisorName.replace(/^Dr\.\s*/i, '')})
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-text-secondary leading-relaxed">
                Certified by the Academic Lab Review Committee.
              </p>
              <div className="pt-4 border-t border-border-default text-text-tertiary">
                <strong>Date &amp; Department Stamp</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
