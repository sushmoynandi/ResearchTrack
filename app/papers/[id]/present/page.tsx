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
} from '@/lib/types'

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

  const containerRef = useRef<HTMLDivElement>(null)
  const paperId = params.id as string

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}`)
      if (res.ok) {
        const data = await res.json()
        setPaper(data)
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

  // Define total slides dynamically
  const SLIDE_COUNT = 6
  const SLIDE_NAMES = [
    'Overview',
    '3-Min Digest',
    'Architecture',
    'Benchmarks',
    'Survey Matrix',
    'Notes & Discussion',
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
  if (paper.literatureReview) {
    try {
      literatureReview = typeof paper.literatureReview === 'string' ? JSON.parse(paper.literatureReview) : paper.literatureReview
    } catch {
      literatureReview = {}
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between selection:bg-accent/30"
    >
      {/* ─── Top Presentation Navigation Bar ─── */}
      <header className="px-6 py-4 border-b border-border-default bg-bg-secondary/90 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <Link
            href={`/papers/${paper.id}`}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors bg-bg-tertiary px-2.5 py-1.5 rounded-lg border border-border-default font-medium"
          >
            <ArrowLeft size={14} /> Exit Presentation
          </Link>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <Sparkles size={13} /> Journal Club Mode
          </span>
        </div>

        {/* Slide Tracker */}
        <div className="flex items-center gap-2">
          {SLIDE_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`text-xs px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                currentSlide === idx
                  ? 'bg-accent text-bg-primary font-bold shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {idx + 1}. {name}
            </button>
          ))}
        </div>

        {/* Controls & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-bg-tertiary px-3 py-1.5 rounded-lg border border-border-default text-xs font-mono text-text-secondary">
            <Clock size={13} className="text-accent" />
            <span>{formatTimer(elapsedSeconds)}</span>
            <button
              onClick={() => setElapsedSeconds(0)}
              title="Reset Timer"
              className="text-text-tertiary hover:text-text-primary ml-1 cursor-pointer"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-default transition-colors cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </header>

      {/* ─── Slide Content Canvas ─── */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto">
          {/* SLIDE 1: Title & Academic Identity */}
          {currentSlide === 0 && (
            <div className="glass-card p-10 md:p-14 space-y-8 animate-fade-in border-l-8 border-l-accent shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 flex-wrap">
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
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-text-primary font-display tracking-tight leading-tight">
                  {paper.title}
                </h1>

                <p className="text-base md:text-lg text-text-secondary font-medium pt-1">
                  {paper.authors}
                </p>
              </div>

              {/* Highlights & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-default">
                <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/60">
                  <span className="text-xs text-text-tertiary uppercase tracking-wider block font-semibold">
                    Citations Count
                  </span>
                  <span className="text-2xl font-bold text-accent font-display">
                    {paper.citationCount ? paper.citationCount.toLocaleString() : 'Not indexed'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/60">
                  <span className="text-xs text-text-tertiary uppercase tracking-wider block font-semibold">
                    Replication Status
                  </span>
                  <span className="text-sm font-bold text-text-primary mt-1 block">
                    {paper.replicationStatus || 'UNTESTED'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/60">
                  <span className="text-xs text-text-tertiary uppercase tracking-wider block font-semibold">
                    Associated Collections
                  </span>
                  <span className="text-sm font-semibold text-text-primary mt-1 block truncate">
                    {paper.collections && paper.collections.length > 0
                      ? paper.collections.map((c) => c.name).join(', ')
                      : 'General Reading'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: 3-Minute Research Digest */}
          {currentSlide === 1 && (
            <div className="glass-card p-10 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-amber-500 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    3-Minute Research Digest
                  </h2>
                  <p className="text-xs text-text-secondary">Core Problem, Novel Mechanism, and Boundaries</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* 1. Problem Solved */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/60 border border-border-default flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-400">
                      <AlertTriangle size={14} /> Problem Addressed
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {paper.problemSolved ||
                        paper.abstract?.slice(0, 220) ||
                        'Identifies fundamental efficiency or scaling bottlenecks in preceding baseline paradigms.'}
                    </p>
                  </div>
                </div>

                {/* 2. Key Innovation */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/60 border border-border-default flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 size={14} /> Core Innovation
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {paper.keyContribution ||
                        'Introduces a novel architectural mechanism with rigorous empirical validation.'}
                    </p>
                  </div>
                </div>

                {/* 3. Limitations */}
                <div className="p-5 rounded-2xl bg-bg-tertiary/60 border border-border-default flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <AlertTriangle size={14} /> Limitations &amp; Compute
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {paper.limitations ||
                        'Subject to training compute overhead and dataset domain distribution shifts.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Architecture & Compute Specs */}
          {currentSlide === 2 && (
            <div className="glass-card p-10 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-cyan-500 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
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

          {/* SLIDE 4: Benchmark Performance Matrix */}
          {currentSlide === 3 && (
            <div className="glass-card p-10 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-yellow-500 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold">
                  <Trophy size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    Empirical Benchmark Results
                  </h2>
                  <p className="text-xs text-text-secondary">Quantitative Evaluation &amp; Baseline Comparison</p>
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

          {/* SLIDE 5: Literature Review Survey (Q1–Q9) */}
          {currentSlide === 4 && (
            <div className="glass-card p-10 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-purple-500 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    Structured Literature Survey Framework
                  </h2>
                  <p className="text-xs text-text-secondary">Key Synthesis Questions (Q1–Q9 Methodology)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[440px] overflow-y-auto pr-1">
                {literatureReview.q1ProblemImportance?.detailedAnswer && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Q1: Problem &amp; Importance</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{literatureReview.q1ProblemImportance.detailedAnswer}</p>
                  </div>
                )}

                {literatureReview.q2DataDetails?.detailedAnswer && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Q2: Dataset Curation</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{literatureReview.q2DataDetails.detailedAnswer}</p>
                  </div>
                )}

                {literatureReview.q4MethodsPipeline?.detailedAnswer && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Q4: Methodological Pipeline</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{literatureReview.q4MethodsPipeline.detailedAnswer}</p>
                  </div>
                )}

                {literatureReview.q7KeyResults?.detailedAnswer && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Q7: Key Quantitative Results</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{literatureReview.q7KeyResults.detailedAnswer}</p>
                  </div>
                )}

                {literatureReview.outcome && (
                  <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wide">Overall Takeaway &amp; Outcome</span>
                    <p className="text-xs text-text-primary font-medium leading-relaxed">{literatureReview.outcome}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 6: Research Notes & Feedback */}
          {currentSlide === 5 && (
            <div className="glass-card p-10 md:p-12 space-y-6 animate-fade-in border-l-8 border-l-emerald-500 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-display">
                    Discussion, Notes &amp; Supervisor Feedback
                  </h2>
                  <p className="text-xs text-text-secondary">Synthesis Takeaways and Open Questions for the Lab</p>
                </div>
              </div>

              <div className="space-y-4">
                {paper.notes && paper.notes.length > 0 ? (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {paper.notes.map((note) => (
                      <div key={note.id} className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1.5">
                        <span className="text-[10px] text-text-tertiary">{new Date(note.createdAt).toLocaleDateString()}</span>
                        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-text-tertiary">
                    <p className="text-sm">No notes recorded yet. Open discussion session active.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Bottom Slide Control Bar ─── */}
      <footer className="px-6 py-4 border-t border-border-default bg-bg-secondary/90 backdrop-blur-md flex items-center justify-between z-30">
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
              title={`Jump to slide ${i + 1}`}
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
