'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/papers/StatusBadge'
import { PriorityIndicator } from '@/components/papers/PriorityIndicator'
import { StarButton } from '@/components/papers/StarButton'
import { CitationModal } from '@/components/citations/CitationModal'
import { ExportMatrixModal } from '@/components/papers/ExportMatrixModal'
import { NotesSection } from '@/components/notes/NotesSection'
import { FeedbackPanel } from '@/components/papers/FeedbackPanel'
import { FacultyRubricCard } from '@/components/papers/FacultyRubricCard'
import { GroupReadingRadarCard } from '@/components/papers/GroupReadingRadarCard'
import { LiteratureReviewView } from '@/components/papers/LiteratureReviewSection'
import { CitationGraph } from '@/components/papers/CitationGraph'
import { ConnectedLiteratureExplorer } from '@/components/papers/ConnectedLiteratureExplorer'
import { PaperChatAssistant } from '@/components/papers/PaperChatAssistant'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Calendar,
  ExternalLink,
  Link2,
  Edit,
  Trash2,
  BookOpen,
  Copy,
  FileText,
  Upload,
  Download,
  ArrowLeft,
  FolderOpen,
  Cpu,
  Trophy,
  Sparkles,
  Database,
  AlertTriangle,
  Lightbulb,
  Crosshair,
  FileCheck,
  Share2,
  MessageSquare,
  UserCheck,
  ClipboardList,
  Users,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { GithubIcon, HuggingFaceIcon } from '@/components/ui/Icons'
import type {
  Paper,
  BenchmarkScore,
  ReplicationStatus,
  LiteratureReviewData,
} from '@/lib/types'
import { REPLICATION_LABELS } from '@/lib/types'

