'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Clock,
  BookOpen,
  Cpu,
  Trophy,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  MessageSquare,
  Layers,
  Calendar,
  ExternalLink,
  RotateCcw,
  Play,
  Pause,
  Send,
  HelpCircle,
  Database,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  Flame,
  LayoutGrid,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { GithubIcon, HuggingFaceIcon } from '@/components/ui/Icons'
import type {
  Paper,
  BenchmarkScore,
  LiteratureReviewData,
  QuestionAnswer,
} from '@/lib/types'
import { REPLICATION_LABELS, REPLICATION_COLORS } from '@/lib/types'

const EVAL_QUESTIONS: { key: string; label: string; question: string }[] = [
  { key: 'q1ProblemImportance', label: 'Q1', question: 'Problem addressed & why is it important?' },
  { key: 'q2DataDetails', label: 'Q2', question: 'Dataset details & benchmarks used' },
  { key: 'q3KeyAssumptions', label: 'Q3', question: 'Key assumptions made in this work' },
  { key: 'q4MethodsPipeline', label: 'Q4', question: 'Methodological pipeline & architecture' },
  { key: 'q5NoveltyContribution', label: 'Q5', question: 'Core novelty & unique contribution' },
  { key: 'q6BaselineModels', label: 'Q6', question: 'Baseline models & comparative standards' },
  { key: 'q7KeyResults', label: 'Q7', question: 'Key quantitative results & takeaways' },
  { key: 'q8LimitationsThreats', label: 'Q8', question: 'Limitations & threats to validity' },
  { key: 'q9FutureWork', label: 'Q9', question: 'Future research directions & ideas' },
]

