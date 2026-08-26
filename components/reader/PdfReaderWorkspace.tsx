'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  BookOpen,
  Bot,
  MessageSquare,
  Sparkles,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Copy,
  Trash2,
  Check,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Flame,
  TrendingUp,
  Highlighter,
  Quote,
  Cpu,
  Layers,
  Edit,
  Save,
  HelpCircle,
  BarChart3,
  AlertTriangle,
  FileCheck,
  ArrowLeft,
  GraduationCap,
  User,
  X,
  Settings,
  Key,
  Globe,
  FolderOpen,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import type {
  Paper,
  Note,
  LiteratureReviewData,
  QuestionAnswer,
  Highlight,
  HighlightColor,
  HighlightCategory,
} from '@/lib/types'
import { AiConfigModal, getStoredAiConfig, StoredAiConfig } from './AiConfigModal'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { saveClientPdf, getClientPdf, removeClientPdf } from '@/lib/clientPdfStorage'
import { HighlightFloatingToolbar } from './HighlightFloatingToolbar'
import { HighlightMarginPanel } from './HighlightMarginPanel'

interface PdfReaderWorkspaceProps {
  paper: Paper
}

type SidebarTab = 'ai' | 'highlights' | 'notes' | 'survey'

interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function getAutoResolvedPdfSources(paper: Paper) {
  const sources: { id: string; label: string; url: string; isHtml?: boolean }[] = []

  // 1. Direct PDF (Uploaded or Auto-Fetched Open Access URL)
  if (paper.pdfPath) {
    sources.push({
      id: 'primary-pdf',
      label: paper.pdfPath.startsWith('http') ? 'Open Access PDF' : 'Uploaded PDF',
      url: paper.pdfPath,
    })
  }

  // 2. ArXiv ID direct
  if (paper.arxivId) {
    const rawId = paper.arxivId.replace(/^arxiv:\s*/i, '').replace(/v[0-9]+$/, '').trim()
    sources.push({
      id: 'arxiv-pdf',
      label: `arXiv PDF (${rawId})`,
      url: `https://arxiv.org/pdf/${rawId}.pdf`,
    })
    sources.push({
      id: 'arxiv-html',
      label: 'arXiv Web View (HTML)',
      url: `https://ar5iv.labs.arxiv.org/html/${rawId}`,
      isHtml: true,
    })
  }

  // 3. ArXiv URL in paper.url
  if (paper.url) {
    const arxivUrlMatch = paper.url.match(/(?:arxiv\.org\/(?:abs|pdf)|ar5iv\.labs\.arxiv\.org\/html)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i)
    if (arxivUrlMatch) {
      const rawId = arxivUrlMatch[1].replace(/v[0-9]+$/, '')
      if (!sources.some((s) => s.url.includes(rawId))) {
        sources.push({
          id: 'arxiv-url-pdf',
          label: `arXiv PDF (${rawId})`,
          url: `https://arxiv.org/pdf/${rawId}.pdf`,
        })
        sources.push({
          id: 'arxiv-url-html',
          label: 'arXiv Web View (HTML)',
          url: `https://ar5iv.labs.arxiv.org/html/${rawId}`,
          isHtml: true,
        })
      }
    } else if (paper.url.endsWith('.pdf') || paper.url.includes('.pdf')) {
      if (!sources.some((s) => s.url === paper.url)) {
        sources.push({
          id: 'direct-pdf',
          label: 'Direct PDF Stream',
          url: paper.url,
        })
      }
    }
  }

  // 4. DOI Resolution (arXiv DOI or Universal Publisher Article)
  if (paper.doi) {
    const arxivDoiMatch = paper.doi.match(/(?:arxiv\.|10\.48550\/arXiv\.)([0-9]{4}\.[0-9]{4,5})/i)
    if (arxivDoiMatch) {
      const rawId = arxivDoiMatch[1]
      if (!sources.some((s) => s.url.includes(rawId) && !s.isHtml)) {
        sources.push({
          id: 'arxiv-doi-pdf',
          label: `arXiv PDF (${rawId})`,
          url: `https://arxiv.org/pdf/${rawId}.pdf`,
        })
      }
      if (!sources.some((s) => s.url.includes(rawId) && s.isHtml)) {
        sources.push({
          id: 'arxiv-doi-html',
          label: 'arXiv Web View (HTML)',
          url: `https://ar5iv.labs.arxiv.org/html/${rawId}`,
          isHtml: true,
        })
      }
    } else {
      const cleanDoi = paper.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
      sources.push({
        id: 'publisher-article',
        label: 'Publisher Article View',
        url: `https://doi.org/${cleanDoi}`,
        isHtml: true,
      })
    }
  }

  return sources
}

