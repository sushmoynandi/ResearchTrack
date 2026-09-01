'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Shield,
  HelpCircle,
  PlayCircle,
  ExternalLink,
  BookOpen,
  FileText,
  ClipboardList,
  Building,
  Calendar,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Milestone,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/components/auth/AuthProvider'
import { youTubeEmbedUrl, youTubeThumbnailUrl, youTubeWatchUrl } from '@/lib/youtube'

interface HelpVideo {
  id: string
  title: string
  description: string | null
  videoId: string
  audience: 'ALL' | 'STUDENT' | 'SUPERVISOR'
  createdAt: string
}

const audienceLabel: Record<HelpVideo['audience'], string> = {
  ALL: 'Everyone',
  STUDENT: 'For Students',
  SUPERVISOR: 'For Supervisors',
}

interface GuideSection {
  id: string
  title: string
  category: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  summary: string
  steps: Array<{ title: string; detail: string; tip?: string }>
  actionLink?: { href: string; label: string }
}

const STUDENT_GUIDES: GuideSection[] = [
  {
    id: 'student-getting-started',
    title: '1. Getting Started & Academic Profile',
    category: 'Onboarding',
    icon: GraduationCap,
    summary: 'Set up your researcher identity, department, and academic links so supervisors and peers can connect with you.',
    steps: [
      {
        title: 'Complete Profile & Affiliation',
        detail: 'Go to Profile settings to add your Institution, Department, Research Bio, and thesis topics.',
        tip: 'Linking your Google Scholar, GitHub, and ORCID makes it easier for advisors to see your research background.',
      },
      {
        title: 'Connect with your Supervisor or Lab',
        detail: 'Explore Research Labs (/labs) to join your university research group, or accept a supervision invitation from your advisor.',
      },
    ],
    actionLink: { href: '/labs', label: 'Explore Research Labs' },
  },
  {
    id: 'student-paper-library',
    title: '2. Adding Papers & AI-Assisted Reading',
    category: 'Paper Reading',
    icon: BookOpen,
    summary: 'Build your personal research library, read PDFs, take structured synthesis notes, and chat with AI.',
    steps: [
      {
        title: 'Add Papers via DOI or arXiv',
        detail: 'Click "+ Add Paper" in Paper Library (/papers) and paste a DOI or arXiv URL. The title, authors, venue, and abstract will load automatically.',
      },
      {
        title: 'Interactive PDF Reader & Notes',
        detail: 'Open any paper in the Split Reader. Read the original PDF on the left while answering structured synthesis questions (Q1–Q9) on the right.',
        tip: 'Saving your notes automatically updates your reading status to "COMPLETED".',
      },
      {
        title: 'Ask Research AI Assistant',
        detail: 'Use the built-in AI Chat inside any paper to explain complex formulas, summarize methodologies, or extract key limitations.',
      },
    ],
    actionLink: { href: '/papers', label: 'Go to Paper Library' },
  },
  {
    id: 'student-assignments',
    title: '3. Tracking Supervisor Reading Assignments',
    category: 'Assignments',
    icon: ClipboardList,
    summary: 'Stay on top of mandatory papers assigned by your supervisor or lab lead with real-time progress syncing.',
    steps: [
      {
        title: 'View Assigned Papers',
        detail: 'Open Assignments (/assignments) to see reading deadlines, supervisor guidance notes, and priority badges.',
      },
      {
        title: 'Complete & Sync Reading',
        detail: 'When you read and synthesize the assigned paper, your progress automatically syncs with your supervisor\'s dashboard.',
      },
    ],
    actionLink: { href: '/assignments', label: 'View Assignments' },
  },
  {
    id: 'student-labs',
    title: '4. Research Labs, Starter Packs & Journal Clubs',
    category: 'Collaboration',
    icon: Building,
    summary: 'Collaborate with your lab members, enroll in starter packs, and participate in scheduled journal clubs.',
    steps: [
      {
        title: 'Join Labs & Sub-Groups',
        detail: 'Submit a join request to research labs or clusters matching your research interest.',
      },
      {
        title: 'Enroll in Starter Packs',
        detail: 'If your PI created a Group Starter Pack, click "Enroll" to automatically import foundational papers directly into your library.',
      },
      {
        title: 'Lab Tasks & Noticeboard',
        detail: 'Check your lab workspace for deliverables, datasets, and announcements from your faculty lead.',
      },
    ],
    actionLink: { href: '/labs', label: 'Go to Labs' },
  },
  {
    id: 'student-milestones',
    title: '5. Thesis Milestones & 1-on-1 Meeting Sync',
    category: 'Milestones',
    icon: Milestone,
    summary: 'Track your graduate journey toward thesis defense and stay aligned during scheduled 1-on-1 advisor meetings.',
    steps: [
      {
        title: 'Manage Thesis Milestones',
        detail: 'Track proposal defense, lit review completion, IRB/ethics approval, and final manuscript submission in Thesis Milestones (/milestones).',
      },
      {
        title: '1-on-1 Advisor Meetings',
        detail: 'Check upcoming meeting agendas and discussion topics scheduled by your advisor in 1-on-1 Meetings (/meetings).',
      },
    ],
    actionLink: { href: '/meetings', label: '1-on-1 Meetings' },
  },
]

