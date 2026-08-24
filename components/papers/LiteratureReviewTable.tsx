'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  Download,
  Search,
  MessageSquare,
  Award,
  Calendar,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Paper, LiteratureReviewData, QuestionAnswer } from '@/lib/types'
import { REVIEW_WORKFLOW_LABELS, REVIEW_WORKFLOW_COLORS } from '@/lib/types'

interface LiteratureReviewTableProps {
  papers: Paper[]
}

export function LiteratureReviewTable({ papers }: LiteratureReviewTableProps) {
  const [filterText, setFilterText] = useState('')
  const [expandedCell, setExpandedCell] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Listen for Escape key to exit full screen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const handleExportMatrix = () => {
    window.open('/api/import-export/export?format=matrix', '_blank')
  }

  const parseReviewData = (paper: Paper): LiteratureReviewData => {
    if (paper.literatureReview) {
      try {
        return typeof paper.literatureReview === 'string'
          ? JSON.parse(paper.literatureReview)
          : paper.literatureReview
      } catch {
        return {}
      }
    }
    return {
      selectedPaperTitle: paper.title,
      paperTitle: paper.title,
      paperLink: paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ''),
      pdfAccessibility: paper.pdfPath ? 'Open Access' : 'Pre-print Available',
      researchGap: paper.problemSolved || '',
      usedDataset: paper.datasetUrl || '',
      summaryRepository: paper.codeUrl || '',
      q1ProblemImportance: paper.problemSolved ? { detailedAnswer: paper.problemSolved, shortSummary: paper.problemSolved } : undefined,
      q4MethodsPipeline: paper.architecture ? { detailedAnswer: `Architecture: ${paper.architecture}`, shortSummary: paper.architecture } : undefined,
      q8LimitationsBiases: paper.limitations ? { detailedAnswer: paper.limitations, shortSummary: paper.limitations } : undefined,
      q9ArtifactsReplication: paper.codeUrl ? { detailedAnswer: `Code: ${paper.codeUrl}`, shortSummary: 'Code available' } : undefined,
      outcome: paper.keyContribution || '',
    }
  }

  const formatQa = (qa?: QuestionAnswer | string): { detailed: string; summary: string; comment?: string } => {
    if (!qa) return { detailed: '', summary: '' }
    if (typeof qa === 'string') return { detailed: qa, summary: '' }
    return { detailed: qa.detailedAnswer || '', summary: qa.shortSummary || '', comment: qa.comment }
  }

  const filteredPapers = papers.filter((p) => {
    if (!filterText.trim()) return true
    const q = filterText.toLowerCase()
    const rev = parseReviewData(p)
    return (
      p.title.toLowerCase().includes(q) ||
      p.authors.toLowerCase().includes(q) ||
      (rev.assignedPerson && rev.assignedPerson.toLowerCase().includes(q)) ||
      (rev.reviewWorkflowStatus && rev.reviewWorkflowStatus.toLowerCase().includes(q)) ||
      (rev.usedDataset && rev.usedDataset.toLowerCase().includes(q)) ||
      (rev.researchGap && rev.researchGap.toLowerCase().includes(q)) ||
      (rev.remarks && rev.remarks.toLowerCase().includes(q)) ||
      (rev.outcome && rev.outcome.toLowerCase().includes(q))
    )
  })

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-bg-primary p-4 sm:p-6 flex flex-col space-y-4 animate-fade-in' : 'space-y-4'}>
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-bg-tertiary border border-border-default shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={16} className="text-text-tertiary" />
          <input
            type="text"
            placeholder="Search across all 20 survey columns, reviewer names, workflow status..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-tertiary font-mono hidden sm:inline">
            {filteredPapers.length} of {papers.length} Papers
          </span>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
            icon={isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          >
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </Button>

          <Button
            size="sm"
            onClick={handleExportMatrix}
            icon={<Download size={13} />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* 20-Column Responsive Matrix Table with Frozen Header and Pinned Columns */}
      <div className={`rounded-xl border border-border-default bg-bg-primary overflow-auto shadow-sm relative ${
        isFullscreen ? 'flex-1 min-h-0' : 'max-h-[720px]'
      }`}>
        <table className="w-full border-separate border-spacing-0 text-left text-xs whitespace-normal">
          <thead className="sticky top-0 z-30 bg-bg-tertiary border-b border-border-default shadow-xs text-text-secondary uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              {/* 1. Frozen SL */}
              <th className="p-3 w-[54px] min-w-[54px] max-w-[54px] sticky top-0 left-0 z-40 bg-bg-tertiary border-b border-r border-border-default/80 text-center">
                SL
              </th>

              {/* 2. Frozen Assigned Reviewer & Workflow */}
              <th className="p-3 w-[176px] min-w-[176px] max-w-[176px] sticky top-0 left-[54px] z-40 bg-bg-tertiary border-b border-r border-border-default/80">
                Assigned &amp; Workflow
              </th>

              {/* 3. Frozen Paper Title */}
              <th className="p-3 w-[260px] min-w-[260px] max-w-[260px] sticky top-0 left-[230px] z-40 bg-bg-tertiary border-b border-r-2 border-border-default shadow-[4px_0_8px_-2px_var(--elevation-edge)]">
                Paper Title
              </th>

              {/* Scrollable Survey Columns */}
              <th className="p-3 min-w-[110px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Paper Link</th>
              <th className="p-3 min-w-[130px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">PDF Accessibility</th>
              <th className="p-3 min-w-[220px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Research Gap</th>
              <th className="p-3 min-w-[180px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Used Dataset</th>
              <th className="p-3 min-w-[120px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Summary Repo</th>
              <th className="p-3 min-w-[180px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Remarks / Comments</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q1. Problem &amp; Importance</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q2. Data Used</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q3. Features / Inputs</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q4. Methods &amp; Pipeline</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q5. Baselines</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q6. Performance Evaluation</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q7. Key Results</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q8. Limitations &amp; Biases</th>
              <th className="p-3 min-w-[240px] sticky top-0 z-30 bg-bg-tertiary border-b border-r border-border-default/60">Q9. Code &amp; Artifacts</th>
              <th className="p-3 min-w-[220px] sticky top-0 z-30 bg-bg-tertiary border-b border-border-default/60">OutCome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/60 text-text-primary">
            {filteredPapers.length === 0 ? (
              <tr>
                <td colSpan={19} className="p-8 text-center text-text-tertiary">
                  No literature review records match your search query.
                </td>
              </tr>
            ) : (
              filteredPapers.map((paper, idx) => {
                const rev = parseReviewData(paper)
                const sl = rev.sl || String(idx + 1)
                const effectiveLink = rev.paperLink || paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : '')
                const wfStatus = rev.reviewWorkflowStatus || 'PENDING_REVIEW'

                const q1 = formatQa(rev.q1ProblemImportance)
                const q2 = formatQa(rev.q2DataDetails)
                const q3 = formatQa(rev.q3FeaturesInputs)
                const q4 = formatQa(rev.q4MethodsPipeline)
                const q5 = formatQa(rev.q5Baselines)
                const q6 = formatQa(rev.q6Evaluation)
                const q7 = formatQa(rev.q7KeyResults)
                const q8 = formatQa(rev.q8LimitationsBiases)
                const q9 = formatQa(rev.q9ArtifactsReplication)

                const renderQaCell = (cellId: string, qa: { detailed: string; summary: string; comment?: string }) => {
                  const isExp = expandedCell === cellId
                  if (!qa.detailed && !qa.summary && !qa.comment) {
                    return <span className="text-text-tertiary italic">—</span>
                  }
                  return (
                    <div className="space-y-1">
                      {qa.detailed && (
                        <p className={`text-text-secondary leading-relaxed ${isExp ? '' : 'line-clamp-2'}`}>
                          {qa.detailed}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {qa.summary && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent font-medium font-mono">
                            {qa.summary}
                          </span>
                        )}
                        {qa.comment && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated text-text-secondary border border-border-default font-mono">
                            <MessageSquare size={10} className="text-accent" /> Note
                          </span>
                        )}
                      </div>
                      {qa.comment && isExp && (
                        <div className="p-1.5 rounded bg-bg-elevated/80 border border-border-default/60 text-[10px] text-text-secondary mt-1">
                          <span className="font-semibold text-accent">💬 Comment: </span>
                          {qa.comment}
                        </div>
                      )}
                      {(qa.detailed?.length > 90 || qa.comment) && (
                        <button
                          type="button"
                          onClick={() => setExpandedCell(isExp ? null : cellId)}
                          className="text-[10px] text-accent hover:underline block pt-0.5"
                        >
                          {isExp ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )
                }

                return (
                  <tr key={paper.id} className="group hover:bg-bg-tertiary/40 transition-colors">
                    {/* 1. Frozen SL */}
                    <td className="p-3 w-[54px] min-w-[54px] max-w-[54px] sticky left-0 z-20 bg-bg-secondary group-hover:bg-bg-tertiary font-mono font-bold text-accent border-b border-r border-border-default/80 text-center">
                      {sl}
                    </td>

                    {/* 2. Frozen Assigned Reviewer & Workflow Status */}
                    <td className="p-3 w-[176px] min-w-[176px] max-w-[176px] sticky left-[54px] z-20 bg-bg-secondary group-hover:bg-bg-tertiary border-b border-r border-border-default/80 space-y-1">
                      <p className="font-bold text-text-primary truncate">
                        {rev.assignedPerson || <span className="text-text-tertiary">—</span>}
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${REVIEW_WORKFLOW_COLORS[wfStatus]}`}>
                          {REVIEW_WORKFLOW_LABELS[wfStatus]}
                        </span>
                        {rev.reviewDueDate && (
                          <span className="text-[10px] text-text-tertiary font-mono flex items-center gap-0.5">
                            <Calendar size={10} /> {rev.reviewDueDate}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Frozen Paper Title */}
                    <td className="p-3 w-[260px] min-w-[260px] max-w-[260px] sticky left-[230px] z-20 bg-bg-secondary group-hover:bg-bg-tertiary border-b border-r-2 border-border-default shadow-[4px_0_8px_-2px_var(--elevation-edge)] font-semibold">
                      <Link href={`/papers/${paper.slug || paper.id}`} className="hover:text-accent transition-colors line-clamp-2">
                        {rev.selectedPaperTitle || paper.title}
                      </Link>
                      {paper.authors && (
                        <p className="text-[10px] text-text-tertiary truncate font-normal mt-0.5">
                          {paper.authors}
                        </p>
                      )}
                    </td>

                    {/* 4. Paper Link */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {effectiveLink ? (
                        <a
                          href={effectiveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-[11px]"
                        >
                          Link <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* 5. PDF Accessibility */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-bg-tertiary text-text-secondary border border-border-default">
                        {rev.pdfAccessibility || 'Open Access'}
                      </span>
                    </td>

                    {/* 6. Research Gap */}
                    <td className="p-3 border-b border-r border-border-default/60 text-text-secondary">
                      <p className="line-clamp-3 leading-relaxed">
                        {rev.researchGap || <span className="text-text-tertiary italic">—</span>}
                      </p>
                    </td>

                    {/* 7. Used Dataset */}
                    <td className="p-3 border-b border-r border-border-default/60 text-text-secondary font-mono text-[11px]">
                      {rev.usedDataset || <span className="text-text-tertiary italic">—</span>}
                    </td>

                    {/* 8. Summary Repo */}
                    <td className="p-3 border-b border-r border-border-default/60 font-mono text-[11px]">
                      {rev.summaryRepository ? (
                        <a
                          href={rev.summaryRepository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          Repo <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-text-tertiary italic">—</span>
                      )}
                    </td>

                    {/* 9. Remarks */}
                    <td className="p-3 border-b border-r border-border-default/60 text-text-secondary">
                      <p className="line-clamp-2">{rev.remarks || <span className="text-text-tertiary italic">—</span>}</p>
                    </td>

                    {/* Q1 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q1`, q1)}
                    </td>

                    {/* Q2 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q2`, q2)}
                    </td>

                    {/* Q3 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q3`, q3)}
                    </td>

                    {/* Q4 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q4`, q4)}
                    </td>

                    {/* Q5 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q5`, q5)}
                    </td>

                    {/* Q6 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q6`, q6)}
                    </td>

                    {/* Q7 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q7`, q7)}
                    </td>

                    {/* Q8 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q8`, q8)}
                    </td>

                    {/* Q9 */}
                    <td className="p-3 border-b border-r border-border-default/60">
                      {renderQaCell(`${paper.id}-q9`, q9)}
                    </td>

                    {/* 19. OutCome */}
                    <td className="p-3 border-b border-border-default/60 text-text-primary font-medium">
                      <p className="line-clamp-3 leading-relaxed">
                        {rev.outcome || <span className="text-text-tertiary italic">—</span>}
                      </p>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
