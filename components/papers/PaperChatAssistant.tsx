'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Cpu,
  BarChart3,
  AlertTriangle,
  FileCode,
  GitBranch,
  Bot,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AiConfigModal, getStoredAiConfig, StoredAiConfig } from '@/components/reader/AiConfigModal'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface PaperChatAssistantProps {
  paperId: string
  paperTitle: string
}

const PROMPT_PRESETS = [
  {
    label: '🎯 Scientific Consensus',
    prompt: 'What is the scientific consensus and peer-reviewed evidence agreement regarding this paper core hypothesis and findings?',
    icon: Target,
  },
  {
    label: '🔬 Explain Architecture',
    prompt: 'Explain the core architecture, model pipeline, and novel algorithmic mechanism in detail.',
    icon: Cpu,
  },
  {
    label: '📊 Benchmark Scores',
    prompt: 'What are the key benchmark results, exact numbers, and baseline comparisons?',
    icon: BarChart3,
  },
  {
    label: '⚠️ Limitations & Gaps',
    prompt: 'What are the main limitations, unaddressed research gaps, and compute scaling costs?',
    icon: AlertTriangle,
  },
  {
    label: '📝 BibTeX & Citation',
    prompt: 'Generate the complete BibTeX entry and APA citation for this paper.',
    icon: FileCode,
  },
  {
    label: '🧪 Replication & Code',
    prompt: 'What code repositories, weights, and replication artifacts are available?',
    icon: GitBranch,
  },
]

export function PaperChatAssistant({ paperId, paperTitle }: PaperChatAssistantProps) {
  const { addToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your AI Research Assistant grounded directly in **"${paperTitle}"**.\n\nAsk me anything about the methodology, benchmark tables, limitations, literature review questionnaire answers, or click a quick prompt below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false)
  const [aiConfig, setAiConfig] = useState<StoredAiConfig>(() => getStoredAiConfig())
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleConfigChange = () => {
      setAiConfig(getStoredAiConfig())
    }
    window.addEventListener('ai-config-changed', handleConfigChange)
    return () => window.removeEventListener('ai-config-changed', handleConfigChange)
  }, [])

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const config = getStoredAiConfig()
      const res = await fetch(`/api/papers/${paperId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          provider: config.provider,
          apiKey: config.apiKey,
          consensusApiKey: config.consensusApiKey,
          model: config.model,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botMsg])
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err?.error || 'Failed to generate answer')
      }
    } catch {
      addToast('error', 'Network error during chat')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsNote = async (content: string) => {
    try {
      const noteContent = `🤖 **AI Research Synthesis**:\n\n${content}`
      const res = await fetch(`/api/papers/${paperId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, isPrivate: false }),
      })
      if (res.ok) {
        addToast('success', 'AI synthesis saved to research notes!')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('paper-status-changed'))
        }
      } else {
        addToast('error', 'Failed to save note')
      }
    } catch {
      addToast('error', 'Network error saving note')
    }
  }

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    addToast('info', 'Response copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="glass-card p-6 space-y-4 rounded-xl border border-accent/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              AI Research Assistant &amp; Paper Q&amp;A
            </h3>
            <p className="text-xs text-text-secondary">
              Ask deep questions grounded in abstract, specs, benchmarks, and literature review answers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAiConfigOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border-default text-xs text-text-secondary hover:text-accent font-mono transition-colors cursor-pointer"
            title="Configure AI model & API key"
          >
            <Settings size={13} />
            <span className="capitalize">{aiConfig.provider}</span>
            {aiConfig.apiKey ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {PROMPT_PRESETS.map((preset) => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSend(preset.prompt)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent border border-border-default hover:border-accent/40 transition-all font-medium cursor-pointer disabled:opacity-50"
                >
                  <Icon size={13} className="text-accent" />
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Chat Messages Box */}
          <div className="h-[380px] overflow-y-auto p-4 rounded-xl bg-bg-primary/80 border border-border-default space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3.5 space-y-1.5 text-xs ${
                    msg.role === 'user'
                      ? 'bg-accent text-white font-medium shadow-sm'
                      : 'bg-bg-tertiary text-text-primary border border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-border-default/30 pb-1 mb-1">
                    <span className="text-[10px] font-mono opacity-70">
                      {msg.role === 'user' ? 'You' : 'ResearchTrack AI'} • {msg.timestamp}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {msg.role === 'assistant' && msg.id !== 'welcome' && (
                        <button
                          type="button"
                          onClick={() => handleSaveAsNote(msg.content)}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-accent hover:bg-accent hover:text-white transition-colors cursor-pointer"
                          title="Save this answer directly to research notes"
                        >
                          <Save size={11} /> Save Note
                        </button>
                      )}
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                          title="Copy Markdown"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-bg-elevated text-text-secondary flex items-center justify-center shrink-0 mt-0.5 border border-border-default">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3 justify-start animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent flex items-center justify-center shrink-0">
                  <Bot size={15} />
                </div>
                <div className="rounded-xl p-3.5 bg-bg-tertiary border border-border-default text-xs text-text-secondary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                  <span>Synthesizing paper context...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2">
            <input
              placeholder="Ask a question about methodology, metrics, datasets, or code..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSend()
                }
              }}
              className="flex-1 h-10 px-3.5 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSend()}
              loading={loading}
              icon={<Send size={14} />}
            >
              Ask
            </Button>
          </div>
        </div>
      )}

      {/* AI Key & Provider Config Modal */}
      <AiConfigModal isOpen={isAiConfigOpen} onClose={() => setIsAiConfigOpen(false)} />
    </div>
  )
}