const SUPERVISOR_GUIDES: GuideSection[] = [
  {
    id: 'supervisor-students',
    title: '1. Finding & Adding Students to Supervision',
    category: 'Supervision',
    icon: Users,
    summary: 'Easily discover student researchers across the institution and link them to your supervision roster.',
    steps: [
      {
        title: 'Search Student Directory',
        detail: 'Open "My Students" (/students) and click the "Find & Add Students" tab to search by student name, email, or department.',
      },
      {
        title: 'One-Click "+ Add to My Supervision"',
        detail: 'Click "+ Add to My Supervision" on any student card. Once linked, you can view their real-time reading telemetry, notes, and activity health.',
        tip: 'Telemetry and reading progress are protected until a student is added to your supervision sphere.',
      },
      {
        title: 'Monitor Reading Velocity',
        detail: 'Keep track of student activity health badges: 🟢 High Velocity (active reading), 🟡 Tasks Due, or ⚪ Inactive.',
      },
    ],
    actionLink: { href: '/students', label: 'Open My Students' },
  },
  {
    id: 'supervisor-assigning',
    title: '2. Assigning Papers to Students & Labs',
    category: 'Assignments',
    icon: BookOpen,
    summary: 'Assign critical literature directly to individual students, research sub-groups, or whole labs with due dates.',
    steps: [
      {
        title: 'Assign from Library or Students Roster',
        detail: 'Click "Assign Paper" from any paper in your library or click "Assign" on a student card in your roster.',
      },
      {
        title: 'Target Individual or Entire Lab',
        detail: 'Choose whether to assign to an individual student, a sub-group cluster, or an entire lab team with custom guidance notes.',
      },
      {
        title: 'Review Reading Synthesis',
        detail: 'Inspect your students\' synthesized notes and answers (Q1–Q9) to ensure deep comprehension before lab meetings.',
      },
    ],
    actionLink: { href: '/assignments', label: 'Manage Assignments' },
  },
  {
    id: 'supervisor-labs',
    title: '3. Managing Research Labs & Sub-Groups',
    category: 'Lab Leadership',
    icon: Building,
    summary: 'Lead research labs, manage join requests, assign lab tasks, and publish broadcasts.',
    steps: [
      {
        title: 'Create & Lead Labs',
        detail: 'Set up your Research Lab (/labs) with institutional affiliation, research focus, and sub-groups.',
      },
      {
        title: 'Starter Packs for New Students',
        detail: 'Curate a "Starter Pack" collection of foundational papers so new students can onboard and import key literature instantly.',
      },
      {
        title: 'Broadcasts & Notices',
        detail: 'Post team announcements and schedule Journal Club sessions directly within your lab portal.',
      },
    ],
    actionLink: { href: '/labs', label: 'Go to Research Labs' },
  },
  {
    id: 'supervisor-meetings',
    title: '4. Scheduling 1-on-1 Syncs & Research Advice',
    category: 'Mentorship',
    icon: Calendar,
    summary: 'Structure productive 1-on-1 mentorship sessions and send actionable research advice.',
    steps: [
      {
        title: 'Schedule 1-on-1 Meetings',
        detail: 'Schedule advisory sessions with agenda topics and calendar integration in 1-on-1 Meetings (/meetings).',
      },
      {
        title: 'Send Research Advice',
        detail: 'Click "Advice" on any student card to send structured research guidance and instant notifications directly to the student.',
      },
    ],
    actionLink: { href: '/meetings', label: '1-on-1 Meetings' },
  },
  {
    id: 'supervisor-reports',
    title: '5. Exporting Lab Progress Reports',
    category: 'Reporting',
    icon: FileText,
    summary: 'Generate and download executive summaries of student publications and reading telemetry.',
    steps: [
      {
        title: 'Generate Lab Reports',
        detail: 'Click "Report" on any student card in your roster or in lab management to view comprehensive publication records and progress metrics.',
      },
      {
        title: 'Export for Grant & Department Reviews',
        detail: 'Export clean formatted progress summaries suitable for academic review committees and funding sponsors.',
      },
    ],
    actionLink: { href: '/students', label: 'View Student Reports' },
  },
]

