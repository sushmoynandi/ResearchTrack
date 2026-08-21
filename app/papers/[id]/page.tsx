'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { LiteratureReviewView, LiteratureReviewEditor } from '@/components/papers/LiteratureReviewSection'
import { CitationGraph } from '@/components/papers/CitationGraph'
import { ConnectedLiteratureExplorer } from '@/components/papers/ConnectedLiteratureExplorer'
import { PaperChatAssistant } from '@/components/papers/PaperChatAssistant'
import { SharePaperModal } from '@/components/papers/SharePaperModal'
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
  Building,
  Layers,
  User,
} from 'lucide-react'
import { GithubIcon, HuggingFaceIcon } from '@/components/ui/Icons'
import type {
  Paper,
  BenchmarkScore,
  ReplicationStatus,
  LiteratureReviewData,
  QuestionAnswer,
} from '@/lib/types'
import { REPLICATION_LABELS } from '@/lib/types'

export default function PaperDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('')
  const [selectedSharedReviewId, setSelectedSharedReviewId] = useState<string>('')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Student Literature Review Editor Modal State
  const [isEditReviewModalOpen, setIsEditReviewModalOpen] = useState(false)
  const [editReviewData, setEditReviewData] = useState<LiteratureReviewData>({})
  const [savingStudentReview, setSavingStudentReview] = useState(false)

  // Auto-select reviewer tab if studentId or reviewerId param is present, or default to first assigned student
  useEffect(() => {
    if (paper?.assignments && paper.assignments.length > 0) {
      const studentIdParam = searchParams?.get('studentId') || searchParams?.get('reviewerId')
      if (studentIdParam && paper.assignments.some((a) => a.studentId === studentIdParam)) {
        setSelectedReviewerId(studentIdParam)
      } else if (!selectedReviewerId || !paper.assignments.some((a) => a.studentId === selectedReviewerId)) {
        setSelectedReviewerId(paper.assignments[0].studentId)
      }
    }

    if (
      paper?.sharedReviews &&
      paper.sharedReviews.length > 0 &&
      !paper.assignments?.some((a) => a.studentId === user?.id) &&
      paper.userId !== user?.id
    ) {
      if (!selectedSharedReviewId) {
        setSelectedSharedReviewId(paper.sharedReviews[0].sharedById)
      }
    }
  }, [paper?.assignments, paper?.sharedReviews, paper?.userId, searchParams, selectedReviewerId, selectedSharedReviewId, user?.id])

  // 1-Click Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignScope, setAssignScope] = useState<'STUDENT' | 'LAB' | 'GROUP'>('STUDENT')
  const [studentList, setStudentList] = useState<{ id: string; name: string; email: string; department?: string }[]>([])
  const [labList, setLabList] = useState<{ id: string; name: string; members: any[]; groups: { id: string; name: string }[] }[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedLabId, setSelectedLabId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)

  // PDF upload state
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const paperId = params.id as string

  // Fetch students and labs for supervisor assignment modal
  useEffect(() => {
    if (isAssignModalOpen && (isSupervisor || isAdmin)) {
      if (studentList.length === 0) {
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

      if (labList.length === 0) {
        fetch('/api/labs')
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            setLabList(data)
            if (data.length > 0) {
              setSelectedLabId(data[0].id)
              if (data[0].groups?.length > 0) {
                setSelectedGroupId(data[0].groups[0].id)
              }
            }
          })
          .catch(() => {})
      }
    }
  }, [isAssignModalOpen, isSupervisor, isAdmin, studentList.length, labList.length])

  const handleAssignPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssigning(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          targetType: assignScope,
          studentId: assignScope === 'STUDENT' ? selectedStudentId : undefined,
          labId: assignScope === 'LAB' ? selectedLabId : undefined,
          groupId: assignScope === 'GROUP' ? selectedGroupId : undefined,
          dueDate: assignDueDate || undefined,
          note: assignNote || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        addToast('success', data.message || 'Assigned paper successfully!')
        setIsAssignModalOpen(false)
        setAssignNote('')
        setAssignDueDate('')
        fetchPaper()
      } else {
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
        // If accessed via old CUID or different slug, update the browser URL bar to the clean title slug
        if (data.slug && paperId !== data.slug && typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href)
          currentUrl.pathname = `/papers/${data.slug}`
          window.history.replaceState(null, '', currentUrl.toString())
        }
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

  const handleUpdateAssignmentStatus = async (assignmentId: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId, status: newStatus }),
      })
      if (res.ok) {
        addToast('success', `Assignment status updated to ${newStatus}`)
        fetchPaper()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update assignment status')
      }
    } catch {
      addToast('error', 'Network error updating assignment status')
    }
  }

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
    : selectedReviewerId
    ? paper.assignments?.find((assignment) => assignment.studentId === selectedReviewerId)
    : paper.assignments?.[0]

  const canManagePaper = paper.userId === user?.id || isSupervisor || isAdmin

  // Active student assignment being viewed
  const activeStudentAssignment = isStudent
    ? visibleAssignment
    : selectedReviewerId
    ? paper.assignments?.find((a) => a.studentId === selectedReviewerId) || paper.assignments?.[0]
    : paper.assignments?.[0]

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

  // Selected peer shared review (for students viewing shared reviews)
  const selectedSharedReview = paper.sharedReviews?.find((sr) => sr.sharedById === selectedSharedReviewId)

  // Active Literature Review Raw Content
  const activeLitReviewRawString = selectedSharedReview
    ? selectedSharedReview.literatureReview || ''
    : activeStudentAssignment
    ? activeStudentAssignment.literatureReview || ''
    : isStudent
    ? paper.literatureReview || ''
    : ''

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
    assignedPerson:
      rawLitReview.assignedPerson ||
      (selectedSharedReview
        ? `${selectedSharedReview.sharedByName} (Shared)`
        : activeStudentAssignment?.student?.name
        ? activeStudentAssignment.student.name
        : user?.name || ''),
    reviewDueDate: rawLitReview.reviewDueDate || (activeStudentAssignment?.dueDate ? activeStudentAssignment.dueDate.slice(0, 10) : ''),
    reviewWorkflowStatus: rawLitReview.reviewWorkflowStatus || (activeStudentAssignment?.status === 'COMPLETED' ? 'COMPLETED' : activeStudentAssignment?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING_REVIEW'),
    selectedPaperTitle: rawLitReview.selectedPaperTitle || paper.title,
    paperTitle: rawLitReview.paperTitle || paper.title,
    paperLink: rawLitReview.paperLink || paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ''),
    pdfAccessibility: rawLitReview.pdfAccessibility || (paper.pdfPath ? 'Open Access' : 'Pre-print Available'),
    researchGap: rawLitReview.researchGap || '',
    usedDataset: rawLitReview.usedDataset || '',
    summaryRepository: rawLitReview.summaryRepository || '',
    remarks: rawLitReview.remarks || '',
    q1ProblemImportance: rawLitReview.q1ProblemImportance,
    q2DataDetails: rawLitReview.q2DataDetails,
    q3FeaturesInputs: rawLitReview.q3FeaturesInputs,
    q4MethodsPipeline: rawLitReview.q4MethodsPipeline,
    q5Baselines: rawLitReview.q5Baselines,
    q6Evaluation: rawLitReview.q6Evaluation,
    q7KeyResults: rawLitReview.q7KeyResults,
    q8LimitationsBiases: rawLitReview.q8LimitationsBiases,
    q9ArtifactsReplication: rawLitReview.q9ArtifactsReplication,
    customQuestions: rawLitReview.customQuestions || [],
    outcome: rawLitReview.outcome || '',
    rubricReviews: rawLitReview.rubricReviews || [],
    collaborationComments: rawLitReview.collaborationComments || [],
  }

  const handleUpdateLitReview = (updated: LiteratureReviewData) => {
    setPaper((prev) => (prev ? { ...prev, literatureReview: JSON.stringify(updated) } : prev))
  }

  const handleOpenEditReviewModal = () => {
    setEditReviewData(rawLitReview)
    setIsEditReviewModalOpen(true)
  }

  const handleSaveStudentReview = async () => {
    setSavingStudentReview(true)
    try {
      if (visibleAssignment) {
        const res = await fetch('/api/assignments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: visibleAssignment.id,
            literatureReview: JSON.stringify(editReviewData),
            status: editReviewData.q1ProblemImportance?.detailedAnswer ? 'IN_PROGRESS' : visibleAssignment.status,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setPaper((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              assignments: (prev.assignments || []).map((a) =>
                a.id === visibleAssignment.id ? { ...a, literatureReview: updated.literatureReview, status: updated.status } : a
              ),
            }
          })
          addToast('success', 'Literature review saved successfully!')
          setIsEditReviewModalOpen(false)
        } else {
          addToast('error', 'Failed to save review')
        }
      } else {
        const res = await fetch(`/api/papers/${paper.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            literatureReview: JSON.stringify(editReviewData),
          }),
        })
        if (res.ok) {
          setPaper((prev) => (prev ? { ...prev, literatureReview: JSON.stringify(editReviewData) } : prev))
          addToast('success', 'Literature review saved successfully!')
          setIsEditReviewModalOpen(false)
        } else {
          addToast('error', 'Failed to save review')
        }
      }
    } catch {
      addToast('error', 'Network error saving review')
    } finally {
      setSavingStudentReview(false)
    }
  }

  const handleSaveQuestionComment = async (questionKey: string, comment: string) => {
    const currentReview = { ...parsedLiteratureReview }
    if (questionKey.startsWith('custom_')) {
      const customId = questionKey.replace('custom_', '')
      currentReview.customQuestions = (currentReview.customQuestions || []).map((cq) =>
        cq.id === customId ? { ...cq, comment } : cq
      )
    } else {
      const existingQ = (currentReview[questionKey as keyof LiteratureReviewData] as QuestionAnswer) || {}
      ;(currentReview as Record<string, unknown>)[questionKey] = {
        ...existingQ,
        comment,
      }
    }

    if (activeStudentAssignment) {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStudentAssignment.id,
          literatureReview: JSON.stringify(currentReview),
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setPaper((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            assignments: (prev.assignments || []).map((a) =>
              a.id === activeStudentAssignment.id ? { ...a, literatureReview: updated.literatureReview } : a
            ),
          }
        })
        addToast('success', 'Saved reviewer comment / discussion note')
      } else {
        throw new Error('Failed to save comment')
      }
    } else {
      const res = await fetch(`/api/papers/${paper.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          literatureReview: JSON.stringify(currentReview),
        }),
      })

      if (res.ok) {
        setPaper((prev) => (prev ? { ...prev, literatureReview: JSON.stringify(currentReview) } : prev))
        addToast('success', 'Saved reviewer comment / discussion note')
      } else {
        throw new Error('Failed to save comment')
      }
    }
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
          <Link href={`/papers/${paper.slug || paper.id}/reader`}>
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

          {/* Peer Student Sharing Action (Students Only - Supervisors use Assign) */}
          {isStudent && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Share2 size={14} className="text-purple-400" />}
              onClick={() => setIsShareModalOpen(true)}
            >
              Share
              {Boolean(paper.shares && paper.shares.length > 0) && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-purple-500/20 text-purple-400 rounded-md font-mono font-bold">
                  {paper.shares?.length}
                </span>
              )}
            </Button>
          )}

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
              {isStudent && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
                >
                  <Share2 size={13} className="text-purple-400" /> Share with peers
                </button>
              )}
              <Link
                href={`/papers/${paper.slug || paper.id}/present`}
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
                    href={`/papers/${paper.slug || paper.id}/edit`}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  >
                    <Edit size={13} /> Edit paper
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete paper
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Peer Student Shared Banner */}
      {isStudent && paper.shares && paper.shares.some((s) => s.sharedWithId === user?.id) && (
        <div className="glass-card p-4 md:p-5 border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                Collaborative Paper Shared with You 🤝
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Shared by{' '}
                <strong className="text-emerald-400 font-semibold">
                  {paper.shares.find((s) => s.sharedWithId === user?.id)?.sharedBy?.name || 'Fellow Researcher'}
                </strong>{' '}
                for joint literature exploration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Person / Supervisor Details Banner */}
      {isStudent && visibleAssignment && (
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
                  Assigned by <strong className="text-purple-400 font-semibold">{visibleAssignment.assignedBy?.name || 'Faculty Advisor'}</strong> to{' '}
                  <strong className="text-cyan-400 font-semibold">You ({user?.name})</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {visibleAssignment.dueDate && (
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-bg-tertiary text-text-secondary border border-border-default flex items-center gap-1.5">
                  <Calendar size={13} className="text-accent" />
                  Due: {new Date(visibleAssignment.dueDate).toLocaleDateString()}
                </span>
              )}

              {/* Student 1-Click Status Switcher */}
              <div className="flex items-center gap-1 bg-bg-tertiary p-1 rounded-xl border border-border-default">
                {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => {
                  const isActive = visibleAssignment.status === st
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateAssignmentStatus(visibleAssignment.id, st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        isActive
                          ? st === 'COMPLETED'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : st === 'IN_PROGRESS'
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                          : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      {st === 'IN_PROGRESS' ? 'Reading' : st === 'COMPLETED' ? 'Completed' : 'To Read'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {visibleAssignment.note && (
            <p className="text-xs text-text-secondary bg-bg-tertiary/70 p-3 rounded-xl italic border border-border-default/50">
              &ldquo;{visibleAssignment.note}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Supervisor / Admin View: Multi-Student or Specific Student Assignment Banner */}
      {!isStudent && paper.assignments && paper.assignments.length > 0 && (
        <div className="glass-card p-4 md:p-5 border-purple-500/30 bg-purple-500/5 space-y-3">
          {selectedReviewerId !== 'SUPERVISOR' && visibleAssignment ? (
            /* Specific Student Selected */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                      Student Assignment: {visibleAssignment.student?.name || 'Researcher'}
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
          ) : (
            /* Overview of All Assigned Students */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Assigned Researchers ({paper.assignments.length})
                    </h4>
                    <p className="text-[11px] text-text-tertiary">
                      Click any student to view their individual Q1–Q9 synthesis notes and answers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {paper.assignments.map((a) => {
                  const isSelected = selectedReviewerId === a.studentId
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedReviewerId(a.studentId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-xs'
                          : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <GraduationCap size={13} className="text-purple-400" />
                      <span>{a.student?.name || 'Student'}</span>
                      <span className="text-[10px] text-text-tertiary font-normal">
                        (by {a.assignedBy?.name || 'Supervisor'})
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : a.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {a.status}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Title & Authors Card */}
      <div className="glass-card p-6 md:p-8 space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge
            status={
              isStudent && visibleAssignment
                ? visibleAssignment.status === 'COMPLETED'
                  ? 'COMPLETED'
                  : visibleAssignment.status === 'IN_PROGRESS'
                  ? 'READING'
                  : 'TO_READ'
                : selectedReviewerId !== 'SUPERVISOR' && visibleAssignment
                ? visibleAssignment.status === 'COMPLETED'
                  ? 'COMPLETED'
                  : visibleAssignment.status === 'IN_PROGRESS'
                  ? 'READING'
                  : 'TO_READ'
                : paper.status
            }
          />
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
            <div>
              <h3 className="text-base font-semibold text-text-primary font-display">
                Structured Literature Review &amp; Paper Survey (Q1–Q9 Framework)
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {isStudent
                  ? 'Your independent 9-point research evaluation, short summaries, and synthesis.'
                  : 'Student researcher evaluations, methodology analysis, and faculty critique.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStudent && (visibleAssignment || paper.userId === user?.id) && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenEditReviewModal}
                icon={<Edit size={13} />}
              >
                Edit My Literature Review
              </Button>
            )}

            {(isSupervisor || isAdmin) && (
              <Badge variant="outline" size="sm" className="bg-bg-tertiary border-border-default">
                <MessageSquare size={12} className="mr-1 text-accent" /> Supervisor Feedback Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Multi-Student Synthesis Switcher (when multiple students are assigned) */}
        {paper.assignments && paper.assignments.length > 1 && (isSupervisor || isAdmin || paper.userId === user?.id) && (
          <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-display text-[11px]">
                <Users size={14} className="text-accent" /> Assigned Student Syntheses ({paper.assignments.length})
              </span>
              <span className="text-[11px] text-text-tertiary">
                Select a student researcher to inspect their Q1–Q9 answers and leave discussion comments.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                        ? 'bg-accent/15 text-accent border-accent shadow-xs'
                        : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <GraduationCap size={13} className={isSelected ? 'text-accent' : 'text-text-tertiary'} />
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

        {/* Student Collaborative Literature Review Switcher (when peers shared their answers) */}
        {isStudent && paper.sharedReviews && paper.sharedReviews.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-bg-secondary border border-emerald-500/30 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-display text-[11px]">
                <Share2 size={14} className="text-emerald-400" /> Collaborative Literature Reviews
              </span>
              <span className="text-[11px] text-text-tertiary">
                Compare your synthesis answers with answers shared by peer researchers.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSharedReviewId('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSharedReviewId === ''
                    ? 'bg-accent/15 text-accent border-accent shadow-xs'
                    : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                <User size={13} />
                <span>My Synthesis Answers</span>
              </button>

              {paper.sharedReviews.map((sr) => {
                const isSelected = selectedSharedReviewId === sr.sharedById
                return (
                  <button
                    key={sr.sharedById}
                    type="button"
                    onClick={() => setSelectedSharedReviewId(sr.sharedById)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-xs'
                        : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <Share2 size={13} className={isSelected ? 'text-emerald-400' : 'text-text-tertiary'} />
                    <span>Shared: {sr.sharedByName}&apos;s Answers</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                      {sr.permission}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Viewing Shared Review Indicator Banner */}
        {selectedSharedReview && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-300">
            <span className="flex items-center gap-2 font-medium">
              <Share2 size={15} className="text-emerald-400 shrink-0" />
              Viewing synthesis answers shared by <strong>{selectedSharedReview.sharedByName}</strong> ({selectedSharedReview.permission} Mode)
            </span>
          </div>
        )}

        {/* Active Student Review Banner */}
        {activeStudentAssignment && !selectedSharedReview && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-300">
            <span className="flex items-center gap-2 font-medium">
              <GraduationCap size={15} className="text-blue-400 shrink-0" />
              Student Synthesis by <strong>{activeStudentAssignment.student?.name || 'Student'}</strong> (
              <span className="font-mono">{activeStudentAssignment.status}</span>)
            </span>
            {activeStudentAssignment.dueDate && (
              <span className="text-[11px] text-text-tertiary font-mono">
                Due: {new Date(activeStudentAssignment.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Display Literature Review Matrix or Empty State */}
        {activeStudentAssignment || isStudent ? (
          <LiteratureReviewView
            data={parsedLiteratureReview}
            paperTitle={paper.title}
            paperUrl={paper.url || undefined}
            doi={paper.doi || undefined}
            onSaveQuestionComment={handleSaveQuestionComment}
          />
        ) : (
          <div className="p-8 text-center glass-card border border-dashed border-border-default rounded-2xl space-y-3">
            <FileCheck size={28} className="mx-auto opacity-30 text-accent" />
            <p className="text-sm font-semibold text-text-secondary">
              No student literature review assigned yet.
            </p>
            <p className="text-xs text-text-tertiary max-w-md mx-auto">
              Assign this paper to your student researchers. Once assigned, students will independently evaluate the paper using the Q1–Q9 framework, and you can review their answers and leave discussion comments &amp; feedback.
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAssignModalOpen(true)}
              icon={<Users size={13} />}
              className="mt-2"
            >
              Assign Paper to Student
            </Button>
          </div>
        )}
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
            <Link href={`/papers/${paper.slug || paper.id}/reader`}>
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
      <NotesSection
        paperId={paper.id}
        initialNotes={paper.notes}
        selectedStudentId={selectedReviewerId}
        students={paper.assignments?.map((a) => ({
          id: a.studentId,
          name: a.student?.name || 'Student',
        }))}
      />

      {/* Faculty Review Rubric & Conference Scorecard */}
      <FacultyRubricCard
        paperId={paper.id}
        paperTitle={paper.title}
        selectedStudentId={selectedReviewerId}
        selectedStudentName={activeStudentAssignment?.student?.name}
      />

      {/* Supervisor Feedback & Annotation Section */}
      <FeedbackPanel
        paperId={paper.id}
        paperOwnerId={paper.userId}
        selectedStudentId={selectedReviewerId}
        selectedStudentName={activeStudentAssignment?.student?.name}
      />

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
        title="Assign Paper to Researchers"
        description="Assign this paper to an individual student, an entire research lab, or a specific sub-group cluster."
        size="md"
      >
        <form onSubmit={handleAssignPaper} className="space-y-4 pt-2">
          {/* Target Scope Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Assignment Scope <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAssignScope('STUDENT')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  assignScope === 'STUDENT'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                <GraduationCap size={14} className="mx-auto mb-1" />
                <span className="block text-xs font-bold">Student</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignScope('LAB')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  assignScope === 'LAB'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                <Building size={14} className="mx-auto mb-1" />
                <span className="block text-xs font-bold">Whole Lab</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignScope('GROUP')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  assignScope === 'GROUP'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                <Layers size={14} className="mx-auto mb-1" />
                <span className="block text-xs font-bold">Sub-Group</span>
              </button>
            </div>
          </div>

          {/* Conditional Target Dropdown */}
          {assignScope === 'STUDENT' && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Select Student Researcher <span className="text-danger">*</span>
              </label>
              {loadingStudents ? (
                <div className="text-xs text-text-tertiary">Loading supervised students...</div>
              ) : studentList.length === 0 ? (
                <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                  No active students found in your roster.
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
          )}

          {assignScope === 'LAB' && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Select Research Laboratory <span className="text-danger">*</span>
              </label>
              {labList.length === 0 ? (
                <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                  No research labs found. Create or join a research lab first.
                </div>
              ) : (
                <select
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent"
                  required
                >
                  {labList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.members?.filter((m: any) => m.user?.systemRole === 'STUDENT').length || 0} students)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {assignScope === 'GROUP' && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Select Sub-Group / Cluster <span className="text-danger">*</span>
              </label>
              {labList.flatMap((l) => l.groups || []).length === 0 ? (
                <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                  No sub-groups found in your research labs.
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent"
                  required
                >
                  {labList.map((l) =>
                    l.groups?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {l.name} ➔ {g.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          )}

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

      {/* Student Literature Review Editor Modal */}
      {isEditReviewModalOpen && (
        <Modal
          isOpen={isEditReviewModalOpen}
          onClose={() => setIsEditReviewModalOpen(false)}
          title={`Literature Review & Synthesis: ${paper.title}`}
          description="Evaluate the paper across the 9 core research methodology questions, short summaries, and research gaps."
          size="lg"
        >
          <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-2">
            <LiteratureReviewEditor
              data={editReviewData}
              onChange={setEditReviewData}
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default sticky bottom-0 bg-bg-secondary/95 backdrop-blur-md py-2.5 px-2 rounded-xl z-20">
              <Button variant="ghost" onClick={() => setIsEditReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveStudentReview}
                loading={savingStudentReview}
                icon={<CheckCircle2 size={14} />}
              >
                Save Literature Review
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Peer Student Paper Sharing Modal */}
      <SharePaperModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        paperId={paper.id}
        paperTitle={paper.title}
        paperSlug={paper.slug}
        currentShares={paper.shares}
        onSharesUpdated={fetchPaper}
      />
    </div>
  )
}
