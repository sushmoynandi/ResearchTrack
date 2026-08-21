'use client'

import React, { useState, useEffect } from 'react'
import {
  GraduationCap,
  Star,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface RubricData {
  id: string
  paperId: string
  problemScore: number
  methodologyScore: number
  empiricalScore: number
  synthesisScore: number
  verdict: 'APPROVED' | 'MINOR_REVISION' | 'MAJOR_REVISION'
  feedbackSummary: string | null
  createdAt: string
  supervisor: { id: string; name: string }
  student: { id: string; name: string }
}

interface FacultyRubricCardProps {
  paperId: string
  paperTitle: string
  selectedStudentId?: string
  selectedStudentName?: string
}

export function FacultyRubricCard({
  paperId,
  paperTitle,
  selectedStudentId,
  selectedStudentName,
}: FacultyRubricCardProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [rubric, setRubric] = useState<RubricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Edit form state
  const [problemScore, setProblemScore] = useState(4)
  const [methodologyScore, setMethodologyScore] = useState(4)
  const [empiricalScore, setEmpiricalScore] = useState(4)
  const [synthesisScore, setSynthesisScore] = useState(4)
  const [verdict, setVerdict] = useState<'APPROVED' | 'MINOR_REVISION' | 'MAJOR_REVISION'>('APPROVED')
  const [feedbackSummary, setFeedbackSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRubric = async () => {
    try {
      const url = `/api/papers/${paperId}/rubric${
        selectedStudentId ? `?studentId=${selectedStudentId}` : ''
      }`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRubric(data)
        if (data) {
          setProblemScore(data.problemScore)
          setMethodologyScore(data.methodologyScore)
          setEmpiricalScore(data.empiricalScore)
          setSynthesisScore(data.synthesisScore)
          setVerdict(data.verdict)
          setFeedbackSummary(data.feedbackSummary || '')
        } else {
          setRubric(null)
          setProblemScore(4)
          setMethodologyScore(4)
          setEmpiricalScore(4)
          setSynthesisScore(4)
          setVerdict('APPROVED')
          setFeedbackSummary('')
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRubric()
  }, [paperId, selectedStudentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/rubric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemScore,
          methodologyScore,
          empiricalScore,
          synthesisScore,
          verdict,
          feedbackSummary,
          studentId: selectedStudentId,
        }),
      })

      if (res.ok) {
        const saved = await res.json()
        setRubric(saved)
        setIsEditing(false)
        addToast('success', `Faculty review scorecard saved for ${selectedStudentName || 'student'}!`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to submit evaluation')
      }
    } catch {
      addToast('error', 'Network error submitting rubric')
    } finally {
      setSubmitting(false)
    }
  }

  const averageScore = rubric
    ? ((rubric.problemScore + rubric.methodologyScore + rubric.empiricalScore + rubric.synthesisScore) / 4).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse text-xs text-text-tertiary">
        Loading faculty evaluation scorecard...
      </div>
    )
  }

  return (
    <div className="glass-card p-6 md:p-7 space-y-6 border-purple-500/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
              Faculty Literature Evaluation &amp; Review Scorecard
              {selectedStudentName && isSupervisor && (
                <span className="text-xs font-normal text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  for {selectedStudentName}
                </span>
              )}
            </h3>
            <p className="text-xs text-text-secondary">
              Standardized academic rubric for thesis defense readiness and literature survey grading.
            </p>
          </div>
        </div>

        {(isSupervisor || isAdmin) && (
          <Button
            size="xs"
            variant={isEditing ? 'secondary' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
            icon={<Sparkles size={13} />}
          >
            {isEditing ? 'Cancel Grading' : rubric ? 'Update Evaluation' : 'Grade Literature Review'}
          </Button>
        )}
      </div>

      {/* Editing Form (Supervisor Mode) */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-scale-in">
          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-bg-tertiary/40 border border-border-default">
            {[
              { label: '1. Problem Formulation & Context', val: problemScore, set: setProblemScore, desc: 'Clarity on research bottleneck & theoretical gap' },
              { label: '2. Methodology & Algorithmic Rigor', val: methodologyScore, set: setMethodologyScore, desc: 'Depth of mechanism & architecture analysis' },
              { label: '3. Empirical & Ablation Validation', val: empiricalScore, set: setEmpiricalScore, desc: 'Comprehension of benchmarks & metric trade-offs' },
              { label: '4. Survey Synthesis (Q1–Q9 Matrix)', val: synthesisScore, set: setSynthesisScore, desc: 'Quality of answers and critical takeaways' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                  <span>{item.label}</span>
                  <span className="font-mono text-purple-400 font-bold">{item.val} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={item.val}
                  onChange={(e) => item.set(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[10px] text-text-tertiary">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Verdict Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Formal Faculty Verdict
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'APPROVED', label: '✓ Approved (Defense Ready)', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
                { id: 'MINOR_REVISION', label: '⚡ Minor Revisions Needed', color: 'border-amber-500 bg-amber-500/10 text-amber-300' },
                { id: 'MAJOR_REVISION', label: '⚠️ Major Revisions Needed', color: 'border-rose-500 bg-rose-500/10 text-rose-300' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVerdict(v.id as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    verdict === v.id ? `${v.color} shadow-sm ring-1 ring-purple-500` : 'border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Summary */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Faculty Endorsement &amp; Written Feedback
            </label>
            <textarea
              placeholder="e.g. Excellent synthesis on the ablation study. Ensure the Q8 limitation notes mention memory bandwidth constraints on longer sequences..."
              value={feedbackSummary}
              onChange={(e) => setFeedbackSummary(e.target.value)}
              rows={4}
              className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting} icon={<Send size={13} />}>
              Submit Formal Evaluation
            </Button>
          </div>
        </form>
      ) : rubric ? (
        /* Rendered Scorecard View */
        <div className="space-y-6">
          {/* Top Score Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-bg-tertiary/60 border border-border-default">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Overall Score
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    rubric.verdict === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : rubric.verdict === 'MINOR_REVISION'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {rubric.verdict.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display text-text-primary">
                  {averageScore}
                </span>
                <span className="text-xs text-text-tertiary font-mono">/ 5.0</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Evaluated by <strong>{rubric.supervisor.name}</strong> on{' '}
                {new Date(rubric.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center sm:justify-end">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col items-center justify-center text-purple-400">
                <Award size={24} />
                <span className="text-[10px] font-bold uppercase mt-0.5">Verified</span>
              </div>
            </div>
          </div>

          {/* 4 Dimension Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Problem Formulation', val: rubric.problemScore },
              { label: 'Methodology Rigor', val: rubric.methodologyScore },
              { label: 'Empirical Validation', val: rubric.empiricalScore },
              { label: 'Survey Synthesis (Q1–Q9)', val: rubric.synthesisScore },
            ].map((d, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1.5">
                <div className="flex items-center justify-between text-text-secondary">
                  <span>{d.label}</span>
                  <strong className="text-text-primary font-mono">{d.val} / 5</strong>
                </div>
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(d.val / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Written Feedback Quote */}
          {rubric.feedbackSummary && (
            <div className="p-4 rounded-2xl bg-bg-secondary border-l-4 border-l-purple-500 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Faculty Reviewer Remarks</span>
              <p className="text-text-primary leading-relaxed italic">
                &ldquo;{rubric.feedbackSummary}&rdquo;
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 text-center text-xs text-text-tertiary bg-bg-secondary/40 rounded-2xl border border-dashed border-border-default space-y-2">
          <GraduationCap size={28} className="mx-auto opacity-30 text-purple-400" />
          <p>No faculty evaluation scorecard posted yet for this literature review.</p>
          {(isSupervisor || isAdmin) && (
            <Button size="xs" variant="primary" onClick={() => setIsEditing(true)}>
              Grade This Paper
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
