'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  X,
  FolderOpen,
  Sparkles,
  Cpu,
  Trophy,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Zap,
  FileCheck,
} from 'lucide-react'
import { GithubIcon } from '@/components/ui/Icons'
import { PdfDropzoneExtractor } from '@/components/papers/PdfDropzoneExtractor'
import {
  LiteratureReviewEditor,
  QUESTION_CONFIG,
} from '@/components/papers/LiteratureReviewSection'
import type {
  Paper,
  Status,
  Priority,
  ReplicationStatus,
  Collection,
  BenchmarkScore,
  LiteratureReviewData,
  QuestionAnswer,
} from '@/lib/types'

const statusOptions = [
  { value: 'TO_READ', label: 'To Read' },
  { value: 'READING', label: 'Reading' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const replicationOptions = [
  { value: 'UNTESTED', label: 'Untested' },
  { value: 'REPRODUCING', label: 'In Progress (Reproducing)' },
  { value: 'REPLICATED', label: 'Successfully Replicated' },
  { value: 'FAILED', label: 'Failed to Replicate' },
]

const architectureOptions = [
  { value: '', label: 'Select Architecture Family (Optional)' },
  { value: 'Dense Transformer', label: 'Dense Transformer (Decoder/Encoder)' },
  { value: 'Mixture of Experts (MoE)', label: 'Mixture of Experts (MoE)' },
  { value: 'State Space Model (SSM / Mamba)', label: 'State Space Model (SSM / Mamba)' },
  { value: 'Diffusion / Flow Matching', label: 'Diffusion / Flow Matching' },
  { value: 'Convolutional (CNN)', label: 'Convolutional (CNN / ConvNet)' },
  { value: 'Recurrent / Hybrid', label: 'Recurrent / Hybrid' },
  { value: 'Graph Neural Network (GNN)', label: 'Graph Neural Network (GNN)' },
  { value: 'Reinforcement Learning (RL / RLHF)', label: 'Reinforcement Learning (RL / RLHF)' },
]

// Preset test paper samples for 1-click preview
const SAMPLE_PRESETS = [
  {
    label: '⚡ Transformer',
    query: '1706.03762',
    description: 'Attention Is All You Need (ArXiv ID)',
  },
  {
    label: '🧬 AlphaFold 2',
    query: '10.1038/s41586-020-2649-2',
    description: 'Nature DOI Link',
  },
  {
    label: '🎯 DPO Alignment',
    query: '2305.18290',
    description: 'Direct Preference Optimization (ArXiv)',
  },
  {
    label: '🖼️ ResNet',
    query: '10.1109/CVPR.2016.90',
    description: 'CVPR DOI Link',
  },
]

interface PaperFormProps {
  paper?: Paper
  mode: 'create' | 'edit'
}

interface FetchedPaperPreview {
  title: string
  authors: string
  journal?: string
  publicationYear?: number
  citationCount?: number
  arxivId?: string
  doi?: string
  architecture?: string
  tags?: string[]
}

export function PaperForm({ paper, mode }: PaperFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetchingArxiv, setFetchingArxiv] = useState(false)
  const [arxivQuery, setArxivQuery] = useState('')
  const [lastFetched, setLastFetched] = useState<FetchedPaperPreview | null>(null)

  // Core Fields
  const [title, setTitle] = useState(paper?.title || '')
  const [authors, setAuthors] = useState(paper?.authors || '')
  const [abstract, setAbstract] = useState(paper?.abstract || '')
  const [doi, setDoi] = useState(paper?.doi || '')
  const [url, setUrl] = useState(paper?.url || '')
  const [journal, setJournal] = useState(paper?.journal || '')
  const [publicationYear, setPublicationYear] = useState(
    paper?.publicationYear?.toString() || ''
  )
  const [status, setStatus] = useState<Status>(paper?.status || 'TO_READ')
  const [priority, setPriority] = useState<Priority>(paper?.priority || 'MEDIUM')
  const [arxivId, setArxivId] = useState(paper?.arxivId || '')
  const [citationCount, setCitationCount] = useState(paper?.citationCount?.toString() || '0')
  const [pdfPath, setPdfPath] = useState(paper?.pdfPath || '')

  // AI/ML Code & Model Hub
  const [codeUrl, setCodeUrl] = useState(paper?.codeUrl || '')
  const [modelUrl, setModelUrl] = useState(paper?.modelUrl || '')
  const [datasetUrl, setDatasetUrl] = useState(paper?.datasetUrl || '')
  const [replicationStatus, setReplicationStatus] = useState<ReplicationStatus>(
    paper?.replicationStatus || 'UNTESTED'
  )

  // Model Specs & Architecture
  const [parameters, setParameters] = useState(paper?.parameters || '')
  const [contextWindow, setContextWindow] = useState(paper?.contextWindow || '')
  const [architecture, setArchitecture] = useState(paper?.architecture || '')
  const [computeBudget, setComputeBudget] = useState(paper?.computeBudget || '')

  // Benchmark Matrix
  const initialBenchmarks: BenchmarkScore[] = paper?.benchmarks
    ? (() => {
        try {
          return JSON.parse(paper.benchmarks)
        } catch {
          return []
        }
      })()
    : []
  const [benchmarks, setBenchmarks] = useState<BenchmarkScore[]>(initialBenchmarks)

  // 3-Minute Digest
  const [problemSolved, setProblemSolved] = useState(paper?.problemSolved || '')
  const [keyContribution, setKeyContribution] = useState(paper?.keyContribution || '')
  const [limitations, setLimitations] = useState(paper?.limitations || '')

  // 20-Column Literature Review Survey Matrix
  const parseInitialReview = (p?: Paper): LiteratureReviewData => {
    if (p?.literatureReview) {
      try {
        return typeof p.literatureReview === 'string'
          ? JSON.parse(p.literatureReview)
          : p.literatureReview
      } catch {
        return {}
      }
    }
    return {
      sl: '1',
      assignedPerson: '',
      selectedPaperTitle: p?.title || '',
      paperTitle: p?.title || '',
      paperLink: p?.url || (p?.doi ? `https://doi.org/${p.doi}` : ''),
      pdfAccessibility: 'Open Access',
      researchGap: p?.problemSolved || '',
      usedDataset: '',
      summaryRepository: '',
      remarks: '',
      q1ProblemImportance: p?.problemSolved ? { detailedAnswer: p.problemSolved, shortSummary: p.problemSolved } : { detailedAnswer: '', shortSummary: '' },
      q2DataDetails: { detailedAnswer: '', shortSummary: '' },
      q3FeaturesInputs: { detailedAnswer: '', shortSummary: '' },
      q4MethodsPipeline: p?.architecture ? { detailedAnswer: `Architecture: ${p.architecture}`, shortSummary: p.architecture } : { detailedAnswer: '', shortSummary: '' },
      q5Baselines: { detailedAnswer: '', shortSummary: '' },
      q6Evaluation: { detailedAnswer: '', shortSummary: '' },
      q7KeyResults: { detailedAnswer: '', shortSummary: '' },
      q8LimitationsBiases: p?.limitations ? { detailedAnswer: p.limitations, shortSummary: p.limitations } : { detailedAnswer: '', shortSummary: '' },
      q9ArtifactsReplication: p?.codeUrl ? { detailedAnswer: `Repository: ${p.codeUrl}`, shortSummary: 'Code available' } : { detailedAnswer: '', shortSummary: '' },
      outcome: p?.keyContribution || '',
    }
  }

  const [literatureReview, setLiteratureReview] = useState<LiteratureReviewData>(parseInitialReview(paper))

  // Tags & Collections
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(
    paper?.tags?.map((t) => t.name) || []
  )
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    paper?.collections?.map((c) => c.id) || []
  )

  // Synchronize state when paper prop changes (e.g. on edit page load)
  useEffect(() => {
    if (paper) {
      setTitle(paper.title || '')
      setAuthors(paper.authors || '')
      setAbstract(paper.abstract || '')
      setDoi(paper.doi || '')
      setUrl(paper.url || '')
      setJournal(paper.journal || '')
      setPublicationYear(paper.publicationYear?.toString() || '')
      setStatus(paper.status || 'TO_READ')
      setPriority(paper.priority || 'MEDIUM')
      setArxivId(paper.arxivId || '')
      setCitationCount(paper.citationCount?.toString() || '0')
      setCodeUrl(paper.codeUrl || '')
      setModelUrl(paper.modelUrl || '')
      setDatasetUrl(paper.datasetUrl || '')
      setReplicationStatus(paper.replicationStatus || 'UNTESTED')
      setParameters(paper.parameters || '')
      setContextWindow(paper.contextWindow || '')
      setArchitecture(paper.architecture || '')
      setComputeBudget(paper.computeBudget || '')
      setProblemSolved(paper.problemSolved || '')
      setKeyContribution(paper.keyContribution || '')
      setLimitations(paper.limitations || '')

      if (paper.benchmarks) {
        try {
          setBenchmarks(typeof paper.benchmarks === 'string' ? JSON.parse(paper.benchmarks) : paper.benchmarks)
        } catch {
          // ignore
        }
      }

      setLiteratureReview(parseInitialReview(paper))

      if (paper.tags) {
        setTags(paper.tags.map((t) => t.name))
      }
      if (paper.collections) {
        setSelectedCollections(paper.collections.map((c) => c.id))
      }
    }
  }, [paper])

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch('/api/collections')
        if (res.ok) {
          const data = await res.json()
          setAvailableCollections(data)

          // Pre-select collection if passed in URL query param
          if (typeof window !== 'undefined' && mode === 'create') {
            const urlParams = new URLSearchParams(window.location.search)
            const queryColId = urlParams.get('collectionId')
            if (queryColId && !selectedCollections.includes(queryColId)) {
              setSelectedCollections((prev) => Array.from(new Set([...prev, queryColId])))
            }
          }
        }
      } catch {
        // silent
      }
    }
    loadCollections()
  }, [mode, selectedCollections])

  // Detect input type for dynamic UI feedback badge
  const getInputTypeLabel = (query: string): { label: string; color: string } | null => {
    const q = query.trim()
    if (!q) return null
    if (/(?:doi\.org\/|doi:\s*|10\.[0-9]{4,9}\/)/i.test(q)) {
      return { label: 'DOI Link (Crossref & Semantic Scholar)', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60' }
    }
    if (/(?:arxiv\.org\/|arxiv:\s*|[0-9]{4}\.[0-9]{4,5})/i.test(q)) {
      return { label: 'ArXiv Identifier', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' }
    }
    if (/semanticscholar\.org|corpusid/i.test(q) || /^[a-f0-9]{40}$/i.test(q)) {
      return { label: 'Semantic Scholar Record', color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' }
    }
    return { label: 'Academic Title Search', color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' }
  }

  // 1-Click ArXiv / DOI / Semantic Scholar Ingestion
  const handleFetchArxiv = async (queryOverride?: string) => {
    const queryToUse = (queryOverride || arxivQuery).trim()
    if (!queryToUse) {
      addToast('error', 'Please enter an ArXiv ID, DOI link, Semantic Scholar URL, or paper title')
      return
    }

    if (queryOverride) {
      setArxivQuery(queryOverride)
    }

    setFetchingArxiv(true)
    setLastFetched(null)

    try {
      const res = await fetch(`/api/arxiv?id=${encodeURIComponent(queryToUse)}`)
      if (res.ok) {
        const data = await res.json()
        setTitle(data.title || '')
        setAuthors(data.authors || '')
        setAbstract(data.abstract || '')
        setPublicationYear(data.publicationYear ? data.publicationYear.toString() : '')
        setJournal(data.journal || '')
        setDoi(data.doi || '')
        setUrl(data.url || '')
        setArxivId(data.arxivId || '')
        setCitationCount(data.citationCount !== undefined && data.citationCount !== null ? data.citationCount.toString() : '0')

        if (data.githubUrl) setCodeUrl(data.githubUrl)
        if (data.modelUrl) setModelUrl(data.modelUrl)
        if (data.architecture) setArchitecture(data.architecture)
        if (data.keyContribution) setKeyContribution(data.keyContribution)
        if (data.problemSolved) setProblemSolved(data.problemSolved)

        if (data.tags && data.tags.length > 0) {
          const mergedTags = Array.from(new Set([...tags, ...data.tags.map((t: string) => t.toLowerCase())]))
          setTags(mergedTags)
        }

        // Auto-enrich Literature Review answers
        setLiteratureReview((prev) => ({
          ...prev,
          sl: prev.sl || '1',
          assignedPerson: prev.assignedPerson || 'Lead Reviewer',
          selectedPaperTitle: data.title || prev.selectedPaperTitle,
          paperTitle: data.title || prev.paperTitle,
          paperLink: data.url || (data.doi ? `https://doi.org/${data.doi}` : prev.paperLink),
          pdfAccessibility: data.pdfUrl ? 'Open Access' : 'Pre-print Available',
          researchGap: data.problemSolved || prev.researchGap || 'Identifies fundamental scalability, accuracy, or efficiency limits in prior methods.',
          usedDataset: prev.usedDataset || 'Curated benchmark corpora and downstream evaluation splits.',
          summaryRepository: data.githubUrl || prev.summaryRepository || (data.url || ''),
          remarks: prev.remarks || 'Landmark paper with extensive empirical validation and architectural novelty.',
          outcome: data.keyContribution || prev.outcome || 'Pioneered new state-of-the-art methodology.',
          q1ProblemImportance: {
            detailedAnswer: data.problemSolved ? `The authors address: ${data.problemSolved}` : 'Addresses efficiency and capability bottlenecks.',
            shortSummary: data.problemSolved ? data.problemSolved.slice(0, 100) : 'Primary bottleneck in prior models.',
          },
          q2DataDetails: {
            detailedAnswer: 'Evaluated across standardized pretraining benchmarks, validation splits, and domain datasets with ethical curation.',
            shortSummary: 'Standard domain benchmark splits.',
          },
          q3FeaturesInputs: {
            detailedAnswer: 'High-dimensional embeddings, positional encodings, and multimodal representations.',
            shortSummary: 'Learned sequence embeddings & token features.',
          },
          q4MethodsPipeline: {
            detailedAnswer: data.architecture ? `Employs ${data.architecture}. Overall pipeline optimizes representations via deep end-to-end training.` : 'Deep neural pipeline with end-to-end gradient optimization.',
            shortSummary: data.architecture || 'End-to-end neural pipeline.',
          },
          q5Baselines: {
            detailedAnswer: 'Compared against contemporary state-of-the-art architectures and baseline models.',
            shortSummary: 'Prior domain SOTA baselines.',
          },
          q6Evaluation: {
            detailedAnswer: 'Evaluated with rigorous quantitative metrics, ablation studies, and comparative error analysis.',
            shortSummary: 'Benchmark accuracy and ablation metrics.',
          },
          q7KeyResults: {
            detailedAnswer: 'Achieved significant quantitative improvements over baselines across primary target benchmarks.',
            shortSummary: 'Outperforms prior baselines with SOTA results.',
          },
          q8LimitationsBiases: {
            detailedAnswer: 'Subject to computational scaling costs, memory requirements on large contexts, and domain transfer limits.',
            shortSummary: 'Compute overhead and memory footprint.',
          },
          q9ArtifactsReplication: {
            detailedAnswer: data.githubUrl
              ? `Open-source code repository: ${data.githubUrl}. ${data.modelUrl ? `Weights: ${data.modelUrl}` : ''}`
              : 'Public implementation details and training hyperparameters described in paper.',
            shortSummary: data.githubUrl ? 'Code available on GitHub' : 'Check publication repository',
          },
        }))

        setLastFetched({
          title: data.title,
          authors: data.authors,
          journal: data.journal,
          publicationYear: data.publicationYear,
          citationCount: data.citationCount,
          arxivId: data.arxivId,
          doi: data.doi,
          architecture: data.architecture,
          tags: data.tags,
        })

        addToast('success', `Auto-imported: "${data.title.slice(0, 45)}..."`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to retrieve paper metadata')
      }
    } catch {
      addToast('error', 'Network error fetching paper metadata')
    } finally {
      setFetchingArxiv(false)
    }
  }

  // Handle PDF auto-extraction from dropzone
  const handlePdfExtracted = (extracted: {
    title: string
    authors: string
    abstract?: string
    journal?: string
    publicationYear?: string
    arxivId?: string
    doi?: string
    pdfPath?: string
    citationCount?: number
  }) => {
    if (extracted.title) setTitle(extracted.title)
    if (extracted.authors) setAuthors(extracted.authors)
    if (extracted.abstract) setAbstract(extracted.abstract)
    if (extracted.journal) setJournal(extracted.journal)
    if (extracted.publicationYear) setPublicationYear(extracted.publicationYear)
    if (extracted.arxivId) setArxivId(extracted.arxivId)
    if (extracted.doi) setDoi(extracted.doi)
    if (extracted.pdfPath) setPdfPath(extracted.pdfPath)
    if (extracted.citationCount) setCitationCount(extracted.citationCount.toString())
  }

  // Synthesize ALL answers for literature review questions from existing paper specs
  const handleAutoDraftReview = () => {
    if (!title && !abstract) {
      addToast('error', 'Please fill in the Title and Abstract first (or use Auto-Fetch).')
      return
    }

    const sentences = abstract ? abstract.split(/(?<=[.!?])\s+/) : []
    const problemText = problemSolved || (sentences.length > 0 ? sentences[0] : 'Scalability and efficiency bottlenecks in prior methods.')
    const contributionText = keyContribution || (sentences.length > 1 ? sentences[1] : 'Novel algorithmic mechanism and training formulation.')
    const limitationText = limitations || 'Computational scaling costs and memory bandwidth overhead on ultra-long sequences.'
    const replicationText = codeUrl
      ? `Open source implementation is hosted at ${codeUrl}. ${modelUrl ? `Weights accessible at ${modelUrl}.` : ''}`
      : 'Implementation details and hyperparameter tables provided in paper appendix.'

    setLiteratureReview((prev) => ({
      ...prev,
      sl: prev.sl || '1',
      assignedPerson: prev.assignedPerson || 'Lead Research Reviewer',
      selectedPaperTitle: title || prev.selectedPaperTitle || 'Selected Research Paper',
      paperTitle: title || prev.paperTitle,
      paperLink: url || (doi ? `https://doi.org/${doi}` : prev.paperLink || 'https://arxiv.org'),
      pdfAccessibility: prev.pdfAccessibility || 'Open Access',
      researchGap: prev.researchGap || problemText,
      usedDataset: prev.usedDataset || (benchmarks.length > 0 ? benchmarks.map((b) => b.name).join(', ') : 'Standard benchmark test suites and pretraining corpora'),
      summaryRepository: prev.summaryRepository || codeUrl || 'https://github.com/research-lab/paper-summaries',
      remarks: prev.remarks || 'Thorough literature survey and comparative experimental analysis completed.',
      q1ProblemImportance: {
        detailedAnswer: `The authors address: ${problemText} This is critical for improving foundational model capability, efficiency, and generalization.`,
        shortSummary: problemText.slice(0, 100) || 'Primary limitation in prior paradigm.',
      },
      q2DataDetails: {
        detailedAnswer: prev.q2DataDetails?.detailedAnswer || 'Trained on standardized curated pretraining datasets and evaluated on benchmark splits with ethical data filtering.',
        shortSummary: prev.q2DataDetails?.shortSummary || 'Standard curated dataset splits.',
      },
      q3FeaturesInputs: {
        detailedAnswer: prev.q3FeaturesInputs?.detailedAnswer || (contextWindow ? `Context window input of ${contextWindow} with tokenized sequence representations.` : 'Tokenized sequence embeddings and positional representations.'),
        shortSummary: prev.q3FeaturesInputs?.shortSummary || (contextWindow || 'Embedding representations'),
      },
      q4MethodsPipeline: {
        detailedAnswer: architecture ? `Employs ${architecture}. Key novel contribution: ${contributionText}` : contributionText,
        shortSummary: architecture || 'Core architectural approach.',
      },
      q5Baselines: {
        detailedAnswer: benchmarks.length > 0 && benchmarks[0].baseline
          ? `Evaluated against standard baselines including ${benchmarks.map((b) => b.baseline).filter(Boolean).join(', ')}.`
          : 'Standard prior domain state-of-the-art baseline models.',
        shortSummary: 'Domain SOTA baseline architectures.',
      },
      q6Evaluation: {
        detailedAnswer: benchmarks.length > 0
          ? `Evaluated across ${benchmarks.map((b) => b.name).join(', ')} with statistical ablation studies.`
          : 'Standard downstream validation datasets, task accuracy metrics, and latency profiling.',
        shortSummary: 'Task benchmark accuracy metrics.',
      },
      q7KeyResults: {
        detailedAnswer: benchmarks.length > 0
          ? `Achieved: ${benchmarks.map((b) => `${b.name} = ${b.score}`).join(', ')}.`
          : 'Demonstrated superior quantitative performance over established baselines across target benchmarks.',
        shortSummary: benchmarks.length > 0 ? `${benchmarks[0].name}: ${benchmarks[0].score}` : 'Outperforms prior baselines',
      },
      q8LimitationsBiases: {
        detailedAnswer: limitationText,
        shortSummary: limitationText.slice(0, 80),
      },
      q9ArtifactsReplication: {
        detailedAnswer: replicationText,
        shortSummary: codeUrl ? 'Code available on GitHub' : 'Artifacts in publication',
      },
      outcome: contributionText || prev.outcome || 'Advanced the state of the art in the domain.',
    }))

    addToast('success', 'Auto-drafted all required review answers and survey fields!')
  }

  const toggleCollection = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Benchmark handlers
  const addBenchmarkRow = () => {
    setBenchmarks([...benchmarks, { name: '', score: '', metric: '', baseline: '' }])
  }

  const updateBenchmarkRow = (index: number, field: keyof BenchmarkScore, val: string) => {
    const updated = [...benchmarks]
    updated[index] = { ...updated[index], [field]: val }
    setBenchmarks(updated)
  }

  const removeBenchmarkRow = (index: number) => {
    setBenchmarks(benchmarks.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Essential validation: Title and Authors are required
    if (!title.trim() || !authors.trim()) {
      addToast('error', 'Please enter the Paper Title and Authors.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        title: title.trim(),
        authors: authors.trim(),
        abstract: abstract.trim() || null,
        doi: doi.trim() || null,
        url: url.trim() || null,
        journal: journal.trim() || null,
        publicationYear: publicationYear ? parseInt(publicationYear) : null,
        status,
        priority,
        tags,
        collections: selectedCollections,
        pdfPath: pdfPath || null,
        arxivId: arxivId.trim() || null,
        citationCount: citationCount ? parseInt(citationCount) : 0,
        codeUrl: codeUrl.trim() || null,
        modelUrl: modelUrl.trim() || null,
        datasetUrl: datasetUrl.trim() || null,
        replicationStatus,
        parameters: parameters.trim() || null,
        contextWindow: contextWindow.trim() || null,
        architecture: architecture.trim() || null,
        computeBudget: computeBudget.trim() || null,
        benchmarks: benchmarks.filter((b) => b.name.trim() && b.score.trim()),
        problemSolved: problemSolved.trim() || null,
        keyContribution: keyContribution.trim() || null,
        limitations: limitations.trim() || null,
        literatureReview,
      }

      const endpoint = mode === 'create' ? '/api/papers' : `/api/papers/${paper?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const token = typeof window !== 'undefined' ? localStorage.getItem('papertrack_token') : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save paper')
      }

      const result = await res.json()
      addToast(
        'success',
        mode === 'create'
          ? 'Paper added to research library!'
          : 'Paper updated successfully!'
      )
      window.location.href = `/papers/${result.id}`
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Failed to save paper')
    } finally {
      setLoading(false)
    }
  }

  const inputType = getInputTypeLabel(arxivQuery)

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {/* 1-Click PDF Dropzone Extractor */}
      {mode === 'create' && (
        <PdfDropzoneExtractor onExtracted={handlePdfExtracted} />
      )}

      {/* 1-Click ArXiv & Semantic Scholar Auto-Importer Bar */}
      <div className="p-5 rounded-xl bg-bg-tertiary/70 border border-accent/30 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                1-Click ArXiv &amp; Semantic Scholar Auto-Importer
              </h3>
              <p className="text-xs text-text-secondary">
                Paste any ArXiv ID, DOI link, Semantic Scholar URL, or Title to auto-fill metadata &amp; specs.
              </p>
            </div>
          </div>

          {inputType && (
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border font-mono ${inputType.color}`}>
              {inputType.label}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="e.g. 1706.03762 or https://doi.org/10.1038/s41586-020-2649-2 or Title"
              value={arxivQuery}
              onChange={(e) => setArxivQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleFetchArxiv()
                }
              }}
              className="font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleFetchArxiv()}
            loading={fetchingArxiv}
            icon={<Zap size={14} />}
            className="shrink-0"
          >
            Auto-Fetch
          </Button>
        </div>

        {/* 1-Click Test Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-text-tertiary font-medium">Test Presets:</span>
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.query}
              type="button"
              onClick={() => handleFetchArxiv(preset.query)}
              disabled={fetchingArxiv}
              title={preset.description}
              className="px-2.5 py-1 rounded-lg text-xs bg-bg-primary hover:bg-bg-elevated text-text-secondary hover:text-accent border border-border-default hover:border-accent/40 transition-all font-mono cursor-pointer disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Ingestion Preview Toast / Card */}
        {lastFetched && (
          <div className="p-3.5 rounded-lg bg-bg-primary/80 border border-success/30 flex items-start gap-3 animate-slide-up">
            <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary truncate">
                Fetched: {lastFetched.title}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {lastFetched.authors} {lastFetched.publicationYear ? `(${lastFetched.publicationYear})` : ''}
                {lastFetched.journal ? ` • ${lastFetched.journal}` : ''}
                {lastFetched.citationCount ? ` • ${lastFetched.citationCount.toLocaleString()} Citations` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Basic Metadata */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-default pb-2">
          <BookOpen size={16} className="text-accent" /> Paper Overview (All Required *)
        </h3>

        <Input
          label="Paper Title *"
          placeholder="e.g. Attention Is All You Need"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Input
          label="Authors *"
          placeholder="e.g. Ashish Vaswani, Noam Shazeer, Niki Parmar, et al."
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          required
        />

        <Textarea
          label="Abstract *"
          placeholder="Paste or auto-fetch paper abstract (Required)..."
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          rows={4}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="DOI"
            placeholder="e.g. 10.48550/arXiv.1706.03762"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
          />
          <Input
            label="ArXiv ID"
            placeholder="e.g. 1706.03762"
            value={arxivId}
            onChange={(e) => setArxivId(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Paper URL"
            placeholder="https://arxiv.org/abs/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
          />
          <Input
            label="Journal / Venue"
            placeholder="e.g. NeurIPS 2017, ICML 2024"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
          />
          <Input
            label="Publication Year"
            placeholder="e.g. 2024"
            value={publicationYear}
            onChange={(e) => setPublicationYear(e.target.value)}
            type="number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Citation Count"
            placeholder="e.g. 12500"
            value={citationCount}
            onChange={(e) => setCitationCount(e.target.value)}
            type="number"
          />
          <Select
            label="Reading Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          />
          <Select
            label="Research Priority"
            options={priorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          />
        </div>
      </div>

      {/* NEW: Mandatory Literature Review & Research Questionnaire Section */}
      <div className="space-y-4">
        <LiteratureReviewEditor
          data={literatureReview}
          onChange={setLiteratureReview}
          onAutoDraft={handleAutoDraftReview}
        />
      </div>

      {/* AI/ML Code & Model Hub */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-default pb-2">
          <GithubIcon size={16} className="text-accent" /> Code, Weights &amp; Replication
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="GitHub / Code Repository URL"
            placeholder="https://github.com/..."
            value={codeUrl}
            onChange={(e) => setCodeUrl(e.target.value)}
            type="url"
          />
          <Input
            label="Hugging Face Model / Weights URL"
            placeholder="https://huggingface.co/meta-llama/..."
            value={modelUrl}
            onChange={(e) => setModelUrl(e.target.value)}
            type="url"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Dataset URL"
            placeholder="https://huggingface.co/datasets/..."
            value={datasetUrl}
            onChange={(e) => setDatasetUrl(e.target.value)}
            type="url"
          />
          <Select
            label="Replication Status"
            options={replicationOptions}
            value={replicationStatus}
            onChange={(e) => setReplicationStatus(e.target.value as ReplicationStatus)}
          />
        </div>
      </div>

      {/* AI/ML Model Specs & Architecture */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-default pb-2">
          <Cpu size={16} className="text-accent" /> Architecture &amp; Compute Specs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Architecture Family"
            options={architectureOptions}
            value={architecture}
            onChange={(e) => setArchitecture(e.target.value)}
          />
          <Input
            label="Parameters / Model Size"
            placeholder="e.g. 7B, 70B, 8x7B MoE"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Context Window"
            placeholder="e.g. 32k, 128k tokens"
            value={contextWindow}
            onChange={(e) => setContextWindow(e.target.value)}
          />
          <Input
            label="Training Compute Budget"
            placeholder="e.g. 1024x H100 GPUs, 15T tokens"
            value={computeBudget}
            onChange={(e) => setComputeBudget(e.target.value)}
          />
        </div>
      </div>

      {/* Benchmark Matrix */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} className="text-accent" /> Benchmark Performance Matrix
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addBenchmarkRow}
            icon={<Plus size={14} />}
          >
            Add Metric
          </Button>
        </div>

        {benchmarks.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            No benchmarks recorded yet. Add metrics (e.g. MMLU: 86.4%, GSM8K: 92.0%) to track empirical results.
          </p>
        ) : (
          <div className="space-y-3">
            {benchmarks.map((b, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    placeholder="Benchmark (e.g. MMLU)"
                    value={b.name}
                    onChange={(e) => updateBenchmarkRow(idx, 'name', e.target.value)}
                    className="h-8 px-2.5 text-xs bg-bg-elevated rounded border border-border-default text-text-primary outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Score (e.g. 86.4%)"
                    value={b.score}
                    onChange={(e) => updateBenchmarkRow(idx, 'score', e.target.value)}
                    className="h-8 px-2.5 text-xs bg-bg-elevated rounded border border-border-default text-text-primary outline-none focus:border-accent font-semibold"
                  />
                  <input
                    placeholder="Metric (e.g. 5-shot)"
                    value={b.metric || ''}
                    onChange={(e) => updateBenchmarkRow(idx, 'metric', e.target.value)}
                    className="h-8 px-2.5 text-xs bg-bg-elevated rounded border border-border-default text-text-primary outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Baseline (e.g. GPT-4: 84%)"
                    value={b.baseline || ''}
                    onChange={(e) => updateBenchmarkRow(idx, 'baseline', e.target.value)}
                    className="h-8 px-2.5 text-xs bg-bg-elevated rounded border border-border-default text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBenchmarkRow(idx)}
                  className="p-1.5 rounded text-text-tertiary hover:text-danger cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3-Minute Research Digest */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-default pb-2">
          <Sparkles size={16} className="text-accent" /> 3-Minute Research Digest
        </h3>

        <Textarea
          label="Problem Solved"
          placeholder="What primary limitation or bottleneck does this paper solve?"
          value={problemSolved}
          onChange={(e) => setProblemSolved(e.target.value)}
          rows={2}
        />

        <Textarea
          label="Key Innovation & Novel Contribution"
          placeholder="What is the novel algorithmic mechanism, loss formulation, or training strategy?"
          value={keyContribution}
          onChange={(e) => setKeyContribution(e.target.value)}
          rows={2}
        />

        <Textarea
          label="Limitations & Open Questions"
          placeholder="What are the weaknesses, compute bottlenecks, or failure modes?"
          value={limitations}
          onChange={(e) => setLimitations(e.target.value)}
          rows={2}
        />
      </div>

      {/* Collections & Tags */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-default pb-2">
          <FolderOpen size={16} className="text-accent" /> Organization &amp; Tags
        </h3>

        {/* Collections */}
        {availableCollections.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">
              Assign to Collections
            </label>
            <div className="flex flex-wrap gap-2">
              {availableCollections.map((col) => {
                const isSelected = selectedCollections.includes(col.id)
                const color = col.color || '#06b6d4'
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleCollection(col.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-transparent text-white shadow-sm'
                        : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
                    }`}
                    style={isSelected ? { backgroundColor: color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : color }}
                    />
                    {col.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Tags</label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <Button type="button" variant="secondary" size="md" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-accent-subtle text-accent"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="p-0.5 rounded-full hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-6 border-t border-border-default">
        <Button type="submit" loading={loading}>
          {mode === 'create' ? 'Add Paper to Library' : 'Save Changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