export default function PaperDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isStudent, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals & actions state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false)
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('SUPERVISOR')

  // 1-Click Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [studentList, setStudentList] = useState<{ id: string; name: string; email: string; department?: string }[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)

  // PDF upload state
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const paperId = params.id as string

  // Fetch students for supervisor assignment modal
  useEffect(() => {
    if (isAssignModalOpen && (isSupervisor || isAdmin) && studentList.length === 0) {
      setLoadingStudents(true)
      fetch('/api/students')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setStudentList(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStudents(false))
    }
  }, [isAssignModalOpen, isSupervisor, isAdmin, studentList.length])

  const handleAssignPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) {
      addToast('error', 'Please select a student researcher')
      return
    }
    setAssigning(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          studentId: selectedStudentId,
          dueDate: assignDueDate || undefined,
          note: assignNote || undefined,
        }),
      })
      if (res.ok) {
        const studentObj = studentList.find((s) => s.id === selectedStudentId)
        addToast('success', `Assigned paper to ${studentObj?.name || 'student'} successfully!`)
        setIsAssignModalOpen(false)
        setAssignNote('')
        setAssignDueDate('')
        fetchPaper()
      } else {
        const data = await res.json()
        addToast('error', data.error || 'Failed to assign paper')
      }
    } catch {
      addToast('error', 'Network error assigning paper')
    } finally {
      setAssigning(false)
    }
  }

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      if (res.ok) {
        const data = await res.json()
        setPaper(data)
      } else {
        addToast('error', 'Paper not found')
        router.push('/papers')
      }
    } catch {
      addToast('error', 'Failed to load paper')
    } finally {
      setLoading(false)
    }
  }, [paperId, router, addToast])

  useEffect(() => {
    fetchPaper()
  }, [fetchPaper])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('success', 'Paper deleted from library')
        router.push('/papers')
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to delete paper')
      }
    } catch {
      addToast('error', 'Network error deleting paper')
    } finally {
      setDeleting(false)
    }
  }

  const copyDoi = () => {
    if (paper?.doi) {
      navigator.clipboard.writeText(paper.doi)
      addToast('info', 'DOI copied to clipboard')
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPdf(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/papers/${paperId}/pdf`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setPaper((prev) => (prev ? { ...prev, pdfPath: data.pdfPath } : prev))
        addToast('success', 'PDF uploaded successfully!')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to upload PDF')
      }
    } catch {
      addToast('error', 'Failed to upload PDF file')
    } finally {
      setUploadingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  if (!paper) return null

  const visibleAssignment = isStudent
    ? paper.assignments?.find((assignment) => assignment.studentId === user?.id)
    : paper.assignments?.[0]
  const canManagePaper = paper.userId === user?.id || isSupervisor || isAdmin

  // Find active student assignment based on role & selected reviewer tab
  const activeStudentAssignment =
    selectedReviewerId !== 'SUPERVISOR'
      ? paper.assignments?.find((a) => a.studentId === selectedReviewerId)
      : isStudent
      ? visibleAssignment
      : null

  // Parse benchmarks
  const parsedBenchmarks: BenchmarkScore[] = paper.benchmarks
    ? (() => {
        try {
          return typeof paper.benchmarks === 'string'
            ? JSON.parse(paper.benchmarks)
            : paper.benchmarks
        } catch {
          return []
        }
      })()
    : []

  // Parse literature review data (Supervisor Master vs Student-Specific Review)
  const activeLitReviewRawString =
    selectedReviewerId !== 'SUPERVISOR' && activeStudentAssignment
      ? activeStudentAssignment.literatureReview || ''
      : isStudent && visibleAssignment?.literatureReview
      ? visibleAssignment.literatureReview
      : paper.literatureReview || ''

  const rawLitReview: LiteratureReviewData = activeLitReviewRawString
    ? (() => {
        try {
          return typeof activeLitReviewRawString === 'string'
            ? JSON.parse(activeLitReviewRawString)
            : activeLitReviewRawString
        } catch {
          return {}
        }
      })()
    : {}

  const parsedLiteratureReview: LiteratureReviewData = {
    sl: rawLitReview.sl || '1',
    assignedPerson: rawLitReview.assignedPerson || (activeStudentAssignment?.student?.name ? activeStudentAssignment.student.name : ''),
    reviewDueDate: rawLitReview.reviewDueDate || (activeStudentAssignment?.dueDate ? activeStudentAssignment.dueDate.slice(0, 10) : ''),
    reviewWorkflowStatus: rawLitReview.reviewWorkflowStatus || (activeStudentAssignment?.status === 'COMPLETED' ? 'COMPLETED' : activeStudentAssignment?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING_REVIEW'),
    selectedPaperTitle: rawLitReview.selectedPaperTitle || paper.title,
    paperTitle: rawLitReview.paperTitle || paper.title,
    paperLink: rawLitReview.paperLink || paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ''),
    pdfAccessibility: rawLitReview.pdfAccessibility || (paper.pdfPath ? 'Open Access' : 'Pre-print Available'),
    researchGap: rawLitReview.researchGap || paper.problemSolved || '',
    usedDataset: rawLitReview.usedDataset || paper.datasetUrl || '',
    summaryRepository: rawLitReview.summaryRepository || paper.codeUrl || '',
    remarks: rawLitReview.remarks || '',
    q1ProblemImportance: rawLitReview.q1ProblemImportance || (paper.problemSolved ? { detailedAnswer: paper.problemSolved, shortSummary: paper.problemSolved } : undefined),
    q2DataDetails: rawLitReview.q2DataDetails,
    q3FeaturesInputs: rawLitReview.q3FeaturesInputs || (paper.contextWindow ? { detailedAnswer: `Context length: ${paper.contextWindow}`, shortSummary: paper.contextWindow } : undefined),
    q4MethodsPipeline: rawLitReview.q4MethodsPipeline || (paper.architecture ? { detailedAnswer: `Architecture: ${paper.architecture}`, shortSummary: paper.architecture } : undefined),
    q5Baselines: rawLitReview.q5Baselines,
    q6Evaluation: rawLitReview.q6Evaluation,
    q7KeyResults: rawLitReview.q7KeyResults,
    q8LimitationsBiases: rawLitReview.q8LimitationsBiases || (paper.limitations ? { detailedAnswer: paper.limitations, shortSummary: paper.limitations } : undefined),
    q9ArtifactsReplication: rawLitReview.q9ArtifactsReplication || (paper.codeUrl ? { detailedAnswer: `Code: ${paper.codeUrl}`, shortSummary: 'Code available' } : undefined),
    customQuestions: rawLitReview.customQuestions || [],
    outcome: rawLitReview.outcome || paper.keyContribution || '',
    rubricReviews: rawLitReview.rubricReviews || [],
    collaborationComments: rawLitReview.collaborationComments || [],
  }

  const handleUpdateLitReview = (updated: LiteratureReviewData) => {
    setPaper((prev) => (prev ? { ...prev, literatureReview: JSON.stringify(updated) } : prev))
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/papers"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors font-medium"
        >
          <ArrowLeft size={14} /> Back to Research Library &amp; Matrix
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <StarButton paperId={paper.id} isFavorite={paper.isFavorite} />

          {/* Dedicated In-App PDF Reader Action */}
          <Link href={`/papers/${paper.id}/reader`}>
            <Button
              size="sm"
              variant="primary"
              icon={<BookOpen size={14} className={Boolean(paper.pdfPath || paper.arxivId || paper.doi || paper.url) ? 'text-cyan-200' : ''} />}
            >
              PDF Reader
              {Boolean(paper.pdfPath || paper.arxivId || paper.doi || paper.url) && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-white/25 rounded-md font-mono font-bold">
                  PDF Ready
                </span>
              )}
            </Button>
          </Link>

          {/* 1-Click Supervisor Assignment Action */}
          {(isSupervisor || isAdmin) && (
            <Button
              size="sm"
              variant="secondary"
              icon={<ClipboardList size={14} className="text-blue-400" />}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign to Student
            </Button>
          )}

          <details className="relative">
            <summary className="list-none px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer [&::-webkit-details-marker]:hidden">
              More actions
            </summary>
            <div className="absolute right-0 mt-2 z-20 w-44 rounded-xl border border-border-default bg-bg-secondary p-1.5 shadow-xl space-y-1">
              <Link
                href={`/papers/${paper.id}/present`}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              >
                <Sparkles size={13} className="text-purple-400" /> Journal Club
              </Link>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
              >
                <Download size={13} /> Export citation
              </button>
              {canManagePaper && (
                <>
                  <Link
                    href={`/papers/${paper.id}/edit`}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  >
                    <Edit size={13} /> Edit paper
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-danger hover:bg-danger-subtle/30 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete paper
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Assigned Person / Supervisor Details Banner */}
      {visibleAssignment && (
        <div className="glass-card p-4 md:p-5 border-purple-500/30 bg-purple-500/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  Supervisory Reading Assignment
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Assigned by <strong className="text-purple-400 font-semibold">{visibleAssignment.assignedBy?.name || 'Supervisor'}</strong> to{' '}
                  <strong className="text-cyan-400 font-semibold">{visibleAssignment.student?.name || 'Student Researcher'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {visibleAssignment.dueDate && (
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-bg-tertiary text-text-secondary border border-border-default flex items-center gap-1.5">
                  <Calendar size={13} className="text-accent" />
                  Due: {new Date(visibleAssignment.dueDate).toLocaleDateString()}
                </span>
              )}
              <Badge
                variant={
                  visibleAssignment.status === 'COMPLETED'
                    ? 'success'
                    : visibleAssignment.status === 'IN_PROGRESS'
                    ? 'warning'
                    : 'info'
                }
                size="md"
              >
                {visibleAssignment.status}
              </Badge>
            </div>
          </div>

          {visibleAssignment.note && (
            <p className="text-xs text-text-secondary bg-bg-tertiary/70 p-3 rounded-xl italic border border-border-default/50">
              &ldquo;{visibleAssignment.note}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Main Title & Authors Card */}
      <div className="glass-card p-6 md:p-8 space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={paper.status} />
          <PriorityIndicator priority={paper.priority} />

          {paper.arxivId && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-accent/15 text-accent border border-accent/30">
              arXiv:{paper.arxivId}
            </span>
          )}

          {paper.citationCount !== null && paper.citationCount !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-bg-tertiary text-text-secondary border border-border-default">
              📚 {paper.citationCount.toLocaleString()} Citations
            </span>
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-text-primary font-display leading-tight">
          {paper.title}
        </h1>

        <p className="text-sm text-text-secondary font-medium">
          {paper.authors}
        </p>

        {/* Collections & Tags Row */}
        {(paper.collections?.length || paper.tags?.length) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-default/60">
            {/* Collections */}
            {paper.collections?.map((c) => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <Badge
                  variant="default"
                  size="md"
                  className="hover:border-border-hover transition-colors flex items-center gap-1.5"
                  style={{ borderLeft: `3px solid ${c.color || '#06b6d4'}` }}
                >
                  <FolderOpen size={12} className="text-accent" />
                  {c.name}
                </Badge>
              </Link>
            ))}

            {/* Tags */}
            {paper.tags?.map((tag) => (
              <Link key={tag.id} href={`/papers?tag=${encodeURIComponent(tag.name)}`}>
                <Badge variant="outline" size="md" className="hover:border-accent hover:text-accent transition-colors">
                  #{tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* AI/ML Code, Weights & Datasets Hub */}
      {(paper.codeUrl || paper.modelUrl || paper.datasetUrl || paper.url) && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <GithubIcon size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Code, Model Weights &amp; Datasets Hub
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paper.codeUrl ? (
              <a
                href={paper.codeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GithubIcon size={18} className="text-accent shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">Code Repository</p>
                    <p className="text-[11px] text-text-tertiary truncate">{paper.codeUrl.replace(/^https?:\/\//, '')}</p>
                  </div>
                </div>
                <ExternalLink size={13} className="text-text-tertiary group-hover:text-accent shrink-0" />
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-default/50 flex items-center gap-2 text-xs text-text-tertiary">
                <GithubIcon size={16} className="opacity-40" /> No code link added
              </div>
            )}

            {paper.modelUrl ? (
              <a
                href={paper.modelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <HuggingFaceIcon size={18} className="text-warning shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-text-primary group-hover:text-warning transition-colors">Hugging Face Weights</p>
                    <p className="text-[11px] text-text-tertiary truncate">{paper.modelUrl.replace(/^https?:\/\//, '')}</p>
                  </div>
                </div>
                <ExternalLink size={13} className="text-text-tertiary group-hover:text-warning shrink-0" />
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-default/50 flex items-center gap-2 text-xs text-text-tertiary">
                <HuggingFaceIcon size={16} className="opacity-40" /> No model checkpoint added
              </div>
            )}

            {paper.datasetUrl ? (
              <a
                href={paper.datasetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Database size={18} className="text-success shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-text-primary group-hover:text-success transition-colors">Dataset Repository</p>
                    <p className="text-[11px] text-text-tertiary truncate">{paper.datasetUrl.replace(/^https?:\/\//, '')}</p>
                  </div>
                </div>
                <ExternalLink size={13} className="text-text-tertiary group-hover:text-success shrink-0" />
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-default/50 flex items-center gap-2 text-xs text-text-tertiary">
                <Database size={16} className="opacity-40" /> No dataset link added
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Specs & Architecture Cards */}
      {(paper.architecture || paper.parameters || paper.contextWindow || paper.computeBudget) && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Architecture &amp; Compute Specifications
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paper.architecture && (
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <span className="text-[11px] text-text-tertiary uppercase font-medium">Architecture</span>
                <p className="text-sm font-semibold text-text-primary mt-0.5">{paper.architecture}</p>
              </div>
            )}
            {paper.parameters && (
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <span className="text-[11px] text-text-tertiary uppercase font-medium">Parameters</span>
                <p className="text-sm font-mono font-bold text-accent mt-0.5">{paper.parameters}</p>
              </div>
            )}
            {paper.contextWindow && (
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <span className="text-[11px] text-text-tertiary uppercase font-medium">Context Window</span>
                <p className="text-sm font-mono font-semibold text-text-primary mt-0.5">{paper.contextWindow}</p>
              </div>
            )}
            {paper.computeBudget && (
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <span className="text-[11px] text-text-tertiary uppercase font-medium">Training Compute</span>
                <p className="text-sm font-medium text-text-primary mt-0.5 truncate" title={paper.computeBudget}>
                  {paper.computeBudget}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Benchmark Performance Matrix */}
      {parsedBenchmarks.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-warning" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Empirical Benchmark Matrix
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parsedBenchmarks.map((b, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-bg-tertiary border border-border-default flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">{b.name}</span>
                    {b.metric && (
                      <span className="text-[10px] text-text-tertiary font-mono bg-bg-elevated px-1.5 py-0.5 rounded">
                        {b.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-text-primary font-display mt-1 text-accent">
                    {b.score}
                  </p>
                </div>
                {b.baseline && (
                  <div className="mt-3 pt-2 border-t border-border-default/60 flex items-center justify-between text-xs text-text-tertiary">
                    <span>Baseline:</span>
                    <span className="font-mono text-text-secondary">{b.baseline}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Minute Research Digest */}
      {(paper.problemSolved || paper.keyContribution || paper.limitations) && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              3-Minute Research Digest
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paper.problemSolved && (
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-info mb-2">
                  <Crosshair size={14} /> Problem Solved
                </div>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {paper.problemSolved}
                </p>
              </div>
            )}

            {paper.keyContribution && (
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-success mb-2">
                  <Lightbulb size={14} /> Key Innovation &amp; Method
                </div>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {paper.keyContribution}
                </p>
              </div>
            )}

            {paper.limitations && (
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-2">
                  <AlertTriangle size={14} /> Limitations &amp; Compute
                </div>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {paper.limitations}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Literature Review & 20-Column Survey Questionnaire */}
      <div className="glass-card p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <FileCheck size={20} className="text-accent" />
            <h3 className="text-base font-semibold text-text-primary font-display">
              Structured Literature Review &amp; Paper Survey (Q1–Q9 Framework)
            </h3>
          </div>
          {canManagePaper && selectedReviewerId === 'SUPERVISOR' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/papers/${paper.id}/edit`)}
              icon={<Edit size={13} />}
            >
              Edit Master Review
            </Button>
          )}
        </div>

        {/* Multi-Student Synthesis Comparison Switcher (for Supervisor / Paper Lead) */}
        {paper.assignments && paper.assignments.length > 0 && (isSupervisor || isAdmin || paper.userId === user?.id) && (
          <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-display text-[11px]">
                <Users size={14} className="text-purple-400" /> Assigned Student Syntheses ({paper.assignments.length})
              </span>
              <span className="text-[11px] text-text-tertiary">
                Click a student to view their isolated Q1–Q9 answers without affecting your master library.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Supervisor's Master Review Tab */}
              <button
                type="button"
                onClick={() => setSelectedReviewerId('SUPERVISOR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedReviewerId === 'SUPERVISOR'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-xs'
                    : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                <ShieldCheck size={13} />
                <span>My Master Review (Supervisor)</span>
              </button>

              {/* Student Review Tabs */}
              {paper.assignments.map((assignment) => {
                const isSelected = selectedReviewerId === assignment.studentId
                const stStatus = assignment.status
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedReviewerId(assignment.studentId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-xs'
                        : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <GraduationCap size={13} className={isSelected ? 'text-blue-400' : 'text-text-tertiary'} />
                    <span>{assignment.student?.name || 'Student'}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        stStatus === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : stStatus === 'IN_PROGRESS'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {stStatus}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Student Review Banner */}
        {activeStudentAssignment && selectedReviewerId !== 'SUPERVISOR' && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-300">
            <span className="flex items-center gap-2 font-medium">
              <GraduationCap size={15} className="text-blue-400 shrink-0" />
              Viewing Student Synthesis by <strong>{activeStudentAssignment.student?.name || 'Student'}</strong> (
              <span className="font-mono">{activeStudentAssignment.status}</span>)
            </span>
            {activeStudentAssignment.dueDate && (
              <span className="text-[11px] text-text-tertiary font-mono">
                Due: {new Date(activeStudentAssignment.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <LiteratureReviewView
          data={parsedLiteratureReview}
          paperTitle={paper.title}
          paperUrl={paper.url || undefined}
          doi={paper.doi || undefined}
        />
      </div>

      {/* Metadata Badges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {paper.journal && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
              <BookOpen size={13} />
              <span className="text-[11px] font-medium uppercase tracking-wider">Venue</span>
            </div>
            <p className="text-sm text-text-primary font-medium truncate">{paper.journal}</p>
          </div>
        )}

        {paper.publicationYear && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
              <Calendar size={13} />
              <span className="text-[11px] font-medium uppercase tracking-wider">Year</span>
            </div>
            <p className="text-sm text-text-primary font-medium">{paper.publicationYear}</p>
          </div>
        )}

        {paper.doi && (
          <div
            className="glass-card p-4 cursor-pointer group hover:border-accent/40 transition-colors"
            onClick={copyDoi}
            title="Click to copy DOI"
          >
            <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
              <Link2 size={13} />
              <span className="text-[11px] font-medium uppercase tracking-wider">DOI</span>
              <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
            </div>
            <p className="text-sm text-accent font-mono truncate">{paper.doi}</p>
          </div>
        )}

        {paper.url && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
              <ExternalLink size={13} />
              <span className="text-[11px] font-medium uppercase tracking-wider">Paper Link</span>
            </div>
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:text-accent-hover truncate block font-medium"
            >
              Open Link
            </a>
          </div>
        )}
      </div>

      {/* PDF Document Attachment Section */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Attached PDF Document &amp; In-App Reader
            </h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <Link href={`/papers/${paper.id}/reader`}>
              <Button size="xs" variant="primary" icon={<BookOpen size={12} />}>
                Open Side-by-Side Reader
              </Button>
            </Link>

            {paper.pdfPath ? (
              <>
                <a
                  href={paper.pdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors font-mono"
                >
                  <Download size={13} /> Download
                </a>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadingPdf}
                  icon={<Upload size={12} />}
                >
                  Replace
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingPdf}
                icon={<Upload size={12} />}
              >
                Upload Local PDF
              </Button>
            )}
          </div>
        </div>

        {paper.pdfPath && (
          <div className="mt-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border-default flex items-center justify-between text-xs text-text-secondary">
            <span className="truncate font-mono">{paper.pdfPath}</span>
            <span className="text-success font-medium shrink-0 ml-2">✓ Attached</span>
          </div>
        )}
      </div>

      {/* Abstract Section */}
      {paper.abstract && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
            Abstract
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {paper.abstract}
          </p>
        </div>
      )}

      {/* Interactive Notes Section */}
      <NotesSection paperId={paper.id} initialNotes={paper.notes} />

      {/* Faculty Review Rubric & Conference Scorecard */}
      <FacultyRubricCard paperId={paper.id} paperTitle={paper.title} />

      {/* Supervisor Feedback & Annotation Section */}
      <FeedbackPanel paperId={paper.id} paperOwnerId={paper.userId} />

      {/* Advanced tools stay available without competing with the reading workflow. */}
      <section className="glass-card p-4 md:p-5">
        <button
          type="button"
          onClick={() => setAdvancedToolsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
          aria-expanded={advancedToolsOpen}
        >
          <div>
            <p className="text-sm font-semibold text-text-primary">Advanced research tools</p>
            <p className="text-xs text-text-tertiary mt-0.5">AI discussion, group reading progress, citation maps, and related literature.</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary">
            {advancedToolsOpen ? 'Hide tools' : 'Open tools'}
          </span>
        </button>

        {advancedToolsOpen && (
          <div className="mt-5 pt-5 border-t border-border-default space-y-6">
            <GroupReadingRadarCard paperId={paper.id} paperTitle={paper.title} />
            <PaperChatAssistant paperId={paper.id} paperTitle={paper.title} />
            <CitationGraph paperId={paper.id} paperTitle={paper.title} />
            <ConnectedLiteratureExplorer paperId={paper.id} paperTitle={paper.title} />
          </div>
        )}
      </section>

      {/* Citation Modal */}
      <CitationModal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        paper={paper}
      />

      {/* Export Matrix & BibTeX Modal */}
      <ExportMatrixModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        papers={[paper]}
        title={`Export: ${paper.title.slice(0, 45)}...`}
      />

      {/* 1-Click Supervisor Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Paper to Student Researcher"
        description="Assign this landmark paper to a student's reading queue with research guidance and deadlines."
        size="md"
      >
        <form onSubmit={handleAssignPaper} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Select Student Researcher <span className="text-danger">*</span>
            </label>
            {loadingStudents ? (
              <div className="text-xs text-text-tertiary">Loading supervised students...</div>
            ) : studentList.length === 0 ? (
              <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                No active students found in your roster. Add students in User Management or My Students first.
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent"
                required
              >
                {studentList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.email}) {st.department ? `· ${st.department}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Target Reading Deadline (Optional)
            </label>
            <input
              type="date"
              value={assignDueDate}
              onChange={(e) => setAssignDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Supervisory Guidance / Research Focus (Optional)
            </label>
            <textarea
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="e.g. Focus on Section 3.2 methodology and compare loss functions with our baseline architecture..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={assigning}
              disabled={studentList.length === 0}
              icon={<ClipboardList size={14} />}
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Paper"
        description="Are you sure you want to delete this paper and all its associated notes? This action cannot be undone."
        size="sm"
      >
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete Paper
          </Button>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