export default function HelpPage() {
  const { isSupervisor, isAdmin } = useAuth()

  // Active view: 'GUIDE' or 'VIDEOS'
  const [activeTab, setActiveTab] = useState<'GUIDE' | 'VIDEOS'>('GUIDE')

  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch('/api/help-videos')
        if (res.ok) {
          const data = await res.json()
          setVideos(data.videos || [])
        }
      } catch {
        // silent
      } finally {
        setLoadingVideos(false)
      }
    }
    loadVideos()
  }, [])

  // Strictly isolate guides: Supervisor/Admin gets SUPERVISOR_GUIDES, Student gets STUDENT_GUIDES
  const isSupervisorView = isSupervisor || isAdmin
  const currentGuides = isSupervisorView ? SUPERVISOR_GUIDES : STUDENT_GUIDES

  // Filter video tutorials by audience matching role
  const relevantVideos = videos.filter((v) => {
    if (v.audience === 'ALL') return true
    if (isSupervisorView) return v.audience === 'SUPERVISOR'
    return v.audience === 'STUDENT'
  })

  const filteredGuides = currentGuides.filter((g) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchTitle = g.title.toLowerCase().includes(q)
    const matchSummary = g.summary.toLowerCase().includes(q)
    const matchCategory = g.category.toLowerCase().includes(q)
    const matchSteps = g.steps.some(
      (s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
    )
    return matchTitle || matchSummary || matchCategory || matchSteps
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="glass-card p-6 md:p-8 border-purple-500/30 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1.5 font-mono">
            <Sparkles size={13} /> {isSupervisorView ? 'Faculty Supervisor User Guide' : 'Student Researcher User Guide'}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary font-display tracking-tight">
            How to Use ResearchTrack
          </h1>
          <p className="text-xs md:text-sm text-text-secondary max-w-2xl leading-relaxed">
            {isSupervisorView
              ? 'Complete guide for managing student rosters, paper assignments, research labs, and 1-on-1 mentorship.'
              : 'Complete guide for building your paper library, AI-assisted reading, assignment tracking, and thesis milestones.'}
          </p>
        </div>
      </div>

      {/* Main Tab Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('GUIDE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'GUIDE'
                ? isSupervisorView
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default'
            }`}
          >
            {isSupervisorView ? <Shield size={16} /> : <GraduationCap size={16} />}
            <span>{isSupervisorView ? '👔 Supervisor Step-by-Step Guide' : '🎓 Student Step-by-Step Guide'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VIDEOS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'VIDEOS'
                ? 'bg-accent text-white shadow-md shadow-accent/25'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default'
            }`}
          >
            <PlayCircle size={16} />
            <span>🎬 Video Tutorials ({relevantVideos.length})</span>
          </button>
        </div>

        {/* Quick Search */}
        {activeTab !== 'VIDEOS' && (
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics..."
              className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      {/* ─── ROLE-BASED STEP-BY-STEP GUIDES ──────────────────────────── */}
      {activeTab !== 'VIDEOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span className="font-semibold flex items-center gap-1.5">
              {!isSupervisorView ? <GraduationCap size={15} className="text-purple-400" /> : <Shield size={15} className="text-indigo-400" />}
              {!isSupervisorView ? 'Student Workflows & Features' : 'Supervisor & Lab Management Workflows'}
            </span>
            <span className="text-[11px] font-mono text-text-tertiary">
              {filteredGuides.length} Topic(s)
            </span>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-text-tertiary space-y-2">
              <Search size={28} className="mx-auto opacity-30 text-accent" />
              <p>No guides match your search query &quot;{searchQuery}&quot;.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-accent underline hover:text-accent-hover cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGuides.map((guide) => {
                const Icon = guide.icon
                const isExpanded = expandedSectionId === guide.id || searchQuery.trim().length > 0

                return (
                  <div
                    key={guide.id}
                    className={`glass-card border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? isSupervisorView
                          ? 'border-indigo-500/50 shadow-lg'
                          : 'border-purple-500/50 shadow-lg'
                        : 'border-border-default/80 hover:border-border-hover'
                    }`}
                  >
                    {/* Collapsible Card Header */}
                    <div
                      onClick={() => setExpandedSectionId(isExpanded ? null : guide.id)}
                      className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none bg-bg-secondary/40 hover:bg-bg-tertiary/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            isSupervisorView
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          <Icon size={20} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-bg-tertiary text-text-tertiary border border-border-default">
                              {guide.category}
                            </span>
                            <h3 className="text-base font-bold text-text-primary font-display">
                              {guide.title}
                            </h3>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {guide.summary}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded-lg text-text-tertiary hover:text-text-primary shrink-0 transition-colors"
                        aria-label="Toggle section"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {/* Step-by-Step Instructions Body */}
                    {isExpanded && (
                      <div className="p-5 pt-3 border-t border-border-default/60 space-y-4 animate-slide-in">
                        <div className="grid gap-3">
                          {guide.steps.map((step, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center gap-2 font-bold text-text-primary">
                                <CheckCircle2
                                  size={14}
                                  className={isSupervisorView ? 'text-indigo-400' : 'text-purple-400'}
                                />
                                <span>{step.title}</span>
                              </div>
                              <p className="text-text-secondary leading-relaxed pl-5">
                                {step.detail}
                              </p>
                              {step.tip && (
                                <div className="ml-5 mt-1 p-2 rounded-lg bg-accent/10 border border-accent/20 text-[11px] text-accent flex items-start gap-1.5">
                                  <Sparkles size={12} className="shrink-0 mt-0.5" />
                                  <span><strong>Pro Tip:</strong> {step.tip}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Link Button */}
                        {guide.actionLink && (
                          <div className="pt-2 flex items-center justify-end">
                            <Link href={guide.actionLink.href}>
                              <Button
                                size="xs"
                                variant="primary"
                                className={
                                  isSupervisorView
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white font-bold'
                                }
                              >
                                {guide.actionLink.label} <ArrowRight size={13} className="ml-1" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── VIDEO TUTORIALS TAB ────────────────────────────────────────── */}
      {activeTab === 'VIDEOS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <PlayCircle size={15} className="text-accent" /> Published Video Walkthroughs
            </span>
            <span className="text-[11px] font-mono text-text-tertiary">
              {relevantVideos.length} Video(s)
            </span>
          </div>

          {loadingVideos ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton variant="card" height="180px" />
                  <Skeleton variant="text" width="60%" />
                </div>
              ))}
            </div>
          ) : relevantVideos.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={44} />}
              title="No tutorial videos yet"
              description="Your administrator has not published any walkthrough videos for your role. Check back soon."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {relevantVideos.map((video) => {
                const isPlaying = playingVideoId === video.id
                return (
                  <article
                    key={video.id}
                    className="glass-card overflow-hidden border-border-default/80 flex flex-col hover:border-accent/40 transition-colors"
                  >
                    <div className="relative aspect-video bg-bg-tertiary">
                      {isPlaying ? (
                        <iframe
                          src={`${youTubeEmbedUrl(video.videoId)}&autoplay=1`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full border-0"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPlayingVideoId(video.id)}
                          className="group absolute inset-0 w-full h-full cursor-pointer"
                          aria-label={`Play ${video.title}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={youTubeThumbnailUrl(video.videoId)}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                          <span className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors duration-200" />
                          <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-lg">
                            <PlayCircle size={56} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-text-primary leading-snug">
                          {video.title}
                        </h3>
                        {video.audience !== 'ALL' && (
                          <Badge variant="outline" size="sm">
                            <span className="inline-flex items-center gap-1">
                              <Users size={10} /> {audienceLabel[video.audience]}
                            </span>
                          </Badge>
                        )}
                      </div>

                      {video.description && (
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {video.description}
                        </p>
                      )}

                      <a
                        href={youTubeWatchUrl(video.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto pt-2 text-[11px] text-text-tertiary hover:text-accent inline-flex items-center gap-1 transition-colors w-fit"
                      >
                        Open on YouTube <ExternalLink size={11} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
