'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Search,
  Plus,
  CheckCircle2,
  Sparkles,
  GitBranch,
  Database,
  LayoutGrid,
  List,
  GraduationCap,
  ArrowUpRight,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GithubIcon, HuggingFaceIcon } from '@/components/ui/Icons'
import type { Paper } from '@/lib/types'
import { REPLICATION_LABELS } from '@/lib/types'

interface LabPaperLibraryProps {
  labId: string
  labSlug: string
  labName: string
  papers: (Paper & {
    user?: { id: string; name: string; email?: string }
    assignments?: {
      id: string
      status: string
      dueDate?: string | null
      student?: { id: string; name: string; email?: string }
    }[]
  })[]
  isLeadOrSupervisor: boolean
  onAssignPaper?: (paperId: string) => void
}

export function LabPaperLibrary({
  labId,
  labSlug,
  labName,
  papers,
  isLeadOrSupervisor,
  onAssignPaper,
}: LabPaperLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [replicationFilter, setReplicationFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'year' | 'citations'>('date')

  // Compute Lab Paper Metrics
  const totalPapers = papers.length
  const completedPapers = papers.filter((p) => p.status === 'COMPLETED').length
  const replicatedPapers = papers.filter((p) => p.replicationStatus === 'REPLICATED').length
  const papersWithCode = papers.filter((p) => Boolean(p.codeUrl)).length

  // Filtered & Sorted Papers
  const filteredPapers = useMemo(() => {
    return papers
      .filter((paper) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchTitle = paper.title.toLowerCase().includes(q)
          const matchAuthors = paper.authors.toLowerCase().includes(q)
          const matchAbstract = paper.abstract?.toLowerCase().includes(q) || false
          const matchProblem = paper.problemSolved?.toLowerCase().includes(q) || false
          const matchVenue = paper.journal?.toLowerCase().includes(q) || false
          if (!matchTitle && !matchAuthors && !matchAbstract && !matchProblem && !matchVenue) {
            return false
          }
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'COMPLETED' && paper.status !== 'COMPLETED') return false
          if (statusFilter === 'READING' && paper.status !== 'READING') return false
          if (statusFilter === 'TO_READ' && paper.status !== 'TO_READ') return false
          if (statusFilter === 'ASSIGNED' && (!paper.assignments || paper.assignments.length === 0)) return false
        }

        // Replication Filter
        if (replicationFilter !== 'ALL') {
          if (paper.replicationStatus !== replicationFilter) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'year') {
          return (b.publicationYear || 0) - (a.publicationYear || 0)
        }
        if (sortBy === 'citations') {
          return (b.citationCount || 0) - (a.citationCount || 0)
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [papers, searchQuery, statusFilter, replicationFilter, sortBy])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Lab Literature Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-bold tracking-wider">
            <BookOpen size={13} className="text-accent" /> Lab Papers
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{totalPapers}</p>
          <span className="text-[11px] text-text-tertiary">Shared library assets</span>
        </div>

        <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-bold tracking-wider">
            <CheckCircle2 size={13} className="text-emerald-400" /> Fully Synthesized
          </div>
          <p className="text-2xl font-bold font-display text-emerald-400">{completedPapers}</p>
          <span className="text-[11px] text-text-tertiary">
            {totalPapers > 0 ? Math.round((completedPapers / totalPapers) * 100) : 0}% completion
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-bold tracking-wider">
            <Sparkles size={13} className="text-purple-400" /> Replicated SOTA
          </div>
          <p className="text-2xl font-bold font-display text-purple-400">{replicatedPapers}</p>
          <span className="text-[11px] text-text-tertiary">Verified experimental code</span>
        </div>

        <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-bold tracking-wider">
            <GitBranch size={13} className="text-sky-400" /> Code Repositories
          </div>
          <p className="text-2xl font-bold font-display text-sky-400">{papersWithCode}</p>
          <span className="text-[11px] text-text-tertiary">Open source artifacts</span>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-bg-secondary border border-border-default">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-default flex-1 max-w-md">
          <Search size={15} className="text-text-tertiary shrink-0" />
          <input
            type="text"
            placeholder="Search lab papers, authors, problems solved, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-text-primary placeholder:text-text-tertiary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-text-tertiary hover:text-text-primary font-mono cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters & View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">🟢 Read &amp; Synthesized</option>
            <option value="READING">🔵 In Progress</option>
            <option value="TO_READ">🟡 To Read</option>
            <option value="ASSIGNED">🎓 Assigned to Students</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-primary outline-none font-medium"
          >
            <option value="date">Sort: Recently Added</option>
            <option value="year">Sort: Publication Year</option>
            <option value="citations">Sort: Most Citations</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-bg-tertiary border border-border-default rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>

          <Link href="/papers/new">
            <Button size="sm" variant="primary" icon={<Plus size={13} />}>
              Add Paper
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. Paper Grid / List Display */}
      {filteredPapers.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPapers.map((paper) => {
              const replBadge = REPLICATION_LABELS[paper.replicationStatus]
              const hasAssignments = paper.assignments && paper.assignments.length > 0

              return (
                <div
                  key={paper.id}
                  className="glass-card p-5 flex flex-col justify-between space-y-4 hover:border-accent/50 transition-all duration-200 group relative"
                >
                  <div className="space-y-3">
                    {/* Top Metadata Badges */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {paper.journal && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-accent/10 text-accent border border-accent/25 truncate max-w-[140px]">
                            {paper.journal}
                          </span>
                        )}
                        {paper.publicationYear && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-tertiary rounded-md border border-border-default">
                            {paper.publicationYear}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${
                          paper.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : paper.status === 'READING'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {paper.status === 'COMPLETED' ? 'Read' : paper.status === 'READING' ? 'Reading' : 'To Read'}
                      </span>
                    </div>

                    {/* Paper Title */}
                    <Link
                      href={`/papers/${paper.id}`}
                      className="text-base font-bold text-text-primary group-hover:text-accent transition-colors font-display line-clamp-2 leading-snug block"
                    >
                      {paper.title}
                    </Link>

                    {/* Authors */}
                    <p className="text-xs text-text-tertiary line-clamp-1">
                      {paper.authors}
                    </p>

                    {/* 3-Minute Digest Preview (Problem Solved & Innovation) */}
                    {paper.problemSolved && (
                      <div className="p-2.5 rounded-xl bg-bg-tertiary/70 border border-border-default/60 text-xs space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
                          <Sparkles size={11} /> Problem Solved
                        </div>
                        <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                          {paper.problemSolved}
                        </p>
                      </div>
                    )}

                    {/* Code, Model, Dataset Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {paper.codeUrl && (
                        <a
                          href={paper.codeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 text-[10px] font-medium border border-purple-500/25 hover:bg-purple-500/20 transition-colors"
                        >
                          <GithubIcon className="w-2.5 h-2.5" /> Code Repo
                        </a>
                      )}

                      {paper.modelUrl && (
                        <a
                          href={paper.modelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-medium border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
                        >
                          <HuggingFaceIcon className="w-2.5 h-2.5" /> Model Weights
                        </a>
                      )}

                      {paper.datasetUrl && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 text-[10px] font-medium border border-sky-500/25">
                          <Database size={10} /> Dataset
                        </span>
                      )}

                      {paper.replicationStatus && paper.replicationStatus !== 'UNTESTED' && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            paper.replicationStatus === 'REPLICATED'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {replBadge || paper.replicationStatus}
                        </span>
                      )}
                    </div>

                    {/* Assigned Student Roster */}
                    {hasAssignments && (
                      <div className="pt-2 border-t border-border-default/50 space-y-1">
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">
                          Assigned Researchers ({paper.assignments?.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {paper.assignments?.map((a) => (
                            <span
                              key={a.id}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                                a.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                  : a.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                                  : 'bg-bg-tertiary text-text-secondary border-border-default'
                              }`}
                            >
                              <GraduationCap size={10} />
                              {a.student?.name || 'Student'} ({a.status})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                    <Link href={`/papers/${paper.id}`} className="flex-1">
                      <Button size="xs" variant="secondary" className="w-full justify-center text-[11px]">
                        Open Paper Details <ArrowUpRight size={12} className="ml-1" />
                      </Button>
                    </Link>

                    {paper.pdfPath && (
                      <Link href={`/papers/${paper.id}/reader`} title="Open PDF Reader">
                        <Button size="xs" variant="ghost" icon={<FileText size={12} />} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="glass-card rounded-2xl overflow-hidden border border-border-default divide-y divide-border-default/60">
            {filteredPapers.map((paper) => (
              <div
                key={paper.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-bg-tertiary/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${
                        paper.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : paper.status === 'READING'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {paper.status}
                    </span>

                    {paper.journal && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono text-accent bg-accent/10 rounded">
                        {paper.journal} {paper.publicationYear ? `(${paper.publicationYear})` : ''}
                      </span>
                    )}

                    {paper.assignments && paper.assignments.length > 0 && (
                      <span className="text-[10px] font-medium text-purple-400 flex items-center gap-1 font-mono">
                        <GraduationCap size={11} /> {paper.assignments.length} assigned
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/papers/${paper.id}`}
                    className="text-sm font-bold text-text-primary hover:text-accent transition-colors font-display block truncate"
                  >
                    {paper.title}
                  </Link>

                  <p className="text-xs text-text-tertiary truncate">
                    {paper.authors}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/papers/${paper.id}`}>
                    <Button size="xs" variant="secondary" className="text-[11px]">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="glass-card p-12 text-center space-y-4">
          <BookOpen size={32} className="mx-auto text-accent opacity-30" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-text-primary font-display">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No matching lab papers found'
                : 'No research papers in this lab library yet'}
            </h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Add research literature, papers with code, and benchmark surveys to start collaborative reading.'}
            </p>
          </div>

          <Link href="/papers/new">
            <Button size="sm" variant="primary" icon={<Plus size={13} />}>
              Add First Paper to Lab
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