export default function JournalClubPresentationPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(true)
  const [targetMinutes, setTargetMinutes] = useState(20)
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string>('all')

  // Live Seminar Notes State
  const [seminarNoteInput, setSeminarNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [liveNotes, setLiveNotes] = useState<{ id: string; content: string; createdAt: string; userName?: string }[]>([])

  const [isAccessDenied, setIsAccessDenied] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const paperId = params.id as string

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}`)
      if (res.ok) {
        const data = await res.json()
        setPaper(data)
        setIsAccessDenied(false)
        if (data.notes) {
          setLiveNotes(
            data.notes.map((n: any) => ({
              id: n.id,
              content: n.content,
              createdAt: n.createdAt,
              userName: n.user?.name || 'Researcher',
            }))
          )
        }
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}))
        setIsAccessDenied(true)
        setAccessDeniedMessage(
          errData.error || 'You do not have permission to access this private paper presentation.'
        )
      } else {
        addToast('error', 'Paper not found')
        router.push('/papers')
      }
    } catch {
      addToast('error', 'Failed to load paper details')
    } finally {
      setLoading(false)
    }
  }, [paperId, router, addToast])

  useEffect(() => {
    fetchPaper()
  }, [fetchPaper])

  // Timer counter
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Slide Deck Names
  const SLIDE_COUNT = 6
  const SLIDE_NAMES = [
    'Executive Overview',
    '3-Minute Digest',
    'Architecture & Specs',
    'Benchmark Scorecard',
    'Literature Survey (Q1-Q9)',
    'Live Discussion & Minutes',
  ]

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, SLIDE_COUNT - 1))
  }, [SLIDE_COUNT])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  // Keyboard shortcut navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prevSlide()
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        setTimerRunning((prev) => !prev)
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, isFullscreen])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Live Note Submission during Seminar
  const handleSaveLiveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seminarNoteInput.trim() || !paper) return
    setSavingNote(true)

    try {
      const res = await fetch(`/api/papers/${paper.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `[Journal Club Seminar Note]: ${seminarNoteInput.trim()}`,
          isPrivate: false, // Seminar discussion notes are public to the team
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setLiveNotes((prev) => [
          {
            id: created.id,
            content: created.content,
            createdAt: created.createdAt,
            userName: created.user?.name || 'You',
          },
          ...prev,
        ])
        setSeminarNoteInput('')
        addToast('success', 'Recorded seminar discussion note!')
      } else {
        addToast('error', 'Failed to save seminar note')
      }
    } catch {
      addToast('error', 'Network error saving note')
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-6 text-center">
          <Skeleton variant="rect" height="48px" width="50%" className="mx-auto" />
          <Skeleton variant="card" height="400px" />
        </div>
      </div>
    )
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
        <div className="max-w-xl w-full glass-card p-10 text-center space-y-5 border-rose-500/30">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-text-primary font-display">Access Denied</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {accessDeniedMessage || 'You do not have permission to access this private paper presentation.'}
            </p>
          </div>
          <div className="pt-2">
            <Link href="/papers">
              <Button variant="primary" size="sm" icon={<ArrowLeft size={14} />}>
                Back to Paper Library
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!paper) return null

  // Parse JSON data safely
  let benchmarks: BenchmarkScore[] = []
  if (paper.benchmarks) {
    try {
      benchmarks = typeof paper.benchmarks === 'string' ? JSON.parse(paper.benchmarks) : paper.benchmarks
    } catch {
      benchmarks = []
    }
  }

  let literatureReview: LiteratureReviewData = {}
  const rawLitSource =
    paper.assignments?.find((a) => a.literatureReview)?.literatureReview ||
    paper.literatureReview
  if (rawLitSource) {
    try {
      literatureReview =
        typeof rawLitSource === 'string' ? JSON.parse(rawLitSource) : rawLitSource
    } catch {
      literatureReview = {}
    }
  }

  const targetSeconds = targetMinutes * 60
  const isApproachingLimit = elapsedSeconds >= targetSeconds * 0.85
  const isOverTime = elapsedSeconds >= targetSeconds

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between selection:bg-accent/30 font-sans"
    >
      {/* ─── Top Presentation Navigation Bar ─── */}
      <header className="px-5 py-3.5 border-b border-border-default bg-bg-secondary/95 backdrop-blur-md flex items-center justify-between z-30 shadow-sm">
        {/* Left: Exit & Mode Badge */}
        <div className="flex items-center gap-3">
          <Link
            href={`/papers/${paper.slug || paper.id}`}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors bg-bg-tertiary px-2.5 py-1.5 rounded-lg border border-border-default font-medium"
            title="Exit Presentation"
          >
            <ArrowLeft size={14} /> Exit
          </Link>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-accent/15 text-accent border border-accent/30 flex items-center gap-1.5">
            <Sparkles size={13} /> Journal Club Seminar Mode
          </span>
        </div>

        {/* Center: Interactive Slide Tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-bg-tertiary p-1 rounded-xl border border-border-default">
          {SLIDE_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                currentSlide === idx
                  ? 'bg-accent text-bg-primary font-bold shadow-xs'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {idx + 1}. {name}
            </button>
          ))}
        </div>

        {/* Right: Pacing Timer & Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Pacing Preset Selector */}
          <select
            value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))}
            className="bg-bg-tertiary border border-border-default rounded-lg px-2 py-1 text-[11px] font-mono text-text-secondary cursor-pointer focus:outline-none"
            title="Seminar Target Duration"
          >
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
          </select>

          {/* Stopwatch Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              isOverTime
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : isApproachingLimit
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-bg-tertiary text-text-secondary border-border-default'
            }`}
          >
            <Clock size={13} className={isOverTime ? 'text-rose-400' : 'text-accent'} />
            <span>{formatTimer(elapsedSeconds)}</span>
            <span className="text-[10px] text-text-tertiary">/ {targetMinutes}m</span>

            <button
              onClick={() => setTimerRunning((prev) => !prev)}
              className="text-text-tertiary hover:text-text-primary ml-1 cursor-pointer"
              title={timerRunning ? 'Pause (T)' : 'Resume (T)'}
            >
              {timerRunning ? <Pause size={11} /> : <Play size={11} />}
            </button>

            <button
              onClick={() => setElapsedSeconds(0)}
              title="Reset Timer"
              className="text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-default transition-colors cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </header>

      {/* ─── Slide Content Canvas ─── */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto my-auto">
          {/* SLIDE 1: Executive Overview & Authorship */}
          {currentSlide === 0 && (
            <div className="glass-card p-8 md:p-12 space-y-8 animate-fade-in border-l-8 border-l-accent shadow-2xl rounded-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" size="md">
                    {paper.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="warning" size="md">
                    {paper.priority} PRIORITY
                  </Badge>
                  {paper.publicationYear && (
                    <Badge variant="outline" size="md">
                      <Calendar size={12} className="mr-1" /> {paper.publicationYear}
                    </Badge>
                  )}
                  {paper.journal && (
                    <span className="text-xs text-text-secondary font-medium px-2.5 py-1 rounded bg-bg-tertiary border border-border-default">
                      {paper.journal}
                    </span>
                  )}
                  {paper.replicationStatus && paper.replicationStatus !== 'UNTESTED' && (
                    <Badge
                      variant={REPLICATION_COLORS[paper.replicationStatus as keyof typeof REPLICATION_COLORS] as any}
                      size="md"
                    >
                      {REPLICATION_LABELS[paper.replicationStatus as keyof typeof REPLICATION_LABELS]}
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-text-primary font-display tracking-tight leading-tight">
                  {paper.title}
                </h1>

                <p className="text-sm md:text-base text-text-secondary font-medium pt-1">
                  {paper.authors}
                </p>
              </div>

              {/* Highlights Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-border-default">
                <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default/60">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider block font-semibold">
                    Citations
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-accent font-display mt-0.5 block">
                    {paper.citationCount ? paper.citationCount.toLocaleString() : 'Indexed'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default/60">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider block font-semibold">
                    Architecture
                  </span>
                  <span className="text-sm font-bold text-cyan-400 mt-1 block truncate">
                    {paper.architecture || 'Dense Network'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default/60">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider block font-semibold">
                    Parameters
                  </span>
                  <span className="text-sm font-bold text-text-primary mt-1 block font-mono">
                    {paper.parameters || 'Standard'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default/60">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider block font-semibold">
                    Collections
                  </span>
                  <span className="text-sm font-semibold text-text-primary mt-1 block truncate">
                    {paper.collections && paper.collections.length > 0
                      ? paper.collections.map((c) => c.name).join(', ')
                      : 'General Track'}
                  </span>
                </div>
              </div>

              {/* Direct Links */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-tertiary hover:bg-bg-elevated text-text-primary border border-border-default transition-colors"
                  >
                    <ExternalLink size={13} className="text-accent" /> Published URL
                  </a>
                )}
                {paper.doi && (
                  <span className="text-xs font-mono text-text-tertiary px-2.5 py-1 rounded bg-bg-tertiary border border-border-default">
                    DOI: {paper.doi}
                  </span>
                )}
                {paper.arxivId && (
                  <span className="text-xs font-mono text-text-tertiary px-2.5 py-1 rounded bg-bg-tertiary border border-border-default">
                    arXiv: {paper.arxivId}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 2: 3-Minute Research Digest */}
          {currentSlide === 1 && (
            <div className="glass-card p-8 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-amber-500 shadow-2xl rounded-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    3-Minute Research Digest
                  </h2>
                  <p className="text-xs text-text-secondary">Core Problem, Novel Mechanism, and Critical Boundaries</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* 1. Problem Solved */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/70 border border-rose-500/30 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                      <AlertTriangle size={15} /> Problem Addressed
                    </span>
                    <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                      {paper.problemSolved ||
                        paper.abstract?.slice(0, 260) ||
                        'Identifies fundamental efficiency, scaling, or representation bottlenecks in baseline paradigms.'}
                    </p>
                  </div>
                </div>

                {/* 2. Key Innovation */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/70 border border-emerald-500/30 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 size={15} /> Core Innovation
                    </span>
                    <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                      {paper.keyContribution ||
                        'Introduces a novel architectural mechanism with state-of-the-art empirical performance.'}
                    </p>
                  </div>
                </div>

                {/* 3. Limitations */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/70 border border-amber-500/30 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <AlertTriangle size={15} /> Limitations &amp; Boundaries
                    </span>
                    <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                      {paper.limitations ||
                        'Subject to training compute overhead and dataset domain distribution generalization shifts.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Technical Architecture & Specs */}
          {currentSlide === 2 && (
            <div className="glass-card p-8 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-cyan-500 shadow-2xl rounded-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
                  <Cpu size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    Architecture &amp; Compute Specification
                  </h2>
                  <p className="text-xs text-text-secondary">Model Parameters, Context Windows, and Hardware Budget</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                  <p className="text-xs text-text-tertiary font-semibold uppercase">Architecture Family</p>
                  <p className="text-base font-bold text-cyan-400 mt-1 font-display">
                    {paper.architecture || 'Dense Transformer'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                  <p className="text-xs text-text-tertiary font-semibold uppercase">Parameters</p>
                  <p className="text-base font-bold text-text-primary mt-1 font-mono">
                    {paper.parameters || 'Not specified'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                  <p className="text-xs text-text-tertiary font-semibold uppercase">Context Window</p>
                  <p className="text-base font-bold text-text-primary mt-1 font-mono">
                    {paper.contextWindow || 'Standard Context'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                  <p className="text-xs text-text-tertiary font-semibold uppercase">Compute Budget</p>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {paper.computeBudget || 'Pretraining scale'}
                  </p>
                </div>
              </div>

              {/* Code & Artifact Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {paper.codeUrl && (
                  <a
                    href={paper.codeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <GithubIcon size={20} className="text-accent" />
                      <div>
                        <p className="text-xs font-bold text-text-primary group-hover:text-accent">Open Source Repository</p>
                        <p className="text-[11px] text-text-tertiary truncate">{paper.codeUrl}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-text-tertiary group-hover:text-accent" />
                  </a>
                )}

                {paper.modelUrl && (
                  <a
                    href={paper.modelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <HuggingFaceIcon size={20} className="text-warning" />
                      <div>
                        <p className="text-xs font-bold text-text-primary group-hover:text-warning">Model Checkpoints</p>
                        <p className="text-[11px] text-text-tertiary truncate">{paper.modelUrl}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-text-tertiary group-hover:text-warning" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 4: Empirical Benchmark Scorecard */}
          {currentSlide === 3 && (
            <div className="glass-card p-8 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-yellow-500 shadow-2xl rounded-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-400 flex items-center justify-center font-bold">
                  <Trophy size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    Empirical Benchmark Results
                  </h2>
                  <p className="text-xs text-text-secondary">Quantitative Evaluation &amp; Baseline Standards</p>
                </div>
              </div>

              {benchmarks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {benchmarks.map((b, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-bg-tertiary border border-border-default space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-primary font-display">{b.name}</span>
                        {b.metric && <span className="text-[10px] text-text-tertiary font-mono bg-bg-elevated px-2 py-0.5 rounded">{b.metric}</span>}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-accent font-mono">{b.score}</span>
                      </div>

                      {b.baseline && (
                        <p className="text-xs text-text-tertiary border-t border-border-default/60 pt-2">
                          Baseline: <span className="text-text-secondary font-medium">{b.baseline}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-text-tertiary space-y-2">
                  <Trophy size={32} className="mx-auto opacity-30" />
                  <p className="text-sm">No benchmark scores explicitly recorded for this paper.</p>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 5: Literature Survey Framework (Q1–Q9 Explorer) */}
          {currentSlide === 4 && (
            <div className="glass-card p-8 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-purple-500 shadow-2xl rounded-2xl">
              <div className="flex items-center justify-between border-b border-border-default pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                      Structured Literature Survey (Q1–Q9)
                    </h2>
                    <p className="text-xs text-text-secondary">Systematic 9-Point Methodology &amp; Reviewer Discussion</p>
                  </div>
                </div>

                {/* Question Filter Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionKey('all')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedQuestionKey === 'all'
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    All Questions
                  </button>
                  {EVAL_QUESTIONS.map((q) => (
                    <button
                      key={q.key}
                      type="button"
                      onClick={() => setSelectedQuestionKey(q.key)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        selectedQuestionKey === q.key
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions Render Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[440px] overflow-y-auto pr-1">
                {EVAL_QUESTIONS.filter(
                  (q) => selectedQuestionKey === 'all' || selectedQuestionKey === q.key
                ).map((q) => {
                  const qa = literatureReview[q.key as keyof LiteratureReviewData] as QuestionAnswer | undefined
                  if (!qa?.detailedAnswer && selectedQuestionKey === 'all') return null

                  return (
                    <div
                      key={q.key}
                      className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">
                          {q.label}: {q.question}
                        </span>
                        {qa?.score !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            Score: {qa.score}/5
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        {qa?.detailedAnswer || 'No detailed analysis recorded for this question.'}
                      </p>

                      {qa?.comment && (
                        <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-xs text-text-primary space-y-0.5">
                          <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                            💬 Reviewer Note / Critique:
                          </span>
                          <p className="italic text-text-secondary text-[11px]">{qa.comment}</p>
                        </div>
                      )}
                    </div>
                  )
                })}

                {literatureReview.outcome && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wide">
                      Overall Synthesis &amp; Outcome
                    </span>
                    <p className="text-xs text-text-primary font-medium leading-relaxed">
                      {literatureReview.outcome}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 6: Live Audience Discussion & Seminar Minutes */}
          {currentSlide === 5 && (
            <div className="glass-card p-8 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-emerald-500 shadow-2xl rounded-2xl">
              <div className="flex items-center justify-between border-b border-border-default pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                      Live Seminar Discussion &amp; Minutes
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Collaborative takeaways, open critique questions, and group action items
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Note Taker Form */}
              <form onSubmit={handleSaveLiveNote} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Record live seminar critique, faculty advice, or research action items..."
                    value={seminarNoteInput}
                    onChange={(e) => setSeminarNoteInput(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                  />
                  <div className="absolute right-2.5 bottom-2.5">
                    <Button
                      type="submit"
                      size="xs"
                      variant="primary"
                      loading={savingNote}
                      icon={<Send size={12} />}
                    >
                      Save to Paper Notes
                    </Button>
                  </div>
                </div>
              </form>

              {/* Recorded Seminar Notes List */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {liveNotes.length > 0 ? (
                  liveNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                        <span className="font-semibold text-text-primary">{note.userName}</span>
                        <span className="font-mono">
                          {new Date(note.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-text-tertiary text-xs">
                    No seminar minutes recorded yet. Type above to save group takeaways.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Bottom Slide Control Bar ─── */}
      <footer className="px-6 py-3.5 border-t border-border-default bg-bg-secondary/95 backdrop-blur-md flex items-center justify-between z-30 shadow-sm">
        <Button
          variant="secondary"
          size="sm"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          icon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>

        {/* Slide Indicator Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === i ? 'w-8 bg-accent' : 'w-2 bg-bg-tertiary hover:bg-text-tertiary'
              }`}
              title={`Jump to slide ${i + 1}: ${SLIDE_NAMES[i]}`}
            />
          ))}
          <span className="text-xs text-text-tertiary ml-2 font-mono">
            {currentSlide + 1} / {SLIDE_COUNT}
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={nextSlide}
          disabled={currentSlide === SLIDE_COUNT - 1}
        >
          Next <ChevronRight size={16} className="ml-1" />
        </Button>
      </footer>
    </div>
  )
}

