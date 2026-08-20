'use client'

import React, { useState } from 'react'
import {
  FileCheck,
  User,
  ExternalLink,
  AlertCircle,
  Database,
  GitBranch,
  MessageSquare,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Layers,
  BarChart3,
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  Edit3,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type {
  LiteratureReviewData,
  QuestionAnswer,
  CustomQuestion,
} from '@/lib/types'

export const PDF_ACCESSIBILITY_OPTIONS = [
  { value: 'Open Access', label: '🟢 Open Access (Freely Available)' },
  { value: 'Pre-print Available', label: '🟡 Pre-print Available (arXiv / bioRxiv)' },
  { value: 'Paywalled', label: '🔴 Paywalled / Restricted' },
  { value: 'Institutional Access', label: '🔵 Institutional Access Required' },
  { value: 'Restricted', label: '⚪ Restricted / Confidential' },
  { value: 'Unverified', label: '⚫ Unverified' },
]

export const QUESTION_CONFIG = [
  {
    key: 'q1ProblemImportance',
    num: 'Q1',
    title: 'What problem do the authors address and why is it important?',
    placeholderDetailed: 'Describe the core motivation, scientific or industrial significance, and the primary bottleneck...',
    placeholderSummary: 'Short summary: Key problem and why it matters...',
    placeholderComment: 'Add reviewer comment, discussion note, or critique for Q1...',
    icon: HelpCircle,
    color: 'text-amber-400',
  },
  {
    key: 'q2DataDetails',
    num: 'Q2',
    title: 'What data is used (source, size, timeframe, splits, collection process, ethics or consent)?',
    placeholderDetailed: 'Detail the dataset provenance, training/validation/test splits, token counts, curation process, consent...',
    placeholderSummary: 'Short summary: Primary dataset name, size, and source...',
    placeholderComment: 'Add reviewer comment on data quality, curation, or biases...',
    icon: Database,
    color: 'text-sky-400',
  },
  {
    key: 'q3FeaturesInputs',
    num: 'Q3',
    title: 'What features or inputs are used, and how were they selected or engineered?',
    placeholderDetailed: 'Specify token representations, embeddings, modalities (text, vision, audio), pre-processing filters, prompt templates...',
    placeholderSummary: 'Short summary: Key feature representations and input modalities...',
    placeholderComment: 'Add reviewer comment on feature selection or engineering...',
    icon: Layers,
    color: 'text-indigo-400',
  },
  {
    key: 'q4MethodsPipeline',
    num: 'Q4',
    title: 'What methods or models are applied, and what is the overall pipeline?',
    placeholderDetailed: 'Explain the core algorithmic mechanism, model architecture, loss formulation, optimization hyperparameters, inference steps...',
    placeholderSummary: 'Short summary: Model family and end-to-end processing pipeline...',
    placeholderComment: 'Add reviewer comment on methodology novelty or sound engineering...',
    icon: Cpu,
    color: 'text-emerald-400',
  },
  {
    key: 'q5Baselines',
    num: 'Q5',
    title: 'What baselines are used for comparison, and why were they chosen?',
    placeholderDetailed: 'List standard state-of-the-art baselines compared against and the rationale for their selection...',
    placeholderSummary: 'Short summary: Prior SOTA methods and baseline models compared...',
    placeholderComment: 'Add reviewer comment on fairness or strength of chosen baselines...',
    icon: BarChart3,
    color: 'text-cyan-400',
  },
  {
    key: 'q6Evaluation',
    num: 'Q6',
    title: 'How is performance evaluated (metrics, experimental setup, statistical tests, user studies if applicable)?',
    placeholderDetailed: 'Describe benchmarks, evaluation metrics (accuracy, BLEU, perplexity, latency, win rates), statistical significance tests...',
    placeholderSummary: 'Short summary: Primary evaluation metrics and benchmark setups...',
    placeholderComment: 'Add reviewer comment on evaluation rigor or missing metrics...',
    icon: ShieldCheck,
    color: 'text-blue-400',
  },
  {
    key: 'q7KeyResults',
    num: 'Q7',
    title: 'What are the key results with numbers, and how do they compare to baselines or prior work?',
    placeholderDetailed: 'State numerical findings, percentage improvements over baselines, ablation study takeaways...',
    placeholderSummary: 'Short summary: Quantitative gains and headline metric scores...',
    placeholderComment: 'Add reviewer comment on significance of results or ablation insights...',
    icon: Sparkles,
    color: 'text-teal-400',
  },
  {
    key: 'q8LimitationsBiases',
    num: 'Q8',
    title: 'What are the limitations and potential biases?',
    placeholderDetailed: 'Discuss computational cost, memory footprint, data bias, failure modes, safety considerations, out-of-domain degradation...',
    placeholderSummary: 'Short summary: Key weaknesses and unaddressed failure modes...',
    placeholderComment: 'Add reviewer comment on unmentioned limitations or safety concerns...',
    icon: AlertCircle,
    color: 'text-rose-400',
  },
  {
    key: 'q9ArtifactsReplication',
    num: 'Q9',
    title: 'Is code, data, or other artifacts available to enable replication?',
    placeholderDetailed: 'Document links to open-source GitHub repositories, Hugging Face model weights, training scripts, checkpoints...',
    placeholderSummary: 'Short summary: Availability of code, weights, and replication assets...',
    placeholderComment: 'Add reviewer comment on reproducibility or code cleanliness...',
    icon: GitBranch,
    color: 'text-purple-400',
  },
] as const

interface LiteratureReviewEditorProps {
  data: LiteratureReviewData
  onChange: (updated: LiteratureReviewData) => void
}

export function LiteratureReviewEditor({
  data,
  onChange,
}: LiteratureReviewEditorProps) {
  // All questions open by default so reviewers see everything that is required
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({
    q1ProblemImportance: true,
    q2DataDetails: true,
    q3FeaturesInputs: true,
    q4MethodsPipeline: true,
    q5Baselines: true,
    q6Evaluation: true,
    q7KeyResults: true,
    q8LimitationsBiases: true,
    q9ArtifactsReplication: true,
  })

  const toggleSection = (key: string) => {
    setOpenAccordion((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const expandAllSections = (expand: boolean) => {
    const updated: Record<string, boolean> = {}
    QUESTION_CONFIG.forEach((q) => {
      updated[q.key] = expand
    })
    if (data.customQuestions) {
      data.customQuestions.forEach((cq) => {
        if (cq.id) {
          updated[cq.id] = expand
        }
      })
    }
    setOpenAccordion(updated)
  }

  const updateField = <K extends keyof LiteratureReviewData>(
    field: K,
    value: LiteratureReviewData[K]
  ) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const updateQuestion = (
    key: keyof LiteratureReviewData,
    field: 'detailedAnswer' | 'shortSummary' | 'comment',
    val: string
  ) => {
    const current = (data[key] as QuestionAnswer) || {
      detailedAnswer: '',
      shortSummary: '',
      comment: '',
    }
    onChange({
      ...data,
      [key]: {
        ...current,
        [field]: val,
      },
    })
  }

  // Custom Question Handlers
  const addCustomQuestion = () => {
    const customList = data.customQuestions || []
    const nextNum = customList.length + 10
    const newQuestion: CustomQuestion = {
      id: `custom-q-${Date.now()}`,
      num: `Q${nextNum}`,
      title: '',
      detailedAnswer: '',
      shortSummary: '',
      comment: '',
    }
    const updated = [...customList, newQuestion]
    updateField('customQuestions', updated)
    if (newQuestion.id) {
      setOpenAccordion((prev) => ({ ...prev, [newQuestion.id as string]: true }))
    }
  }

  const updateCustomQuestion = (
    id: string,
    field: keyof CustomQuestion,
    val: string
  ) => {
    const customList = data.customQuestions || []
    const updated = customList.map((q) =>
      q.id === id ? { ...q, [field]: val } : q
    )
    updateField('customQuestions', updated)
  }

  const removeCustomQuestion = (id: string) => {
    const customList = data.customQuestions || []
    const updated = customList.filter((q) => q.id !== id)
    updateField('customQuestions', updated)
  }

  const customQuestions = data.customQuestions || []

  // Mandatory Completion Progress Calculation
  const totalMandatoryFields = 8 + 9 + (data.outcome ? 1 : 1) + customQuestions.length
  let filledMandatoryCount = 0

  if (data.sl) filledMandatoryCount++
  if (data.assignedPerson) filledMandatoryCount++
  if (data.selectedPaperTitle) filledMandatoryCount++
  if (data.pdfAccessibility) filledMandatoryCount++
  if (data.researchGap) filledMandatoryCount++
  if (data.usedDataset) filledMandatoryCount++
  if (data.summaryRepository) filledMandatoryCount++
  if (data.remarks) filledMandatoryCount++
  if (data.outcome) filledMandatoryCount++

  QUESTION_CONFIG.forEach((q) => {
    const val = (data[q.key as keyof LiteratureReviewData] as QuestionAnswer)
    if (val?.detailedAnswer?.trim() && val?.shortSummary?.trim()) {
      filledMandatoryCount++
    }
  })

  customQuestions.forEach((cq) => {
    if (cq.title?.trim() && cq.detailedAnswer?.trim() && cq.shortSummary?.trim()) {
      filledMandatoryCount++
    }
  })

  const completionPct = Math.min(100, Math.round((filledMandatoryCount / totalMandatoryFields) * 100))
  const isAllComplete = filledMandatoryCount >= totalMandatoryFields

  return (
    <div className="space-y-6 pt-2">
      {/* Header & Progress Tracker */}
      <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
              <FileCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                Literature Review &amp; Survey Questionnaire (Optional)
              </h3>
              <p className="text-xs text-text-secondary">
                Modular research survey sections — fill out any notes, summaries, or questions as needed. All fields are optional.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addCustomQuestion}
              icon={<Plus size={13} />}
            >
              Add Question
            </Button>
          </div>
        </div>

        {/* Optional Progress Tracker */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              {filledMandatoryCount > 0 ? (
                <span className="text-text-secondary flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-accent" /> {filledMandatoryCount} of {totalMandatoryFields} Review Sections Filled
                </span>
              ) : (
                <span className="text-text-tertiary">
                  0 of {totalMandatoryFields} Optional Review Sections Filled
                </span>
              )}
            </span>
            <span className="font-mono text-xs font-bold text-accent">
              {completionPct}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-bg-primary overflow-hidden border border-border-default/60">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Group 1: Review Assignment & Meta Fields */}
      <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <User size={14} className="text-accent" /> Review Assignment &amp; Tracking Meta
          </h4>
          <span className="text-[11px] text-text-tertiary font-mono">Columns: SL, Assigned, Title, Link, Access</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="SL (Serial Number)"
            placeholder="e.g. 01, 1"
            value={data.sl?.toString() || ''}
            onChange={(e) => updateField('sl', e.target.value)}
          />
          <Input
            label="Assigned Person's Name"
            placeholder="e.g. Dr. Alex Morgan"
            value={data.assignedPerson || ''}
            onChange={(e) => updateField('assignedPerson', e.target.value)}
          />
          <Select
            label="PDF Accessibility Status"
            options={PDF_ACCESSIBILITY_OPTIONS}
            value={data.pdfAccessibility || 'Open Access'}
            onChange={(e) => updateField('pdfAccessibility', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Selected Paper Title"
            placeholder="e.g. Attention Is All You Need (Vaswani et al.)"
            value={data.selectedPaperTitle || ''}
            onChange={(e) => updateField('selectedPaperTitle', e.target.value)}
          />
          <Input
            label="Repository of the Summary"
            placeholder="e.g. https://github.com/lab/review-summaries or Overleaf link"
            value={data.summaryRepository || ''}
            onChange={(e) => updateField('summaryRepository', e.target.value)}
            type="url"
          />
        </div>

        <Textarea
          label="Remarks or Comments"
          placeholder="General reviewer remarks, initial impressions, conference notes, or reading group discussion points..."
          value={data.remarks || ''}
          onChange={(e) => updateField('remarks', e.target.value)}
          rows={2}
        />
      </div>

      {/* Group 2: Scope, Research Gap & Datasets */}
      <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-4">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-400" /> Research Gap &amp; Datasets
        </h4>

        <div className="space-y-4">
          <Textarea
            label="Lackings of the Paper or Research Gap"
            placeholder="What research gap does this paper leave unaddressed? What are the missing validations or unresolved bottlenecks?"
            value={data.researchGap || ''}
            onChange={(e) => updateField('researchGap', e.target.value)}
            rows={2}
          />

          <Textarea
            label="Used Dataset"
            placeholder="Datasets utilized in experiments (e.g. Common Crawl, C4, ImageNet-1k, WMT 2014 En-De, GSM8K, MMLU, HumanEval)..."
            value={data.usedDataset || ''}
            onChange={(e) => updateField('usedDataset', e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Group 3: Core Evaluation Questions (Q1 to Q9) — Optional */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <HelpCircle size={14} className="text-accent" /> Evaluation Questionnaire (Q1 – Q9)
            </h4>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => expandAllSections(true)}
              className="text-accent hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-text-tertiary">•</span>
            <button
              type="button"
              onClick={() => expandAllSections(false)}
              className="text-accent hover:underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {QUESTION_CONFIG.map((q) => {
            const val = (data[q.key as keyof LiteratureReviewData] as QuestionAnswer) || {
              detailedAnswer: '',
              shortSummary: '',
              comment: '',
            }
            const isOpen = openAccordion[q.key] ?? false
            const isQuestionComplete = Boolean(val.detailedAnswer?.trim() || val.shortSummary?.trim())

            return (
              <div
                key={q.key}
                className={`rounded-xl bg-bg-tertiary border transition-all ${
                  isQuestionComplete
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border-default'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(q.key)}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono bg-bg-primary ${q.color} border border-border-default`}>
                      {q.num}
                    </span>
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {q.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {val.comment && (
                      <span className="text-[10px] text-accent flex items-center gap-1 font-mono">
                        <MessageSquare size={11} /> Comment
                      </span>
                    )}
                    {isQuestionComplete && (
                      <span className="text-[10px] text-success flex items-center gap-1 font-mono bg-success/15 px-1.5 py-0.5 rounded">
                        <CheckCircle2 size={11} /> Filled
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={15} className="text-text-tertiary" /> : <ChevronDown size={15} className="text-text-tertiary" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-1 space-y-3.5 border-t border-border-default/50 bg-bg-primary/40">
                    <Textarea
                      label="Detailed Analysis / Full Response"
                      placeholder={q.placeholderDetailed}
                      value={val.detailedAnswer || ''}
                      onChange={(e) => updateQuestion(q.key as keyof LiteratureReviewData, 'detailedAnswer', e.target.value)}
                      rows={3}
                    />

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        Short Summary (at the end)
                      </label>
                      <Input
                        placeholder={q.placeholderSummary}
                        value={val.shortSummary || ''}
                        onChange={(e) => updateQuestion(q.key as keyof LiteratureReviewData, 'shortSummary', e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>

                    {/* Per-question Comment Field */}
                    <div className="space-y-1 pt-1 border-t border-border-default/40">
                      <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                        <MessageSquare size={12} className="text-accent" />
                        Reviewer Comment / Discussion Note for {q.num}
                      </label>
                      <Textarea
                        placeholder={q.placeholderComment}
                        value={val.comment || ''}
                        onChange={(e) => updateQuestion(q.key as keyof LiteratureReviewData, 'comment', e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Group 4: Manually Added Custom Questions */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} className="text-accent" /> Custom Review Questions ({customQuestions.length})
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCustomQuestion}
            icon={<Plus size={13} />}
          >
            Add Question
          </Button>
        </div>

        {customQuestions.length === 0 ? (
          <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-dashed border-border-default text-center text-text-tertiary space-y-2">
            <p className="text-xs">
              Need custom research evaluation criteria? Add custom questions (e.g. Q10, Q11, safety audits, ablation checks).
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCustomQuestion}
              icon={<Plus size={13} />}
              className="text-accent hover:text-accent"
            >
              Add Custom Question
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {customQuestions.map((cq, idx) => {
              const qId = cq.id || `custom-${idx}`
              const isOpen = openAccordion[qId] ?? true
              const labelNum = cq.num || `Q${idx + 10}`
              const isCustomComplete = Boolean(cq.detailedAnswer?.trim() || cq.shortSummary?.trim())

              return (
                <div
                  key={qId}
                  className={`rounded-xl bg-bg-tertiary border overflow-hidden transition-all ${
                    isCustomComplete ? 'border-accent/40 bg-accent/5' : 'border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between p-3.5 bg-bg-elevated/40 border-b border-border-default/40">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-bg-primary text-accent border border-accent/30 shrink-0">
                        {labelNum}
                      </span>
                      <input
                        placeholder="Enter Question Title..."
                        value={cq.title || ''}
                        onChange={(e) => updateCustomQuestion(qId, 'title', e.target.value)}
                        className="w-full bg-transparent text-xs font-semibold text-text-primary outline-none border-b border-transparent focus:border-accent pb-0.5 placeholder:text-text-tertiary"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustomComplete && (
                        <span className="text-[10px] text-success font-mono flex items-center gap-1 bg-success/15 px-1.5 py-0.5 rounded mr-1">
                          <CheckCircle2 size={11} /> Filled
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSection(qId)}
                        className="p-1 rounded text-text-tertiary hover:text-text-primary"
                        title={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomQuestion(qId)}
                        className="p-1 rounded text-text-tertiary hover:text-danger cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 space-y-3 bg-bg-primary/40">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Input
                          label="Question Tag / Number"
                          placeholder="e.g. Q10, Ethics"
                          value={String(cq.num || labelNum)}
                          onChange={(e) => updateCustomQuestion(qId, 'num', e.target.value)}
                          className="text-xs font-mono"
                        />
                        <div className="sm:col-span-3">
                          <Input
                            label="Question Prompt / Title"
                            placeholder="e.g. What are the training compute and environmental footprints?"
                            value={cq.title || ''}
                            onChange={(e) => updateCustomQuestion(qId, 'title', e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <Textarea
                        label="Detailed Response / Analysis"
                        placeholder="Detailed answer for this custom question..."
                        value={cq.detailedAnswer || ''}
                        onChange={(e) => updateCustomQuestion(qId, 'detailedAnswer', e.target.value)}
                        rows={3}
                      />

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          Short Summary (at the end)
                        </label>
                        <Input
                          placeholder="Short summary takeaway..."
                          value={cq.shortSummary || ''}
                          onChange={(e) => updateCustomQuestion(qId, 'shortSummary', e.target.value)}
                          className="text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1 pt-1 border-t border-border-default/40">
                        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-accent" />
                          Reviewer Comment / Discussion Note
                        </label>
                        <Textarea
                          placeholder="Add comment, notes, or discussion points for this custom question..."
                          value={cq.comment || ''}
                          onChange={(e) => updateCustomQuestion(qId, 'comment', e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Group 5: OutCome — Optional */}
      <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-3">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={14} className="text-accent" /> Final Research OutCome &amp; Decision
        </h4>
        <Textarea
          label="OutCome / Conclusion"
          placeholder="Final synthesis, research paper verdict, takeaway impact, or review decision..."
          value={data.outcome || ''}
          onChange={(e) => updateField('outcome', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}

interface LiteratureReviewViewProps {
  data: LiteratureReviewData
  paperTitle?: string
  paperUrl?: string
  doi?: string
  onSaveQuestionComment?: (questionKey: string, comment: string) => Promise<void>
}

export function LiteratureReviewView({
  data,
  paperTitle,
  paperUrl,
  doi,
  onSaveQuestionComment,
}: LiteratureReviewViewProps) {
  const { addToast } = useToast()
  const [openAll, setOpenAll] = useState(true)
  const [editingCommentKey, setEditingCommentKey] = useState<string | null>(null)
  const [tempCommentText, setTempCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const copyAsMarkdown = () => {
    const customQuestions = data.customQuestions || []

    const lines = [
      `# Literature Review Matrix: ${data.selectedPaperTitle || paperTitle || 'Paper Review'}`,
      `**SL:** ${data.sl || 'N/A'} | **Assigned:** ${data.assignedPerson || 'N/A'} | **Access:** ${data.pdfAccessibility || 'Open Access'}`,
      `**Paper Link:** ${data.paperLink || paperUrl || (doi ? `https://doi.org/${doi}` : 'N/A')}`,
      data.summaryRepository ? `**Summary Repository:** ${data.summaryRepository}` : '',
      data.researchGap ? `\n### Lackings / Research Gap\n${data.researchGap}` : '',
      data.usedDataset ? `\n### Used Dataset\n${data.usedDataset}` : '',
      data.remarks ? `\n### Remarks / Comments\n${data.remarks}` : '',
      '\n## Evaluation Questionnaire (Q1 - Q9)',
      ...QUESTION_CONFIG.map((q) => {
        const val = (data[q.key as keyof LiteratureReviewData] as QuestionAnswer) || { detailedAnswer: '', shortSummary: '', comment: '' }
        return `\n### ${q.num}. ${q.title}\n${val.detailedAnswer || '_No detailed response recorded._'}\n\n**Short Summary:** ${val.shortSummary || '_None_'}${val.comment ? `\n\n> 💬 **Reviewer Comment:** ${val.comment}` : ''}`
      }),
      ...(customQuestions.length > 0
        ? [
            '\n## Custom Evaluation Questions',
            ...customQuestions.map((cq, idx) => {
              const num = cq.num || `Q${idx + 10}`
              return `\n### ${num}. ${cq.title || 'Custom Question'}\n${cq.detailedAnswer || '_No response recorded._'}\n\n**Short Summary:** ${cq.shortSummary || '_None_'}${cq.comment ? `\n\n> 💬 **Reviewer Comment:** ${cq.comment}` : ''}`
            }),
          ]
        : []),
      data.outcome ? `\n## OutCome\n${data.outcome}` : '',
    ].filter(Boolean)

    navigator.clipboard.writeText(lines.join('\n'))
    addToast('success', 'Full Literature Review with comments copied to clipboard (Markdown)')
  }

  const handleStartEditComment = (key: string, currentComment: string) => {
    setEditingCommentKey(key)
    setTempCommentText(currentComment || '')
  }

  const handleSaveComment = async (key: string) => {
    if (!onSaveQuestionComment) return
    setSavingComment(true)
    try {
      await onSaveQuestionComment(key, tempCommentText.trim())
      setEditingCommentKey(null)
      setTempCommentText('')
      addToast('success', 'Reviewer comment & discussion note saved!')
    } catch {
      addToast('error', 'Failed to save comment')
    } finally {
      setSavingComment(false)
    }
  }

  const effectiveLink = data.paperLink || paperUrl || (doi ? `https://doi.org/${doi}` : '')
  const effectiveTitle = data.selectedPaperTitle || data.paperTitle || paperTitle || 'Research Review'
  const customQuestions = data.customQuestions || []

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border-default flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {data.sl && (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-accent/20 text-accent border border-accent/40">
                SL #{data.sl}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-bg-primary text-text-secondary border border-border-default">
              👤 {data.assignedPerson || 'Unassigned Reviewer'}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${
              data.pdfAccessibility?.includes('Open')
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                : data.pdfAccessibility?.includes('Paywall')
                ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                : 'bg-bg-primary text-text-secondary border-border-default'
            }`}>
              {data.pdfAccessibility || 'Open Access'}
            </span>
          </div>

          <h3 className="text-base font-bold text-text-primary font-display">
            {effectiveTitle}
          </h3>

          {effectiveLink && (
            <a
              href={effectiveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-mono"
            >
              <ExternalLink size={12} /> {effectiveLink}
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {data.summaryRepository && (
            <a
              href={data.summaryRepository}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-primary hover:bg-bg-elevated text-text-primary border border-border-default transition-colors"
            >
              <GitBranch size={13} className="text-accent" /> Summary Repo
            </a>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={copyAsMarkdown}
            icon={<Copy size={13} />}
          >
            Copy Review MD
          </Button>
        </div>
      </div>

      {/* Scope, Research Gap & Datasets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.researchGap ? (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-1.5">
            <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} /> Lackings of the Paper / Research Gap
            </h4>
            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
              {data.researchGap}
            </p>
          </div>
        ) : null}

        {data.usedDataset ? (
          <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 space-y-1.5">
            <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database size={14} /> Used Dataset &amp; Benchmarks
            </h4>
            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
              {data.usedDataset}
            </p>
          </div>
        ) : null}
      </div>

      {data.remarks && (
        <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={13} className="text-accent" /> Remarks / Comments
          </h4>
          <p className="text-xs text-text-primary whitespace-pre-wrap">{data.remarks}</p>
        </div>
      )}

      {/* Q1 – Q9 Detailed Cards with Comments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <HelpCircle size={14} className="text-accent" /> Evaluation Questionnaire Breakdown (Q1–Q9)
          </h4>
          <button
            type="button"
            onClick={() => setOpenAll((prev) => !prev)}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            {openAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div className="space-y-3">
          {/* Q1 to Q9 */}
          {QUESTION_CONFIG.map((q) => {
            const val = (data[q.key as keyof LiteratureReviewData] as QuestionAnswer) || {
              detailedAnswer: '',
              shortSummary: '',
              comment: '',
            }
            const isEditingThisComment = editingCommentKey === q.key

            return (
              <div
                key={q.key}
                className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono bg-bg-primary ${q.color} border border-border-default shrink-0`}>
                      {q.num}
                    </span>
                    <div>
                      <h5 className="text-xs font-semibold text-text-primary">
                        {q.title}
                      </h5>
                    </div>
                  </div>

                  {onSaveQuestionComment && !isEditingThisComment && (
                    <button
                      type="button"
                      onClick={() => handleStartEditComment(q.key, val.comment || '')}
                      className="text-[11px] font-medium text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <MessageSquare size={12} />
                      {val.comment ? 'Edit Note' : 'Add Note'}
                    </button>
                  )}
                </div>

                {val.detailedAnswer ? (
                  <p className="text-xs text-text-secondary leading-relaxed pl-8 whitespace-pre-wrap">
                    {val.detailedAnswer}
                  </p>
                ) : (
                  <p className="text-xs text-text-tertiary italic pl-8">
                    No response recorded.
                  </p>
                )}

                {val.shortSummary && (
                  <div className="ml-8 p-2 rounded-lg bg-bg-primary/80 border border-accent/20 flex items-start gap-2 text-xs text-text-primary">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/20 text-accent uppercase tracking-wider shrink-0 font-mono">
                      Summary
                    </span>
                    <span className="font-medium">{val.shortSummary}</span>
                  </div>
                )}

                {/* Inline Comment Editor */}
                {isEditingThisComment ? (
                  <div className="ml-8 p-3 rounded-xl bg-bg-secondary border border-accent/40 space-y-2.5 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                        <MessageSquare size={12} /> Reviewer Comment / Discussion Note for {q.num}:
                      </span>
                    </div>
                    <Textarea
                      value={tempCommentText}
                      onChange={(e) => setTempCommentText(e.target.value)}
                      placeholder={`Add faculty feedback, critique, guidance, or discussion point for ${q.num}...`}
                      rows={2}
                      className="text-xs"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentKey(null)
                          setTempCommentText('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveComment(q.key)}
                        loading={savingComment}
                      >
                        Save Discussion Note
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Question Comment Callout */
                  val.comment && (
                    <div className="ml-8 p-2.5 rounded-lg bg-bg-primary/90 border border-border-default/80 flex items-start justify-between gap-2 text-xs text-text-secondary">
                      <div className="flex items-start gap-2 min-w-0">
                        <MessageSquare size={13} className="text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-semibold text-accent uppercase tracking-wider block font-mono">
                            Reviewer Comment / Discussion Note:
                          </span>
                          <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                            {val.comment}
                          </p>
                        </div>
                      </div>
                      {onSaveQuestionComment && (
                        <button
                          type="button"
                          onClick={() => handleStartEditComment(q.key, val.comment || '')}
                          className="text-text-tertiary hover:text-accent p-1 cursor-pointer shrink-0"
                          title="Edit Comment"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            )
          })}

          {/* Custom Questions */}
          {customQuestions.map((cq, idx) => {
            const labelNum = cq.num || `Q${idx + 10}`
            const customKey = `custom_${cq.id}`
            const isEditingThisComment = editingCommentKey === customKey

            return (
              <div
                key={cq.id}
                className="p-4 rounded-xl bg-bg-tertiary border border-accent/30 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-bg-primary text-accent border border-accent/40 shrink-0">
                      {labelNum}
                    </span>
                    <div>
                      <h5 className="text-xs font-semibold text-text-primary">
                        {cq.title || 'Custom Evaluation Question'}
                      </h5>
                    </div>
                  </div>

                  {onSaveQuestionComment && !isEditingThisComment && (
                    <button
                      type="button"
                      onClick={() => handleStartEditComment(customKey, cq.comment || '')}
                      className="text-[11px] font-medium text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <MessageSquare size={12} />
                      {cq.comment ? 'Edit Note' : 'Add Note'}
                    </button>
                  )}
                </div>

                {cq.detailedAnswer ? (
                  <p className="text-xs text-text-secondary leading-relaxed pl-8 whitespace-pre-wrap">
                    {cq.detailedAnswer}
                  </p>
                ) : (
                  <p className="text-xs text-text-tertiary italic pl-8">
                    No response recorded.
                  </p>
                )}

                {cq.shortSummary && (
                  <div className="ml-8 p-2 rounded-lg bg-bg-primary/80 border border-accent/20 flex items-start gap-2 text-xs text-text-primary">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/20 text-accent uppercase tracking-wider shrink-0 font-mono">
                      Summary
                    </span>
                    <span className="font-medium">{cq.shortSummary}</span>
                  </div>
                )}

                {/* Inline Comment Editor */}
                {isEditingThisComment ? (
                  <div className="ml-8 p-3 rounded-xl bg-bg-secondary border border-accent/40 space-y-2.5 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                        <MessageSquare size={12} /> Reviewer Comment for {labelNum}:
                      </span>
                    </div>
                    <Textarea
                      value={tempCommentText}
                      onChange={(e) => setTempCommentText(e.target.value)}
                      placeholder={`Add discussion note for ${labelNum}...`}
                      rows={2}
                      className="text-xs"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentKey(null)
                          setTempCommentText('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveComment(customKey)}
                        loading={savingComment}
                      >
                        Save Discussion Note
                      </Button>
                    </div>
                  </div>
                ) : (
                  cq.comment && (
                    <div className="ml-8 p-2.5 rounded-lg bg-bg-primary/90 border border-border-default/80 flex items-start justify-between gap-2 text-xs text-text-secondary">
                      <div className="flex items-start gap-2 min-w-0">
                        <MessageSquare size={13} className="text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-semibold text-accent uppercase tracking-wider block font-mono">
                            Reviewer Comment / Discussion Note:
                          </span>
                          <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                            {cq.comment}
                          </p>
                        </div>
                      </div>
                      {onSaveQuestionComment && (
                        <button
                          type="button"
                          onClick={() => handleStartEditComment(customKey, cq.comment || '')}
                          className="text-text-tertiary hover:text-accent p-1 cursor-pointer shrink-0"
                          title="Edit Comment"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* OutCome Section */}
      {data.outcome && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-bg-tertiary via-bg-tertiary to-accent-subtle/30 border border-accent/40 space-y-2">
          <h4 className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} /> Final OutCome &amp; Review Synthesis
          </h4>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
            {data.outcome}
          </p>
        </div>
      )}
    </div>
  )
}