export function PdfReaderWorkspace({ paper }: PdfReaderWorkspaceProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<SidebarTab>('ai')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [embedEngine, setEmbedEngine] = useState<'stream' | 'gdocs'>('stream')

  // Auto-resolve all initial available PDF and reading sources
  const baseSources = React.useMemo(() => getAutoResolvedPdfSources(paper), [paper])
  const [dynamicSources, setDynamicSources] = useState<{ id: string; label: string; url: string; isHtml?: boolean }[]>([])

  const availableSources = React.useMemo(() => {
    const combined = [...baseSources]
    for (const extra of dynamicSources) {
      if (!combined.some((s) => s.url === extra.url)) {
        combined.unshift(extra) // Place resolved direct PDF at top
      }
    }
    return combined
  }, [baseSources, dynamicSources])

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    availableSources.length > 0 ? availableSources[0].id : ''
  )

  // Background auto-resolver for publisher DOIs & non-arXiv Open Access papers
  useEffect(() => {
    if ((paper.doi || paper.url) && !paper.pdfPath && !paper.arxivId) {
      const query = paper.doi || paper.url || ''
      fetch(`/api/arxiv?id=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.pdfUrl && data.pdfUrl.startsWith('http')) {
            setDynamicSources([
              {
                id: 'oa-resolved-pdf',
                label: 'Direct Open Access PDF',
                url: data.pdfUrl,
              },
            ])
            setSelectedSourceId('oa-resolved-pdf')
          }
        })
        .catch(() => {})
    }
  }, [paper.doi, paper.url, paper.pdfPath, paper.arxivId])

  const activeSource = availableSources.find((s) => s.id === selectedSourceId) || availableSources[0] || null
  const pdfUrl = activeSource ? activeSource.url : ''

  // Compute final iframe URL based on engine mode
  const targetPdfUrl = activeSource ? activeSource.url : pdfUrl
  const finalIframeSrc = React.useMemo(() => {
    if (!targetPdfUrl) return ''
    if (activeSource?.isHtml) return activeSource.url
    if (targetPdfUrl.startsWith('blob:') || targetPdfUrl.startsWith('data:')) {
      return `${targetPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`
    }
    if (targetPdfUrl.startsWith('/uploads/')) {
      return `${targetPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`
    }
    if (embedEngine === 'gdocs' && targetPdfUrl.startsWith('http')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(targetPdfUrl)}&embedded=true`
    }
    if (targetPdfUrl.startsWith('http')) {
      return `/api/proxy/pdf?url=${encodeURIComponent(targetPdfUrl)}#toolbar=1&navpanes=1&scrollbar=1`
    }
    return targetPdfUrl
  }, [targetPdfUrl, activeSource?.isHtml, activeSource?.url, embedEngine])

  const [viewMode, setViewMode] = useState<'pdf' | 'article'>('pdf')
  const [fullTextSections, setFullTextSections] = useState<{ id: string; title: string; sectionType: string; paragraphs: string[] }[]>([])
  const [loadingFullText, setLoadingFullText] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string>('')

  // ─── Local Client-Side Browser Storage (Zero DB, Zero Server Upload) ───
  const clientFileInputRef = useRef<HTMLInputElement>(null)
  const [clientPdfName, setClientPdfName] = useState<string | null>(null)

  // Load client-side browser PDF on mount if previously stored in IndexedDB
  useEffect(() => {
    getClientPdf(paper.id).then((saved) => {
      if (saved) {
        setClientPdfName(saved.name)
        setDynamicSources((prev) => [
          {
            id: 'client-local-pdf',
            label: `Local PDF (${saved.name.slice(0, 18)})`,
            url: saved.blobUrl,
          },
          ...prev.filter((s) => s.id !== 'client-local-pdf'),
        ])
        setSelectedSourceId('client-local-pdf')
      }
    })
  }, [paper.id])

  const handleClientFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      addToast('error', 'Please select a valid PDF file (.pdf).')
      return
    }

    try {
      const { blobUrl, name } = await saveClientPdf(paper.id, file)
      setClientPdfName(name)
      setDynamicSources((prev) => [
        {
          id: 'client-local-pdf',
          label: `Local PDF (${name.slice(0, 18)})`,
          url: blobUrl,
        },
        ...prev.filter((s) => s.id !== 'client-local-pdf'),
      ])
      setSelectedSourceId('client-local-pdf')
      setViewMode('pdf')
      addToast('success', `Opened "${name}" in browser (0 bytes saved to server/database)`)
    } catch {
      addToast('error', 'Failed to load local PDF in browser storage')
    }
  }

  const handleRemoveClientPdf = async () => {
    await removeClientPdf(paper.id)
    setClientPdfName(null)
    setDynamicSources((prev) => prev.filter((s) => s.id !== 'client-local-pdf'))
    if (selectedSourceId === 'client-local-pdf') {
      setSelectedSourceId(availableSources.find((s) => s.id !== 'client-local-pdf')?.id || '')
    }
    addToast('info', 'Removed local browser PDF.')
  }

  // Load structured full-text sections for DOI / PMC / Crossref papers
  useEffect(() => {
    setLoadingFullText(true)
    fetch(`/api/papers/${paper.id}/fulltext`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
          setFullTextSections(data.sections)
          setActiveSectionId(data.sections[0].id)
          // Default to structured article view for non-arXiv DOIs without uploaded local PDF
          if (paper.doi && !paper.pdfPath && !paper.arxivId && !paper.url?.endsWith('.pdf')) {
            setViewMode('article')
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFullText(false))
  }, [paper.id, paper.doi, paper.pdfPath, paper.arxivId, paper.url])

  // ─── Reading Tracker & Session Velocity ───────────────────
  const [readingStatus, setReadingStatus] = useState<string>(paper.status || 'TO_READ')
  const [readingSeconds, setReadingSeconds] = useState<number>(0)
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true)
  const [readingProgress, setReadingProgress] = useState<number>(() => {
    if (paper.status === 'COMPLETED') return 100
    if (paper.status === 'READING') return 45
    return 15
  })
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false)

  // Live session timer
  useEffect(() => {
    if (!isTimerActive) return
    const timer = setInterval(() => {
      setReadingSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isTimerActive])

  // Auto transition to READING status when reader is opened if TO_READ
  useEffect(() => {
    if (paper.status === 'TO_READ') {
      fetch(`/api/papers/${paper.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READING' }),
      })
        .then((res) => {
          if (res.ok) {
            setReadingStatus('READING')
            setReadingProgress(35)
          }
        })
        .catch(() => {})
    }
  }, [paper.id, paper.status])

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setReadingStatus(newStatus)
        if (newStatus === 'COMPLETED') {
          setReadingProgress(100)
          addToast('success', `🎉 Marked as COMPLETED! Reading velocity updated.`)
        } else if (newStatus === 'READING') {
          setReadingProgress(50)
          addToast('info', 'Status set to In-Progress Reading.')
        } else {
          setReadingProgress(10)
          addToast('info', 'Status set to Queued (To Read).')
        }
      } else {
        addToast('error', 'Failed to update reading status')
      }
    } catch {
      addToast('error', 'Network error updating reading status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatReadingTime = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // AI Assistant state
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false)
  const [aiConfig, setAiConfig] = useState<StoredAiConfig>(() => getStoredAiConfig())
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `I am your AI Reading Assistant for **"${paper.title}"**.\n\nPaste any text snippet, equation, or paragraph from the PDF or Full-Text Article to get an instant breakdown, or click a quick prompt below.`,
    },
  ])

  useEffect(() => {
    const handleConfigChange = () => {
      setAiConfig(getStoredAiConfig())
    }
    window.addEventListener('ai-config-changed', handleConfigChange)
    return () => window.removeEventListener('ai-config-changed', handleConfigChange)
  }, [])

  // Highlights & Marginal Discussions state
  const [highlights, setHighlights] = useState<Highlight[]>(paper.highlights || [])
  const [loadingHighlights, setLoadingHighlights] = useState(false)

  const fetchHighlights = useCallback(async () => {
    try {
      setLoadingHighlights(true)
      const res = await fetch(`/api/papers/${paper.id}/highlights?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setHighlights(data)
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingHighlights(false)
    }
  }, [paper.id])

  useEffect(() => {
    fetchHighlights()
  }, [fetchHighlights])

  const handleCreateHighlight = async (data: {
    text: string
    color: HighlightColor
    category: HighlightCategory
    pageNumber: number
    initialComment?: string
  }) => {
    try {
      const res = await fetch(`/api/papers/${paper.id}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const created = await res.json()
        setHighlights((prev) => [created, ...prev])
        setIsSidebarOpen(true)
        setActiveTab('highlights')
        addToast('success', 'Inline highlight & marginal note saved!')
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to save highlight')
      }
    } catch {
      addToast('error', 'Network error saving highlight')
    } finally {
      setSelectionTooltip(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  // Notes & Co-Reading state
  const [notes, setNotes] = useState<Note[]>(paper.notes || [])
  const [newNote, setNewNote] = useState('')
  const [notePage, setNotePage] = useState('')
  const [noteCategory, setNoteCategory] = useState<'takeaway' | 'method' | 'limitation' | 'question' | 'faculty'>(
    isSupervisor ? 'faculty' : 'takeaway'
  )
  const [noteAuthorFilter, setNoteAuthorFilter] = useState<'all' | 'highlights' | 'student' | 'faculty'>('all')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)

  // ─── In-Reader Text Selection & Margin Quotes State ────────
  interface SelectionTooltipState {
    text: string
    sectionTitle: string
    x: number
    y: number
  }

  const [selectionTooltip, setSelectionTooltip] = useState<SelectionTooltipState | null>(null)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Floating highlight actions
  const handleSelectionMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setSelectionTooltip(null)
      return
    }

    const text = sel.toString().trim()
    if (text.length < 3) {
      setSelectionTooltip(null)
      return
    }

    try {
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Find nearest section title if in structured article
      let sectionTitle = ''
      let node: Node | null = range.startContainer
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && node.getAttribute('id')?.startsWith('sec-')) {
          const heading = node.querySelector('h2')
          if (heading) sectionTitle = heading.textContent?.trim() || ''
          break
        }
        node = node.parentNode
      }

      setSelectionTooltip({
        text,
        sectionTitle: sectionTitle || 'Selected Passage',
        x: Math.max(16, rect.left + rect.width / 2),
        y: Math.max(16, rect.top - 8),
      })
    } catch {
      setSelectionTooltip(null)
    }
  }

  const handleQuickHighlight = async (colorName: string, emoji: string) => {
    if (!selectionTooltip?.text) return
    const quote = selectionTooltip.text
    const sec = selectionTooltip.sectionTitle

    const fullContent = `🖍️ **Highlight [${colorName}]** (${sec}):\n> "${quote}"`

    try {
      const res = await fetch(`/api/papers/${paper.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContent }),
      })
      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        addToast('success', `${emoji} Highlight saved to paper notes!`)
      }
    } catch {
      addToast('error', 'Failed to save highlight')
    } finally {
      setSelectionTooltip(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleAddMarginNoteFromSelection = () => {
    if (!selectionTooltip?.text) return
    const quote = selectionTooltip.text
    const sec = selectionTooltip.sectionTitle

    setIsSidebarOpen(true)
    setActiveTab('notes')
    setNotePage(sec)
    setNewNote(`> "${quote}"\n\n`)
    setSelectionTooltip(null)
    window.getSelection()?.removeAllRanges()
    addToast('info', 'Quote attached to note composer')
    setTimeout(() => {
      noteTextareaRef.current?.focus()
    }, 150)
  }

  const handleAskAiFromSelection = () => {
    if (!selectionTooltip?.text) return
    const quote = selectionTooltip.text
    setIsSidebarOpen(true)
    setActiveTab('ai')
    handleSendAi(`Explain this passage and its core insight from the paper in simple terms:\n\n"${quote}"`)
    setSelectionTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleCopyCitationQuote = () => {
    if (!selectionTooltip?.text) return
    const quote = selectionTooltip.text
    const citation = `"${quote}" — ${paper.authors} (${paper.publicationYear || 'n.d.'})`
    navigator.clipboard.writeText(citation)
    addToast('success', 'Quote copied with citation!')
    setSelectionTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  // Survey Matrix state
  const [litReview, setLitReview] = useState<LiteratureReviewData>(() => {
    if (paper.literatureReview) {
      try {
        return typeof paper.literatureReview === 'string'
          ? JSON.parse(paper.literatureReview)
          : paper.literatureReview
      } catch {
        return {}
      }
    }
    return {}
  })
  const [savingSurvey, setSavingSurvey] = useState(false)

  // Quick prompt templates
  const AI_SNIPPETS = [
    { label: '🎯 Consensus Meter', prompt: 'What is the scientific consensus and peer-reviewed evidence agreement regarding this paper core hypothesis and findings?' },
    { label: '🔍 Explain Highlight', prompt: 'Explain this concept and its mathematical intuition in simple terms: ' },
    { label: '🔬 Method Pipeline', prompt: 'What are the key mathematical mechanisms and algorithmic pipeline steps used here?' },
    { label: '⚠️ Critique / Gap', prompt: 'What are the potential weaknesses, unstated assumptions, or limitations of this approach?' },
    { label: '📊 Metric / Result', prompt: 'Summarize the quantitative findings and compare them against baselines.' },
  ]

  const handleSendAi = async (customText?: string) => {
    const query = (customText || aiInput).trim()
    if (!query || aiLoading) return

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    }
    setAiMessages((prev) => [...prev, userMsg])
    setAiInput('')
    setAiLoading(true)

    try {
      const config = getStoredAiConfig()
      const res = await fetch(`/api/papers/${paper.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: aiMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          provider: config.provider,
          apiKey: config.apiKey,
          consensusApiKey: config.consensusApiKey,
          model: config.model,
          activeSection: activeSectionId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const botMsg: AiMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.content,
        }
        setAiMessages((prev) => [...prev, botMsg])
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err?.error || 'Failed to generate AI response')
      }
    } catch {
      addToast('error', 'Network error during AI consultation')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAiResponseAsNote = async (content: string) => {
    try {
      const noteContent = `🤖 **AI Research Insight**:\n\n${content}`
      const res = await fetch(`/api/papers/${paper.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, isPrivate: false }),
      })
      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        addToast('success', 'AI response saved to research notes!')
      } else {
        addToast('error', 'Failed to save note')
      }
    } catch {
      addToast('error', 'Network error saving note')
    }
  }

  // Create note
  const handleCreateNote = async () => {
    if (!newNote.trim() || submittingNote) return
    setSubmittingNote(true)

    const prefix =
      noteCategory === 'faculty'
        ? '🟣 **Faculty Guidance'
        : noteCategory === 'takeaway'
        ? '💡 **Key Takeaway'
        : noteCategory === 'method'
        ? '🔬 **Methodology'
        : noteCategory === 'limitation'
        ? '⚠️ **Limitation'
        : '❓ **Open Question'

    const pageTag = notePage.trim() ? ` (p. ${notePage.trim()})**:\n` : '**:\n'
    const fullContent = `${prefix}${pageTag}${newNote.trim()}`

    try {
      const res = await fetch(`/api/papers/${paper.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContent }),
      })

      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        setNewNote('')
        setNotePage('')
        addToast('success', 'Margin note saved')
      } else {
        addToast('error', 'Failed to save note')
      }
    } catch {
      addToast('error', 'Network error saving note')
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/papers/${paper.id}/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
        addToast('success', 'Note removed')
      }
    } catch {
      addToast('error', 'Failed to delete note')
    }
  }

  const copyNoteText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedNoteId(id)
    addToast('info', 'Note copied')
    setTimeout(() => setCopiedNoteId(null), 1500)
  }

  // Save survey questionnaire changes
  const handleSaveSurvey = async () => {
    setSavingSurvey(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ literatureReview: litReview }),
      })
      if (res.ok) {
        addToast('success', 'Literature review survey saved!')
      } else {
        addToast('error', 'Failed to update survey')
      }
    } catch {
      addToast('error', 'Network error saving survey')
    } finally {
      setSavingSurvey(false)
    }
  }

  return (
    <div
      className={`flex flex-col h-[calc(100vh-80px)] rounded-xl border border-border-default bg-bg-primary overflow-hidden shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none' : ''
      }`}
    >
      {/* Top Action Header - Hidden during Fullscreen */}
      {!isFullscreen && (
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 px-4 py-3 bg-bg-secondary border-b border-border-default shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/papers/${paper.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-default transition-colors shrink-0"
            >
              <ArrowLeft size={13} /> Details
            </Link>

          <div className="truncate">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-accent">Paper workspace</p>
              <h2 className="text-sm font-bold text-text-primary truncate">
                {paper.title}
              </h2>
              <p className="text-[10px] text-text-tertiary truncate">
                {paper.authors} {paper.publicationYear ? `(${paper.publicationYear})` : ''}
              </p>
            </div>
          </div>

          {/* Source Selector & Viewer Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle: PDF vs Full-Text Article */}
            <div className="flex items-center bg-bg-tertiary p-1 rounded-lg border border-border-default text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                  viewMode === 'pdf' ? 'bg-accent text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileText size={13} /> PDF
              </button>
              {fullTextSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('article')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                    viewMode === 'article' ? 'bg-accent text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                <BookOpen size={13} /> Article
                  <span className="ml-0.5 px-1 py-0.2 text-[9px] bg-white/20 rounded font-mono font-bold">
                    {fullTextSections.length}
                  </span>
                </button>
              )}
            </div>

            {/* PDF Source Picker when in PDF Mode */}
            {viewMode === 'pdf' && availableSources.length > 1 && (
              <div className="flex items-center gap-1 bg-bg-tertiary p-1 rounded-lg border border-border-default text-[11px] font-mono">
                {availableSources.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSelectedSourceId(src.id)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      activeSource?.id === src.id
                        ? 'bg-accent text-white font-bold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            )}

            {/* Client-Side Local PDF File Picker (Zero Server & DB Storage) */}
            <input
              type="file"
              ref={clientFileInputRef}
              onChange={handleClientFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => clientFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent border border-border-default hover:border-accent/40 transition-all cursor-pointer"
              title="Open any local PDF file from your device (100% Browser Client Storage, 0 KB Database / Server)"
            >
              <FolderOpen size={13} className="text-accent" />
              <span className="hidden sm:inline">Open Local PDF</span>
            </button>

            {clientPdfName && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-[10px] font-mono text-accent">
                <HardDrive size={11} />
                <span>Browser Storage Only</span>
                <button
                  type="button"
                  onClick={handleRemoveClientPdf}
                  className="hover:text-rose-400 p-0.5 ml-0.5 cursor-pointer"
                  title="Remove client browser PDF"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {pdfUrl && (
              <>
                <a
                  href={activeSource?.url || pdfUrl}
                  target={pdfUrl.startsWith('blob:') ? undefined : '_blank'}
                  rel={pdfUrl.startsWith('blob:') ? undefined : 'noopener noreferrer'}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-bg-tertiary border border-border-default transition-colors flex items-center gap-1 text-xs"
                  title="Open original document in new tab"
                >
                  <ExternalLink size={14} />
                </a>
                <a
                  href={
                    pdfUrl.startsWith('blob:')
                      ? pdfUrl
                      : pdfUrl.startsWith('http') && !pdfUrl.includes('arxiv.org')
                      ? `/api/proxy/pdf?url=${encodeURIComponent(pdfUrl)}`
                      : pdfUrl
                  }
                  download={pdfUrl.startsWith('blob:') ? clientPdfName || 'paper.pdf' : undefined}
                  target={pdfUrl.startsWith('blob:') ? undefined : '_blank'}
                  rel={pdfUrl.startsWith('blob:') ? undefined : 'noopener noreferrer'}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-bg-tertiary border border-border-default transition-colors"
                  title="Download PDF"
                >
                  <Download size={14} />
                </a>
              </>
            )}

            {/* Always Visible Fullscreen Reader Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-bg-tertiary border border-border-default transition-colors cursor-pointer flex items-center justify-center"
              title="Fullscreen Reader"
            >
              <Maximize2 size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
            >
              {isSidebarOpen ? 'Hide workspace' : 'Open workspace'}
            </button>
          </div>
        </div>
      )}

      {/* Reading progress and focused next action */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-bg-secondary/90 border-b border-border-default text-xs shrink-0 z-10">
        {/* Left: Active Session Timer & Streak */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary border border-border-default font-mono">
            <Clock size={13} className="text-accent" />
            <span className="font-bold text-text-primary">{formatReadingTime(readingSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsTimerActive(!isTimerActive)}
              className="ml-1 text-text-tertiary hover:text-text-primary cursor-pointer"
              title={isTimerActive ? 'Pause Session Timer' : 'Resume Session Timer'}
            >
              {isTimerActive ? <Pause size={12} /> : <Play size={12} className="text-success" />}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-text-secondary text-[11px]">
            <Flame size={13} className="text-amber-400" />
            <span>Reading Track Active</span>
          </div>
        </div>

        {/* Center: simple, accessible progress control */}
        <label className="flex items-center gap-2 flex-1 min-w-[180px] max-w-sm text-[11px] text-text-secondary">
          <span className="font-medium whitespace-nowrap">Reading progress</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={readingProgress}
            onChange={(event) => {
              const nextProgress = Number(event.target.value)
              setReadingProgress(nextProgress)
              if (nextProgress === 100 && readingStatus !== 'COMPLETED') {
                handleUpdateStatus('COMPLETED')
              }
            }}
            className="flex-1 accent-accent cursor-pointer"
            aria-label="Reading progress"
          />
          <span className="font-mono text-text-tertiary w-8 text-right">{readingProgress}%</span>
        </label>

        {/* Right: 1-Click Status Transition Button & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          {readingStatus === 'COMPLETED' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-success/15 text-success border border-success/30 font-semibold text-xs">
              <CheckCircle2 size={14} /> Completed
            </div>
          ) : (
            <Button
              size="xs"
              variant="primary"
              onClick={() => handleUpdateStatus(readingStatus === 'TO_READ' ? 'READING' : 'COMPLETED')}
              loading={updatingStatus}
              icon={readingStatus === 'TO_READ' ? <BookOpen size={13} /> : <Trophy size={13} />}
            >
              {readingStatus === 'TO_READ' ? 'Start reading' : 'Mark complete'}
            </Button>
          )}

          {/* Status Dropdown */}
          <select
            value={readingStatus}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            disabled={updatingStatus}
            aria-label="Reading Status"
            className="h-7 px-2 text-[11px] font-medium rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="TO_READ">📖 Queued</option>
            <option value="READING">⚡ Active Reading</option>
            <option value="COMPLETED">✅ Completed</option>
            <option value="ARCHIVED">📦 Archived</option>
          </select>

          {/* Exit Fullscreen Button neatly positioned on the right */}
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-1"
              title="Exit Fullscreen Mode (Esc)"
            >
              <Minimize2 size={13} /> Exit Fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Side: Viewer (PDF or Structured Article) */}
        <div className="flex-1 bg-[var(--reader-canvas)] flex flex-col items-center justify-center min-w-0 relative overflow-hidden">
          {viewMode === 'article' ? (
            /* Structured Article Reader */
            <div className="w-full h-full bg-bg-primary flex min-h-0 overflow-hidden">
              {/* Section Outline Navigator */}
              <div className="w-56 bg-bg-secondary border-r border-border-default p-3 flex flex-col gap-1 overflow-y-auto shrink-0 hidden md:block">
                <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
                  Article Outline
                </div>
                {fullTextSections.map((sec, idx) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`block px-2.5 py-1.5 rounded text-xs truncate transition-colors ${
                      activeSectionId === sec.id
                        ? 'bg-accent/15 text-accent font-semibold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <span className="opacity-60 mr-1.5 font-mono">{idx + 1}.</span>
                    {sec.title}
                  </a>
                ))}
              </div>

              {/* Main Reading Flow */}
              <div
                className="flex-1 p-6 md:p-10 overflow-y-auto space-y-8 max-w-3xl mx-auto select-text"
                onMouseUp={handleSelectionMouseUp}
              >
                <div className="space-y-2 border-b border-border-default pb-6">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-accent/15 text-accent font-mono font-semibold">
                    PMC Open Access Full-Text
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-text-primary font-display leading-snug">
                    {paper.title}
                  </h1>
                  <p className="text-xs text-text-secondary">
                    {paper.authors} {paper.journal ? `· ${paper.journal}` : ''} {paper.publicationYear ? `(${paper.publicationYear})` : ''}
                  </p>
                </div>

                {fullTextSections.map((sec) => (
                  <section key={sec.id} id={sec.id} className="space-y-3 scroll-mt-6">
                    <h2 className="text-base font-bold text-text-primary border-b border-border-default/60 pb-1 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-accent" />
                      {sec.title}
                    </h2>
                    <div className="space-y-3 text-xs md:text-sm text-text-secondary leading-relaxed font-sans">
                      {sec.paragraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="hover:bg-accent/5 p-1.5 rounded transition-colors group relative cursor-text"
                          title="Highlight any text to save margin note or ask AI"
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            /* PDF Document Viewer */
            <div className="w-full h-full flex flex-col relative">
              {activeSource && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-bg-primary/90 backdrop-blur-md px-3 py-1 rounded-md text-[11px] text-text-secondary border border-border-default shadow-md pointer-events-auto">
                  <span className="font-medium text-text-primary">{activeSource.label}</span>
                  {!activeSource.isHtml && targetPdfUrl.startsWith('http') && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setEmbedEngine(embedEngine === 'stream' ? 'gdocs' : 'stream')}
                        className="text-accent hover:underline font-mono text-[10px] cursor-pointer"
                        title="Click if PDF is blank or blocked by browser settings"
                      >
                        {embedEngine === 'stream' ? 'Switch to Cloud Viewer' : 'Switch to Native Stream'}
                      </button>
                    </>
                  )}
                  <span>·</span>
                  <a
                    href={activeSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline flex items-center gap-0.5"
                  >
                    Open Original Link <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {activeSource?.id === 'publisher-article' ? (
                /* Dedicated Publisher Article Portal View (Bypasses X-Frame-Options blocking) */
                <div
                  className="w-full h-full bg-bg-primary overflow-y-auto p-6 md:p-10 flex flex-col justify-start max-w-4xl mx-auto space-y-6 select-text"
                  onMouseUp={handleSelectionMouseUp}
                >
                  {/* Publisher Portal Header Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-secondary via-bg-tertiary/60 to-bg-secondary border border-border-default shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-bold">
                          <Globe size={19} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider font-mono text-accent">
                              Publisher Publication Portal
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Official Publisher Article
                            </span>
                          </div>
                          <p className="text-[11px] text-text-tertiary">
                            {paper.journal || 'Peer-Reviewed Journal / Conference'} {paper.publicationYear ? `· ${paper.publicationYear}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* DOI Copy / Link Badge */}
                      {paper.doi && (
                        <div className="flex items-center gap-1.5 bg-bg-primary px-3 py-1.5 rounded-lg border border-border-default text-xs font-mono">
                          <span className="text-text-tertiary">DOI:</span>
                          <span className="text-text-primary font-medium">{paper.doi.replace(/^https?:\/\/doi\.org\//i, '')}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://doi.org/${paper.doi?.replace(/^https?:\/\/doi\.org\//i, '')}`)
                              addToast('success', 'DOI URL copied to clipboard!')
                            }}
                            className="text-text-tertiary hover:text-accent ml-1 p-0.5 cursor-pointer"
                            title="Copy DOI URL"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h1 className="text-lg md:text-xl font-bold text-text-primary font-display leading-snug">
                        {paper.title}
                      </h1>
                      <p className="text-xs text-text-secondary">
                        {paper.authors}
                      </p>
                    </div>

                    {/* Main Action CTAs */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={activeSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover shadow-lg hover:shadow-accent/25 transition-all cursor-pointer"
                      >
                        <ExternalLink size={15} /> Open in Official Publisher Portal ↗
                      </a>

                      {fullTextSections.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setViewMode('article')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-tertiary text-text-primary border border-border-default font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <BookOpen size={15} className="text-accent" /> Read Structured Article ({fullTextSections.length} Sections)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => clientFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-tertiary text-text-primary border border-border-default font-semibold text-xs transition-colors cursor-pointer"
                        title="Open any local PDF from your device without saving it to the server database"
                      >
                        <FolderOpen size={15} className="text-accent" /> Open Local Client PDF (Browser-Only)
                      </button>

                      {dynamicSources.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSourceId(dynamicSources[0].id)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <FileText size={15} /> Open Direct Open Access PDF
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Abstract Section with Highlight-to-Ask and Notes */}
                  {paper.abstract && (
                    <div className="p-6 rounded-2xl bg-bg-secondary border border-border-default space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-accent flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          Executive Abstract
                        </h3>
                        <span className="text-[10px] text-text-tertiary">Select any text to highlight or Ask AI</span>
                      </div>
                      <p className="text-xs md:text-sm text-text-primary leading-relaxed hover:bg-accent/5 p-2 rounded transition-colors cursor-text font-sans">
                        {paper.abstract}
                      </p>
                    </div>
                  )}

                  {/* Key Contributions & Problem Solved */}
                  {(paper.problemSolved || paper.keyContribution) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paper.problemSolved && (
                        <div className="p-5 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                          <h4 className="text-xs font-bold text-accent uppercase font-mono tracking-wider">
                            Research Problem & Formulation
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {paper.problemSolved}
                          </p>
                        </div>
                      )}
                      {paper.keyContribution && (
                        <div className="p-5 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono tracking-wider">
                            Key Findings & Benchmark Results
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {paper.keyContribution}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata Details Grid */}
                  <div className="p-5 rounded-xl bg-bg-secondary/60 border border-border-default grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-text-tertiary block">Publisher / Journal</span>
                      <span className="font-semibold text-text-primary truncate block">{paper.journal || 'Official Journal'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-text-tertiary block">Publication Year</span>
                      <span className="font-semibold text-text-primary">{paper.publicationYear || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-text-tertiary block">Total Citations</span>
                      <span className="font-semibold text-text-primary">{paper.citationCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-text-tertiary block">Open Access</span>
                      <span className="font-semibold text-emerald-400">Indexed</span>
                    </div>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={finalIframeSrc}
                  className={`w-full h-full border-none ${activeSource?.isHtml ? 'bg-white' : ''}`}
                  title="Paper Reader"
                />
              ) : (
                <div className="p-8 text-center text-text-tertiary space-y-3 m-auto">
                  <FileText size={48} className="mx-auto opacity-30 text-accent" />
                  <h3 className="text-sm font-semibold text-text-primary">No PDF Source Attached</h3>
                  <p className="text-xs max-w-sm mx-auto">
                    Open any local PDF file from your device (100% browser-only storage), or read the structured full-text article.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => clientFileInputRef.current?.click()}
                      className="flex items-center gap-1.5"
                    >
                      <FolderOpen size={14} className="text-accent" /> Open Local Client PDF (Browser-Only)
                    </Button>
                    {fullTextSections.length > 0 && (
                      <Button size="sm" variant="primary" onClick={() => setViewMode('article')}>
                        Read Full-Text Article ({fullTextSections.length} Sections)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Collapsible Research Workspace */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:relative md:inset-auto md:w-[420px] md:max-w-[45%] flex flex-col bg-bg-secondary border-l border-border-default shrink-0 shadow-2xl md:shadow-lg animate-slide-in min-h-0">
            {/* Mobile Header Bar with Close Button */}
            <div className="md:hidden flex items-center justify-between p-3.5 border-b border-border-default bg-bg-tertiary shrink-0">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                {activeTab === 'ai' ? (
                  <>
                    <Bot size={14} className="text-accent" /> AI Research Assistant
                  </>
                ) : activeTab === 'notes' ? (
                  <>
                    <MessageSquare size={14} className="text-amber-400" /> Margin Notes &amp; Highlights ({notes.length})
                  </>
                ) : (
                  <>
                    <FileCheck size={14} className="text-purple-400" /> Literature Review Survey
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-bg-elevated text-text-primary border border-border-default cursor-pointer flex items-center gap-1"
              >
                <X size={13} /> Close
              </button>
            </div>

            {/* Sidebar Tabs */}
            <div className="flex items-center border-b border-border-default bg-bg-tertiary text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Bot size={13} /> AI
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('highlights')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'highlights'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Highlighter size={13} className="text-yellow-400" /> Highlights ({highlights.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <MessageSquare size={13} className="text-amber-400" /> Notes ({notes.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('survey')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'survey'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileCheck size={13} className="text-purple-400" /> Q1–Q9
              </button>
            </div>

            {/* TAB: Marginal Highlights & Threaded Discussions */}
            {activeTab === 'highlights' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0 overflow-hidden">
                <HighlightMarginPanel
                  paperId={paper.id}
                  highlights={highlights}
                  onRefresh={fetchHighlights}
                />
              </div>
            )}

            {/* TAB 1: AI Reading Assistant */}
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0 overflow-hidden">
                {/* AI Engine Status & Settings Header */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border-default shrink-0 text-[11px]">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Sparkles size={13} className="text-accent shrink-0" />
                    <span className="font-mono font-medium text-text-primary truncate">
                      {aiConfig.provider.toUpperCase()} ({aiConfig.model})
                    </span>
                    {aiConfig.apiKey ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono shrink-0">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono shrink-0">
                        Free Tier
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiConfigOpen(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-text-secondary hover:text-accent hover:bg-bg-elevated transition-colors cursor-pointer font-mono shrink-0"
                    title="Change AI provider or API key"
                  >
                    <Settings size={12} />
                    <span>AI Settings</span>
                  </button>
                </div>

                {/* Prompt Snippet Pills */}
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {AI_SNIPPETS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleSendAi(s.prompt)}
                      disabled={aiLoading}
                      className="px-2 py-1 rounded-md text-[11px] bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent border border-border-default transition-all font-medium cursor-pointer disabled:opacity-50"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Chat Stream Box */}
                <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-xl bg-bg-primary/90 border border-border-default text-xs">
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl space-y-1 ${
                        msg.role === 'user'
                          ? 'bg-accent text-white font-medium ml-4'
                          : 'bg-bg-tertiary text-text-primary border border-border-default mr-2'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-70 font-mono">
                        <span>{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                      </div>
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}

                      {/* Actions for Assistant Messages */}
                      {msg.role === 'assistant' && msg.id !== 'welcome' && (
                        <div className="pt-2 mt-2 border-t border-border-default/50 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSaveAiResponseAsNote(msg.content)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated text-accent hover:bg-accent hover:text-white transition-all cursor-pointer font-medium"
                          >
                            <Save size={12} /> Save to Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content)
                              addToast('success', 'AI response copied to clipboard!')
                            }}
                            className="text-text-tertiary hover:text-text-primary p-1 cursor-pointer"
                            title="Copy response"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-secondary flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                      <span>Analyzing research paper &amp; generating synthesis...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-1.5 shrink-0 pt-1">
                  <input
                    placeholder="Ask about equation, method, or paste snippet..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSendAi()
                      }
                    }}
                    className="flex-1 h-9 px-3 text-xs rounded-lg bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleSendAi()}
                    loading={aiLoading}
                    icon={<Send size={13} />}
                  >
                    Ask
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Margin Notes & Highlights Timeline */}
            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0 overflow-y-auto">
                {/* Note Composer */}
                <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default space-y-2 shrink-0">
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    {(isSupervisor || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setNoteCategory('faculty')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          noteCategory === 'faculty' ? 'bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30' : 'text-purple-400/70 hover:text-purple-400'
                        }`}
                      >
                        🟣 Faculty Guidance
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNoteCategory('takeaway')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        noteCategory === 'takeaway' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      💡 Takeaway
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteCategory('method')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        noteCategory === 'method' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      🔬 Method
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteCategory('limitation')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        noteCategory === 'limitation' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      ⚠️ Limitation
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteCategory('question')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        noteCategory === 'question' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      ❓ Question
                    </button>
                  </div>

                  <Textarea
                    ref={noteTextareaRef}
                    placeholder={
                      noteCategory === 'faculty'
                        ? 'Write supervisor advice, recommendation, or thesis guidance...'
                        : 'Write a margin note, quote, or research observation...'
                    }
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Section / Page"
                      value={notePage}
                      onChange={(e) => setNotePage(e.target.value)}
                      className="w-28 h-7 px-2 text-[11px] rounded bg-bg-primary border border-border-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                    />

                    <Button
                      size="xs"
                      variant="primary"
                      onClick={handleCreateNote}
                      loading={submittingNote}
                      disabled={!newNote.trim()}
                      icon={<Plus size={12} />}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>

                {/* Co-Reading & Highlight Filter Pills */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] border-b border-border-default pb-2">
                  <button
                    onClick={() => setNoteAuthorFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'all' ? 'bg-accent/20 text-accent font-bold' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    All ({notes.length})
                  </button>
                  <button
                    onClick={() => setNoteAuthorFilter('highlights')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer flex items-center gap-1 ${
                      noteAuthorFilter === 'highlights' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    <Highlighter size={11} className="text-amber-400" /> Highlights (
                    {notes.filter((n) => n.content.includes('Highlight') || n.content.includes('> "')).length})
                  </button>
                  <button
                    onClick={() => setNoteAuthorFilter('student')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'student' ? 'bg-accent/20 text-accent font-bold' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Student ({notes.filter((n) => !n.content.includes('Faculty Guidance')).length})
                  </button>
                  <button
                    onClick={() => setNoteAuthorFilter('faculty')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'faculty' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-text-tertiary hover:text-purple-400'
                    }`}
                  >
                    🟣 Faculty ({notes.filter((n) => n.content.includes('Faculty Guidance')).length})
                  </button>
                </div>

                {/* Notes & Highlights List */}
                <div className="space-y-2.5 flex-1">
                  {notes.filter((n) => {
                    if (noteAuthorFilter === 'highlights') return n.content.includes('Highlight') || n.content.includes('> "')
                    if (noteAuthorFilter === 'student') return !n.content.includes('Faculty Guidance')
                    if (noteAuthorFilter === 'faculty') return n.content.includes('Faculty Guidance')
                    return true
                  }).length === 0 ? (
                    <div className="text-center py-8 text-text-tertiary text-xs">
                      No notes or highlights found in this filter.
                    </div>
                  ) : (
                    notes
                      .filter((n) => {
                        if (noteAuthorFilter === 'highlights') return n.content.includes('Highlight') || n.content.includes('> "')
                        if (noteAuthorFilter === 'student') return !n.content.includes('Faculty Guidance')
                        if (noteAuthorFilter === 'faculty') return n.content.includes('Faculty Guidance')
                        return true
                      })
                      .map((note) => {
                        const isFacultyNote = note.user?.systemRole === 'SUPERVISOR' || note.content.includes('Faculty Guidance')
                        const isHighlight = note.content.includes('Highlight') || note.content.includes('> "')

                        return (
                          <div
                            key={note.id}
                            className={`p-3 rounded-xl border text-xs space-y-2 group transition-all ${
                              isFacultyNote
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                                : isHighlight
                                ? 'bg-amber-500/5 border-amber-500/30 text-text-primary'
                                : 'bg-bg-primary border-border-default'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  isFacultyNote
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : isHighlight
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-accent/10 text-accent'
                                }`}
                              >
                                {isFacultyNote ? (
                                  '🟣 Faculty Direction'
                                ) : isHighlight ? (
                                  <>
                                    <Highlighter size={10} /> Margin Quote
                                  </>
                                ) : (
                                  '💡 Research Note'
                                )}
                              </span>
                            </div>

                            <div className="leading-relaxed text-xs">
                              <MarkdownRenderer content={note.content} />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-1 border-t border-border-default/40">
                              <span>
                                {note.user?.name || 'Researcher'} · {new Date(note.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => copyNoteText(note.id, note.content)}
                                  className="p-1 text-text-tertiary hover:text-text-primary cursor-pointer"
                                  title="Copy Note"
                                >
                                  {copiedNoteId === note.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                                </button>
                                {note.userId === user?.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1 text-text-tertiary hover:text-danger cursor-pointer"
                                    title="Delete Note"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Survey Matrix Quick-Fill */}
            {activeTab === 'survey' && (
              <div className="flex-1 flex flex-col p-4 space-y-3.5 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border-default pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">
                      Structured Literature Matrix (Q1–Q9)
                    </h4>
                    <p className="text-[10px] text-text-tertiary">
                      Live extraction and paper synthesis matrix for your research lab.
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={handleSaveSurvey}
                    loading={savingSurvey}
                    icon={<Save size={12} />}
                  >
                    Save Matrix
                  </Button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* General Meta Fields */}
                  <div className="grid grid-cols-1 gap-2 p-2.5 rounded-xl bg-bg-primary border border-border-default">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Assigned Reviewer
                      </label>
                      <input
                        value={litReview.assignedPerson || ''}
                        onChange={(e) => setLitReview({ ...litReview, assignedPerson: e.target.value })}
                        placeholder="e.g. Dr. Alex Morgan / Student Researcher"
                        className="w-full h-7 px-2.5 rounded bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Research Gap &amp; Primary Motivation
                      </label>
                      <textarea
                        value={litReview.researchGap || ''}
                        onChange={(e) => setLitReview({ ...litReview, researchGap: e.target.value })}
                        placeholder="Core unaddressed problem or gap in literature..."
                        rows={2}
                        className="w-full p-2 rounded bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Serial Q1 to Q9 Structured Questionnaire */}
                  {[
                    {
                      key: 'q1ProblemImportance',
                      num: 'Q1',
                      fullQuestion: 'What problem do the authors address and why is it important?',
                      placeholder: 'Describe the core motivation, scientific/industrial significance, and main bottleneck...',
                    },
                    {
                      key: 'q2DataDetails',
                      num: 'Q2',
                      fullQuestion: 'What data is used (source, size, timeframe, splits, collection process, ethics or consent)?',
                      placeholder: 'Detail dataset provenance, training/test splits, token counts, curation process, consent...',
                    },
                    {
                      key: 'q3FeaturesInputs',
                      num: 'Q3',
                      fullQuestion: 'What features or inputs are used, and how were they selected or engineered?',
                      placeholder: 'Specify token representations, embeddings, modalities, pre-processing filters...',
                    },
                    {
                      key: 'q4MethodsPipeline',
                      num: 'Q4',
                      fullQuestion: 'What methods or models are applied, and what is the overall pipeline?',
                      placeholder: 'Explain core algorithmic mechanisms, model architecture, loss formulation, optimization...',
                    },
                    {
                      key: 'q5Baselines',
                      num: 'Q5',
                      fullQuestion: 'What baselines are used for comparison, and why were they chosen?',
                      placeholder: 'List standard SOTA baselines compared against and rationale for selection...',
                    },
                    {
                      key: 'q6Evaluation',
                      num: 'Q6',
                      fullQuestion: 'How is performance evaluated (metrics, experimental setup, statistical tests, user studies if applicable)?',
                      placeholder: 'Describe benchmarks, evaluation metrics (accuracy, BLEU, latency), statistical tests...',
                    },
                    {
                      key: 'q7KeyResults',
                      num: 'Q7',
                      fullQuestion: 'What are the key results with numbers, and how do they compare to baselines or prior work?',
                      placeholder: 'State numerical findings, percentage improvements over baselines, headline scores...',
                    },
                    {
                      key: 'q8LimitationsBiases',
                      num: 'Q8',
                      fullQuestion: 'What are the limitations and potential biases?',
                      placeholder: 'Discuss computational cost, memory footprint, data bias, failure modes, degradation...',
                    },
                    {
                      key: 'q9ArtifactsReplication',
                      num: 'Q9',
                      fullQuestion: 'Is code, data, or other artifacts available to enable replication?',
                      placeholder: 'Document links to open-source GitHub repositories, model weights, training scripts...',
                    },
                  ].map((q) => {
                    const answerObj = (litReview[q.key as keyof LiteratureReviewData] as any) || {}
                    const detailedText = typeof answerObj === 'string' ? answerObj : answerObj?.detailedAnswer || ''
                    const summaryText = typeof answerObj === 'object' ? answerObj?.shortSummary || '' : ''

                    return (
                      <div
                        key={q.key}
                        className="p-3 rounded-xl bg-bg-primary border border-border-default hover:border-accent/40 transition-colors space-y-2"
                      >
                        <label className="text-[11px] font-semibold text-text-primary flex items-start gap-2 leading-snug">
                          <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-mono text-[10px] font-bold shrink-0 mt-0.5">
                            {q.num}
                          </span>
                          <span className="flex-1 text-text-primary">{q.fullQuestion}</span>
                        </label>
                        
                        <textarea
                          value={detailedText}
                          onChange={(e) =>
                            setLitReview({
                              ...litReview,
                              [q.key]: {
                                ...(typeof answerObj === 'object' ? answerObj : {}),
                                detailedAnswer: e.target.value,
                                shortSummary: summaryText,
                              },
                            })
                          }
                          placeholder={q.placeholder}
                          rows={2}
                          className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent resize-y"
                        />
                      </div>
                    )
                  })}

                  {/* Final Verdict & OutCome */}
                  <div className="p-3 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                    <label className="text-[11px] font-bold text-text-primary block">
                      Final Outcome &amp; Lab Recommendation
                    </label>
                    <textarea
                      value={litReview.outcome || ''}
                      onChange={(e) => setLitReview({ ...litReview, outcome: e.target.value })}
                      placeholder="Overall takeaway, lab adoption recommendation, or thesis relevance..."
                      rows={2}
                      className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Selection Pop-over Highlighter & Margin Quotes Toolbar */}
      {selectionTooltip && (
        <HighlightFloatingToolbar
          selectedText={selectionTooltip.text}
          position={{ x: selectionTooltip.x, y: selectionTooltip.y }}
          onHighlight={handleCreateHighlight}
          onClose={() => setSelectionTooltip(null)}
        />
      )}

      {/* Mobile Floating Action Tray (when workspace drawer is closed) */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-bg-secondary/95 backdrop-blur-md border border-border-default rounded-2xl shadow-2xl p-1.5 flex items-center justify-around gap-1 text-xs animate-slide-in">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ai')
              setIsSidebarOpen(true)
            }}
            className="flex-1 py-2 px-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated flex items-center justify-center gap-1 font-semibold text-accent cursor-pointer transition-all shadow-sm text-[11px]"
          >
            <Bot size={14} /> AI
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('highlights')
              setIsSidebarOpen(true)
            }}
            className="flex-1 py-2 px-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated flex items-center justify-center gap-1 font-semibold text-yellow-300 cursor-pointer transition-all shadow-sm text-[11px]"
          >
            <Highlighter size={14} /> Highlights ({highlights.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('notes')
              setIsSidebarOpen(true)
            }}
            className="flex-1 py-2 px-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated flex items-center justify-center gap-1 font-semibold text-text-primary cursor-pointer transition-all shadow-sm text-[11px]"
          >
            <MessageSquare size={14} className="text-amber-400" /> Notes ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('survey')
              setIsSidebarOpen(true)
            }}
            className="flex-1 py-2 px-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated flex items-center justify-center gap-1 font-semibold text-text-primary cursor-pointer transition-all shadow-sm text-[11px]"
          >
            <FileCheck size={14} className="text-purple-400" /> Survey
          </button>
        </div>
      )}
      {/* AI Key & Provider Configuration Modal */}
      <AiConfigModal isOpen={isAiConfigOpen} onClose={() => setIsAiConfigOpen(false)} />
    </div>
  )
}
