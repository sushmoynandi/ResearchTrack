'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Milestone,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  GraduationCap,
  Plus,
  Compass,
  Trophy,
  Star,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface TrackPaper {
  id: string
  title: string
  authors: string
  year: number
  keyTopic: string
  status?: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED'
}

interface ReadingTrack {
  id: string
  title: string
  description: string
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced'
  category: string
  estimatedWeeks: number
  papers: TrackPaper[]
  color: string
}

const DEFAULT_TRACKS: ReadingTrack[] = [
  {
    id: 'track-llm-foundations',
    title: 'Foundations of Large Language Models & Self-Attention',
    description:
      'Master the core lineage from the original Transformer architecture through scaling laws and reinforcement learning from human feedback (RLHF).',
    difficulty: 'Foundational',
    category: 'Natural Language Processing',
    estimatedWeeks: 3,
    color: '#06b6d4',
    papers: [
      {
        id: '1',
        title: 'Attention Is All You Need',
        authors: 'Ashish Vaswani et al. (NeurIPS 2017)',
        year: 2017,
        keyTopic: 'Multi-Head Self-Attention & Scaled Dot-Product Mechanics',
        status: 'COMPLETED',
      },
      {
        id: '2',
        title: 'Language Models are Few-Shot Learners (GPT-3)',
        authors: 'Tom Brown et al. (NeurIPS 2020)',
        year: 2020,
        keyTopic: 'In-Context Learning & Emergent Capability Scaling',
        status: 'IN_PROGRESS',
      },
      {
        id: '3',
        title: 'Training language models to follow instructions with human feedback (InstructGPT)',
        authors: 'Long Ouyang et al. (NeurIPS 2022)',
        year: 2022,
        keyTopic: 'PPO Alignment & Reward Model Training',
        status: 'LOCKED',
      },
      {
        id: '4',
        title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
        authors: 'Rafael Rafailov et al. (NeurIPS 2023)',
        year: 2023,
        keyTopic: 'Closed-Form Implicit Reward Formulation',
        status: 'LOCKED',
      },
    ],
  },
  {
    id: 'track-diffusion-models',
    title: 'Generative Diffusion & Continuous Normalizing Flows',
    description:
      'From denoising score matching to latent diffusion and modern flow matching for multimodal generation.',
    difficulty: 'Intermediate',
    category: 'Computer Vision & Generative AI',
    estimatedWeeks: 4,
    color: '#a855f7',
    papers: [
      {
        id: '5',
        title: 'Denoising Diffusion Probabilistic Models (DDPM)',
        authors: 'Jonathan Ho, Ajay Jain, Pieter Abbeel (NeurIPS 2020)',
        year: 2020,
        keyTopic: 'Forward Noising & Reverse Denoising Variational Bounds',
        status: 'IN_PROGRESS',
      },
      {
        id: '6',
        title: 'Score-Based Generative Modeling through Stochastic Differential Equations',
        authors: 'Yang Song et al. (ICLR 2021)',
        year: 2021,
        keyTopic: 'Continuous-Time SDE & Probability Flow ODE Formulation',
        status: 'LOCKED',
      },
      {
        id: '7',
        title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
        authors: 'Robin Rombach et al. (CVPR 2022)',
        year: 2022,
        keyTopic: 'Autoencoder Latent Space Conditioning & Cross-Attention',
        status: 'LOCKED',
      },
      {
        id: '8',
        title: 'Flow Matching for Generative Modeling',
        authors: 'Yaron Lipman et al. (ICLR 2023)',
        year: 2023,
        keyTopic: 'Continuous Normalizing Flows & Optimal Transport Vector Fields',
        status: 'LOCKED',
      },
    ],
  },
  {
    id: 'track-efficient-compute',
    title: 'Efficient Inference, Sub-Quadratic Attention & MoE',
    description:
      'Explore algorithmic compute breakthroughs: FlashAttention, Selective State Spaces (Mamba), and Mixture-of-Experts routing.',
    difficulty: 'Advanced',
    category: 'Systems & Architecture',
    estimatedWeeks: 3,
    color: '#10b981',
    papers: [
      {
        id: '9',
        title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
        authors: 'Tri Dao et al. (NeurIPS 2022)',
        year: 2022,
        keyTopic: 'GPU SRAM Tiling & Softmax Online Recomputation',
        status: 'COMPLETED',
      },
      {
        id: '10',
        title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
        authors: 'Albert Gu, Tri Dao (2023)',
        year: 2023,
        keyTopic: 'Hardware-Aware Selective State Space Recurrence',
        status: 'LOCKED',
      },
      {
        id: '11',
        title: 'Mixtral of Experts',
        authors: 'Albert Q. Jiang et al. (2024)',
        year: 2024,
        keyTopic: 'Sparse Top-2 Gating Routing & Feedforward MoE Scaling',
        status: 'LOCKED',
      },
    ],
  },
]

