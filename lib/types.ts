// ─── Core Enums ─────────────────────────────────────────────
export type Status = 'TO_READ' | 'READING' | 'COMPLETED' | 'ARCHIVED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ReplicationStatus = 'UNTESTED' | 'REPRODUCING' | 'REPLICATED' | 'FAILED'
export type AuthProvider = 'CREDENTIALS' | 'GITHUB' | 'GOOGLE' | 'ORCID' | 'GUEST'
export type SystemRole = 'STUDENT' | 'SUPERVISOR' | 'ADMIN'
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
export type FeedbackType = 'COMMENT' | 'SUGGESTION' | 'APPROVAL' | 'REVISION_REQUEST'

// ─── User ───────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  image?: string | null
  institution?: string | null
  department?: string | null
  systemRole: SystemRole
  provider: AuthProvider
  isGuest: boolean
  isActive?: boolean
  supervisorId?: string | null
  createdAt?: string
  updatedAt?: string
  _count?: {
    papers: number
    collections: number
    notes: number
    tags: number
    students?: number
  }
}

export interface UserWithStudents extends User {
  students?: User[]
  supervisor?: User | null
}

// ─── Paper ──────────────────────────────────────────────────
export interface Paper {
  id: string
  userId: string
  title: string
  authors: string
  abstract?: string | null
  doi?: string | null
  url?: string | null
  journal?: string | null
  publicationYear?: number | null
  status: Status
  priority: Priority
  isFavorite: boolean
  pdfPath?: string | null
  arxivId?: string | null
  citationCount?: number | null

  // AI/ML Research Specific
  codeUrl?: string | null
  modelUrl?: string | null
  datasetUrl?: string | null
  replicationStatus: ReplicationStatus

  // Architecture & Compute
  parameters?: string | null
  contextWindow?: string | null
  architecture?: string | null
  computeBudget?: string | null
  benchmarks?: string | null

  // 3-Minute Digest & Synthesis
  problemSolved?: string | null
  keyContribution?: string | null
  limitations?: string | null

  // Literature Review Matrix & Collaboration
  literatureReview?: string | null

  createdAt: string
  updatedAt: string
  tags?: Tag[]
  collections?: Collection[]
  notes?: Note[]
  user?: { id: string; name: string; systemRole: SystemRole; email?: string }
  assignments?: Assignment[]
  _count?: { notes?: number; feedback?: number }
}

// ─── Assignment ─────────────────────────────────────────────
export interface Assignment {
  id: string
  paperId: string
  paper?: Paper
  studentId: string
  student?: User
  assignedById: string
  assignedBy?: User
  dueDate?: string | null
  status: AssignmentStatus
  note?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Feedback ───────────────────────────────────────────────
export interface Feedback {
  id: string
  content: string
  paperId: string
  paper?: Paper
  authorId: string
  author?: User
  targetUserId: string
  targetUser?: User
  type: FeedbackType
  createdAt: string
}

// ─── Tag, Collection, Note ──────────────────────────────────
export interface Tag {
  id: string
  userId?: string
  name: string
}

export interface Collection {
  id: string
  userId?: string
  name: string
  description?: string | null
  color?: string | null
  createdAt: string
  _count?: { papers: number }
}

export interface Note {
  id: string
  userId?: string
  user?: { id: string; name: string; systemRole: SystemRole }
  content: string
  paperId: string
  createdAt: string
  updatedAt: string
}

// ─── Benchmarks ─────────────────────────────────────────────
export interface BenchmarkScore {
  name: string
  score: string
  metric?: string
  baseline?: string
}

// ─── Literature Review Types ────────────────────────────────
export interface QuestionAnswer {
  questionId?: string
  questionText?: string
  answer?: string
  shortSummary?: string
  detailedAnswer?: string
  confidence?: 'High' | 'Medium' | 'Low' | string
  quoteSnippet?: string
  pageNumber?: number | string
  lastUpdatedBy?: string
  comment?: string
  [key: string]: any
}

export interface CustomQuestion {
  id?: string
  num?: number | string
  title?: string
  questionText?: string
  shortSummary?: string
  detailedAnswer?: string
  comment?: string
  category?: 'Methodology' | 'Evaluation' | 'Limitations' | 'Compute' | 'Custom' | string
  [key: string]: any
}

export type ReviewWorkflowStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'UNDER_REVIEW'
  | 'REVIEWED'
  | 'ACCEPTED'
  | 'REVISE'
  | 'REJECTED'
  | 'APPROVED'
  | string

export const REVIEW_WORKFLOW_LABELS: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  ASSIGNED: 'Assigned',
  UNDER_REVIEW: 'Under Review',
  REVIEWED: 'Reviewed',
  ACCEPTED: 'Lab Accepted',
  APPROVED: 'Approved',
  REVISE: 'Needs Clarification',
  REJECTED: 'Deprioritized',
}

