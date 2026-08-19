'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import type { Paper, Note, LiteratureReviewData, QuestionAnswer } from '@/lib/types'

interface PdfReaderWorkspaceProps {
  paper: Paper
}

type SidebarTab = 'ai' | 'notes' | 'survey'

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
    if (arxivDoiMatch && !sources.some((s) => s.url.includes(arxivDoiMatch[1]))) {
      const rawId = arxivDoiMatch[1]
      sources.push({
        id: 'arxiv-doi-pdf',
        label: `arXiv PDF (${rawId})`,
        url: `https://arxiv.org/pdf/${rawId}.pdf`,
      })
    }

    const cleanDoi = paper.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
    sources.push({
      id: 'publisher-article',
      label: 'Publisher Article View',
      url: `https://doi.org/${cleanDoi}`,
      isHtml: true,
    })
  }

  return sources
}

export function PdfReaderWorkspace({ paper }: PdfReaderWorkspaceProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<SidebarTab>('ai')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // AI Assistant state
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `I am your AI Reading Assistant for **"${paper.title}"**.\n\nPaste any text snippet, equation, or paragraph from the PDF to get an instant breakdown, or click a quick prompt below.`,
    },
  ])

  // Notes & Co-Reading state
  const [notes, setNotes] = useState<Note[]>(paper.notes || [])
  const [newNote, setNewNote] = useState('')
  const [notePage, setNotePage] = useState('')
  const [noteCategory, setNoteCategory] = useState<'takeaway' | 'method' | 'limitation' | 'question' | 'faculty'>(
    isSupervisor ? 'faculty' : 'takeaway'
  )
  const [noteAuthorFilter, setNoteAuthorFilter] = useState<'all' | 'student' | 'faculty'>('all')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)

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
      const res = await fetch(`/api/papers/${paper.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
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
        addToast('error', 'Failed to generate AI response')
      }
    } catch {
      addToast('error', 'Network error during AI consultation')
    } finally {
      setAiLoading(false)
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
      {/* Top Action Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-secondary border-b border-border-default shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/papers/${paper.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-default transition-colors shrink-0"
          >
            <ArrowLeft size={13} /> Paper Details
          </Link>

          <div className="truncate">
            <h2 className="text-xs font-bold text-text-primary truncate">
              {paper.title}
            </h2>
            <p className="text-[10px] text-text-tertiary truncate">
              {paper.authors} {paper.publicationYear ? `(${paper.publicationYear})` : ''}
            </p>
          </div>
        </div>

        {/* Source Selector & Viewer Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PDF Source Picker */}
          {availableSources.length > 0 && (
            <div className="flex items-center gap-1 bg-bg-tertiary p-1 rounded-lg border border-border-default text-[11px] font-mono">
              {availableSources.map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setSelectedSourceId(src.id)}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
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

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-bg-tertiary border border-border-default transition-colors"
              title="Open in new tab / download"
            >
              <Download size={14} />
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-bg-tertiary border border-border-default transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reader'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
          >
            {isSidebarOpen ? 'Hide Assistant' : 'Show Assistant'}
          </button>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Side: PDF Viewer */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center min-w-0 relative">
          {pdfUrl ? (
            <iframe
              src={
                activeSource?.isHtml
                  ? pdfUrl
                  : pdfUrl.includes('#')
                  ? pdfUrl
                  : `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`
              }
              className={`w-full h-full border-none ${activeSource?.isHtml ? 'bg-white' : ''}`}
              title="Paper Reader"
            />
          ) : (
            <div className="p-8 text-center text-text-tertiary space-y-3">
              <FileText size={48} className="mx-auto opacity-30 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">No PDF Source Available</h3>
              <p className="text-xs max-w-sm mx-auto">
                Attach a PDF file on the paper detail page or provide an ArXiv ID / DOI link to read full text directly here.
              </p>
              <Link href={`/papers/${paper.id}`}>
                <Button size="sm" variant="primary">
                  Go to Paper Details &amp; Attach Source
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right Side: Collapsible Research Workspace */}
        {isSidebarOpen && (
          <div className="w-[420px] max-w-[45%] flex flex-col bg-bg-secondary border-l border-border-default shrink-0 shadow-lg animate-slide-in">
            {/* Sidebar Tabs */}
            <div className="flex items-center border-b border-border-default bg-bg-tertiary text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Bot size={14} /> AI Assistant
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <MessageSquare size={14} /> Notes ({notes.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('survey')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'survey'
                    ? 'border-accent text-accent bg-bg-secondary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileCheck size={14} /> Survey Q1–Q9
              </button>
            </div>

            {/* TAB 1: AI Reading Assistant */}
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0 overflow-hidden">
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
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-secondary flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                      <span>Analyzing PDF text...</span>
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
                    placeholder={
                      noteCategory === 'faculty'
                        ? 'Write supervisor advice, recommendation, or thesis guidance...'
                        : 'Write a margin note, quote, or research observation...'
                    }
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Page (e.g. 4)"
                      value={notePage}
                      onChange={(e) => setNotePage(e.target.value)}
                      className="w-24 h-7 px-2 text-[11px] rounded bg-bg-primary border border-border-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                    />

                    <Button
                      size="xs"
                      variant="primary"
                      onClick={handleCreateNote}
                      loading={submittingNote}
                      disabled={!newNote.trim()}
                      icon={<Plus size={12} />}
                    >
                      Save Margin Note
                    </Button>
                  </div>
                </div>

                {/* Co-Reading Filter Pills */}
                <div className="flex items-center gap-1 text-[11px] border-b border-border-default pb-2">
                  <button
                    onClick={() => setNoteAuthorFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'all' ? 'bg-accent/20 text-accent font-bold' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    All ({notes.length})
                  </button>
                  <button
                    onClick={() => setNoteAuthorFilter('student')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'student' ? 'bg-accent/20 text-accent font-bold' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Student Insights ({notes.filter((n) => !n.content.includes('Faculty Guidance')).length})
                  </button>
                  <button
                    onClick={() => setNoteAuthorFilter('faculty')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      noteAuthorFilter === 'faculty' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-text-tertiary hover:text-purple-400'
                    }`}
                  >
                    🟣 Faculty Guidance ({notes.filter((n) => n.content.includes('Faculty Guidance')).length})
                  </button>
                </div>

                {/* Notes List */}
                <div className="space-y-2.5 flex-1">
                  {notes.filter((n) => {
                    if (noteAuthorFilter === 'student') return !n.content.includes('Faculty Guidance')
                    if (noteAuthorFilter === 'faculty') return n.content.includes('Faculty Guidance')
                    return true
                  }).length === 0 ? (
                    <div className="text-center py-8 text-text-tertiary text-xs">
                      No notes found in this category.
                    </div>
                  ) : (
                    notes
                      .filter((n) => {
                        if (noteAuthorFilter === 'student') return !n.content.includes('Faculty Guidance')
                        if (noteAuthorFilter === 'faculty') return n.content.includes('Faculty Guidance')
                        return true
                      })
                      .map((note) => {
                        const isFacultyNote = note.content.includes('Faculty Guidance')

                        return (
                          <div
                            key={note.id}
                            className={`p-3 rounded-xl border text-xs space-y-2 group transition-all ${
                              isFacultyNote
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                                : 'bg-bg-primary border-border-default'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  isFacultyNote ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/10 text-amber-300'
                                }`}
                              >
                                {isFacultyNote ? '🟣 Faculty Direction' : '💡 Student Insight'}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-1 border-t border-border-default/40">
                              <span>
                                {new Date(note.createdAt).toLocaleDateString([], {
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
                                  className="p-1 text-text-tertiary hover:text-text-primary"
                                  title="Copy"
                                >
                                  {copiedNoteId === note.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 text-text-tertiary hover:text-danger"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
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
              <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border-default pb-2">
                  <h4 className="text-xs font-bold text-text-primary">
                    Live Survey Matrix Quick-Fill
                  </h4>
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
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Assigned Reviewer *
                    </label>
                    <input
                      value={litReview.assignedPerson || ''}
                      onChange={(e) => setLitReview({ ...litReview, assignedPerson: e.target.value })}
                      placeholder="e.g. Dr. Alex Morgan"
                      className="w-full h-8 px-2.5 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Research Gap *
                    </label>
                    <textarea
                      value={litReview.researchGap || ''}
                      onChange={(e) => setLitReview({ ...litReview, researchGap: e.target.value })}
                      placeholder="Identified research gap..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Q1: Problem &amp; Importance *
                    </label>
                    <textarea
                      value={litReview.q1ProblemImportance?.detailedAnswer || ''}
                      onChange={(e) =>
                        setLitReview({
                          ...litReview,
                          q1ProblemImportance: {
                            detailedAnswer: e.target.value,
                            shortSummary: litReview.q1ProblemImportance?.shortSummary || '',
                          },
                        })
                      }
                      placeholder="Q1 Detailed response..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Q4: Methods &amp; Pipeline *
                    </label>
                    <textarea
                      value={litReview.q4MethodsPipeline?.detailedAnswer || ''}
                      onChange={(e) =>
                        setLitReview({
                          ...litReview,
                          q4MethodsPipeline: {
                            detailedAnswer: e.target.value,
                            shortSummary: litReview.q4MethodsPipeline?.shortSummary || '',
                          },
                        })
                      }
                      placeholder="Q4 Detailed response..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Q7: Key Results &amp; Numbers *
                    </label>
                    <textarea
                      value={litReview.q7KeyResults?.detailedAnswer || ''}
                      onChange={(e) =>
                        setLitReview({
                          ...litReview,
                          q7KeyResults: {
                            detailedAnswer: e.target.value,
                            shortSummary: litReview.q7KeyResults?.shortSummary || '',
                          },
                        })
                      }
                      placeholder="Q7 Detailed response..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Q8: Limitations &amp; Biases *
                    </label>
                    <textarea
                      value={litReview.q8LimitationsBiases?.detailedAnswer || ''}
                      onChange={(e) =>
                        setLitReview({
                          ...litReview,
                          q8LimitationsBiases: {
                            detailedAnswer: e.target.value,
                            shortSummary: litReview.q8LimitationsBiases?.shortSummary || '',
                          },
                        })
                      }
                      placeholder="Q8 Detailed response..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Final OutCome *
                    </label>
                    <textarea
                      value={litReview.outcome || ''}
                      onChange={(e) => setLitReview({ ...litReview, outcome: e.target.value })}
                      placeholder="Final OutCome verdict..."
                      rows={2}
                      className="w-full p-2 rounded bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