export default function ReadingTracksPage() {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [tracks, setTracks] = useState<ReadingTrack[]>(DEFAULT_TRACKS)
  const [selectedTrackId, setSelectedTrackId] = useState<string>(DEFAULT_TRACKS[0].id)

  const activeTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0]

  const completedCount = activeTrack.papers.filter((p) => p.status === 'COMPLETED').length
  const progressPercent = Math.round((completedCount / activeTrack.papers.length) * 100)

  const handleToggleStatus = (trackId: string, paperId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t
        const updatedPapers = t.papers.map((p) => {
          if (p.id !== paperId) return p
          const nextStatus =
            p.status === 'COMPLETED'
              ? 'IN_PROGRESS'
              : p.status === 'IN_PROGRESS'
              ? 'COMPLETED'
              : 'IN_PROGRESS'
          return { ...p, status: nextStatus as any }
        })
        return { ...t, papers: updatedPapers }
      })
    )
    addToast('success', 'Milestone progress updated!')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card border-border-default/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
              <Milestone size={13} /> Curated Learning Roadmaps
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight">
            Curated Research Reading Tracks
          </h2>
          <p className="text-xs text-text-secondary">
            Master seminal literature through structured sequential milestones designed by lab faculty.
          </p>
        </div>

        {(isSupervisor || isAdmin) && (
          <Link href="/assignments">
            <Button icon={<Users size={15} />}>
              Assign Track to Student
            </Button>
          </Link>
        )}
      </div>

      {/* Main Track Selection & Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Track Directory */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Layers size={14} className="text-accent" /> Available Tracks ({tracks.length})
          </h3>

          {tracks.map((t) => {
            const isSelected = t.id === selectedTrackId
            const done = t.papers.filter((p) => p.status === 'COMPLETED').length
            const pct = Math.round((done / t.papers.length) * 100)

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTrackId(t.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-bg-secondary border-accent shadow-md'
                    : 'bg-bg-secondary/60 border-border-default hover:border-border-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                    {t.difficulty}
                  </span>
                  <span className="text-[11px] font-mono text-accent font-semibold">
                    {pct}% Complete
                  </span>
                </div>

                <h4 className="text-sm font-bold text-text-primary font-display">
                  {t.title}
                </h4>

                <div className="w-full bg-bg-tertiary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
                  <span>{t.papers.length} landmark papers</span>
                  <span>~{t.estimatedWeeks} weeks</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right 2 Cols: Selected Track Timeline & Milestone Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 md:p-8 space-y-6 border-l-4" style={{ borderLeftColor: activeTrack.color }}>
            {/* Track Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent">
                  {activeTrack.category}
                </span>
                <span className="text-xs text-text-tertiary flex items-center gap-1 font-medium">
                  <Clock size={13} className="text-accent" /> Estimated Completion: {activeTrack.estimatedWeeks} Weeks
                </span>
              </div>

              <h3 className="text-2xl font-bold text-text-primary font-display">
                {activeTrack.title}
              </h3>

              <p className="text-sm text-text-secondary leading-relaxed">
                {activeTrack.description}
              </p>
            </div>

            {/* Progress summary banner */}
            <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/60 flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Track Progress</span>
                  <span className="font-bold text-accent">{completedCount} of {activeTrack.papers.length} Papers Completed</span>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {progressPercent === 100 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success border border-success/30 text-xs font-bold shrink-0">
                  <Trophy size={15} /> Track Mastered!
                </div>
              )}
            </div>

            {/* Sequential Paper Milestones */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Milestone size={15} className="text-accent" /> Milestone Roadmap Checklist
              </h4>

              <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-border-default">
                {activeTrack.papers.map((p, idx) => {
                  const isDone = p.status === 'COMPLETED'
                  const isInProgress = p.status === 'IN_PROGRESS'

                  return (
                    <div
                      key={p.id}
                      className={`relative pl-12 p-4 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-bg-secondary/90 border-success/40'
                          : isInProgress
                          ? 'bg-bg-secondary border-accent shadow-sm'
                          : 'bg-bg-secondary/40 border-border-default/50 opacity-80'
                      }`}
                    >
                      {/* Step Marker */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(activeTrack.id, p.id)}
                        className={`absolute left-3 top-4 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all z-10 ${
                          isDone
                            ? 'bg-success text-white'
                            : isInProgress
                            ? 'bg-accent text-bg-primary'
                            : 'bg-bg-tertiary text-text-tertiary border border-border-default'
                        }`}
                        title="Click to toggle completion"
                      >
                        {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                      </button>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-accent uppercase tracking-wide">
                            Step {idx + 1} Milestone
                          </span>
                          <Badge
                            variant={isDone ? 'success' : isInProgress ? 'warning' : 'default'}
                            size="sm"
                          >
                            {p.status || 'QUEUED'}
                          </Badge>
                        </div>

                        <h5 className="text-sm font-bold text-text-primary font-display">
                          {p.title}
                        </h5>

                        <p className="text-xs text-text-secondary">{p.authors}</p>

                        <div className="p-2.5 rounded-lg bg-bg-tertiary/60 border border-border-default/40 text-xs text-text-tertiary mt-2">
                          <strong className="text-text-secondary font-medium">Core Synthesis Focus:</strong> {p.keyTopic}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(activeTrack.id, p.id)}
                            className="text-xs text-text-tertiary hover:text-accent font-medium cursor-pointer"
                          >
                            {isDone ? '↩ Mark as In Progress' : '✓ Mark as Completed'}
                          </button>

                          <Link
                            href={`/papers/new?title=${encodeURIComponent(p.title)}`}
                            className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                          >
                            Import to Library <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