export const REVIEW_WORKFLOW_COLORS: Record<string, string> = {
  UNASSIGNED: 'default',
  ASSIGNED: 'info',
  UNDER_REVIEW: 'warning',
  REVIEWED: 'info',
  ACCEPTED: 'success',
  APPROVED: 'success',
  REVISE: 'warning',
  REJECTED: 'danger',
}

export type ReviewRecommendation =
  | 'STRONG_ACCEPT'
  | 'ACCEPT'
  | 'WEAK_ACCEPT'
  | 'BORDERLINE'
  | 'WEAK_REJECT'
  | 'REJECT'
  | string

export const RECOMMENDATION_LABELS: Record<string, string> = {
  STRONG_ACCEPT: 'Strong Accept (Landmark / Must Read)',
  ACCEPT: 'Accept (High Quality Contribution)',
  WEAK_ACCEPT: 'Weak Accept (Solid Incremental)',
  BORDERLINE: 'Borderline (Interesting but Flawed)',
  WEAK_REJECT: 'Weak Reject (Missing Key Baselines)',
  REJECT: 'Reject (Soundness Issues)',
}

export interface ReviewRubricScores {
  soundness?: number
  novelty?: number
  empiricalStrength?: number
  reproducibility?: number
  clarity?: number
  rigor?: number
  empiricalSoundness?: number
  [key: string]: any
}

export interface ReviewerScorecard {
  reviewerId: string
  reviewerName: string
  reviewerRole: string
  scores: ReviewRubricScores
  recommendation: ReviewRecommendation
  summaryVerdict?: string
  summaryReview?: string
  strengths?: string[] | string
  weaknesses?: string[] | string
  suggestedExperiments?: string
  submittedAt?: string
  [key: string]: any
}

export interface CollaborationComment {
  id: string
  authorId: string
  authorName: string
  authorRole: string
  authorAvatar?: string
  content: string
  sectionAnchor?: string
  pageNumber?: number
  resolved?: boolean
  createdAt: string
  mentions?: string[]
  replies?: CollaborationComment[]
  [key: string]: any
}

export interface LiteratureReviewData {
  sl?: string | number
  assignedPerson?: string
  selectedPaperTitle?: string
  paperTitle?: string
  paperLink?: string
  pdfAccessibility?: string
  researchGap?: string
  usedDataset?: string
  summaryRepository?: string
  remarks?: string
  outcome?: string

  // Core Structured Extraction Questions (Q1 to Q10)
  q1ProblemImportance?: any
  q2DataDetails?: any
  q3FeaturesInputs?: any
  q4MethodsPipeline?: any
  q5CoreInnovations?: any
  q6BaselineComparisons?: any
  q7KeyResults?: any
  q8LimitationsBiases?: any
  q9FutureWorkRelevance?: any
  q10ComputeBudgetHw?: any

  customQuestions?: CustomQuestion[]
  workflowStatus?: ReviewWorkflowStatus
  assignedReviewerId?: string
  assignedReviewerName?: string
  dueReviewDate?: string
  answers?: QuestionAnswer[]
  scorecards?: ReviewerScorecard[]
  comments?: CollaborationComment[]
  takeawayTLDR?: string
  applicabilityToOurLab?: string
  [key: string]: any
}

// ─── Dashboard Stats ────────────────────────────────────────
export interface DashboardStats {
  totalPapers: number
  toRead: number
  reading: number
  completed: number
  archived: number
  favorites: number
  totalNotes: number
  totalCollections: number
  recentPapers: Paper[]
  tagDistribution: { id: string; name: string; count: number }[]
}

// ─── Label & Color Maps ────────────────────────────────────
export const STATUS_LABELS: Record<Status, string> = {
  TO_READ: 'To Read',
  READING: 'Reading',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const REPLICATION_LABELS: Record<ReplicationStatus, string> = {
  UNTESTED: 'Not Tested',
  REPRODUCING: 'Reproducing',
  REPLICATED: 'Replicated',
  FAILED: 'Failed',
}

export const REPLICATION_COLORS: Record<ReplicationStatus, string> = {
  UNTESTED: 'default',
  REPRODUCING: 'warning',
  REPLICATED: 'success',
  FAILED: 'danger',
}

export const STATUS_COLORS: Record<Status, string> = {
  TO_READ: 'info',
  READING: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
}

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  STUDENT: 'Student Researcher',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrator',
}

export const SYSTEM_ROLE_COLORS: Record<SystemRole, string> = {
  STUDENT: '#3B82F6',
  SUPERVISOR: '#7C3AED',
  ADMIN: '#DC2626',
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  COMMENT: 'Comment',
  SUGGESTION: 'Suggestion',
  APPROVAL: 'Approval',
  REVISION_REQUEST: 'Revision Request',
}

// ─── Legacy compatibility (kept for existing components) ────
export type UserRole = string

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  avatar: string
  email: string
  color: string
  title?: string
  discordHandle?: string
  [key: string]: any
}

export const LAB_MEMBERS: UserProfile[] = []
