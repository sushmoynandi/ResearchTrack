'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  Sparkles,
  Zap,
  BookOpen,
  CheckCircle2,
  Calendar,
  Users,
  ExternalLink,
  ArrowRight,
  Layers,
  FileText,
} from 'lucide-react'
import type { Paper } from '@/lib/types'

interface MagicAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paper: Paper) => void
}

interface FetchedPaper {
  title: string
  authors: string
  abstract?: string
  journal?: string
  publicationYear?: number
  citationCount?: number
  arxivId?: string
  doi?: string
  url?: string
  pdfUrl?: string
  architecture?: string
  tags?: string[]
}

const SAMPLE_QUERIES = [
  { label: '⚡ Transformer', query: '1706.03762' },
  { label: '🧬 AlphaFold', query: '10.1038/s41586-020-2649-2' },
  { label: '🎯 DPO Alignment', query: '2305.18290' },
  { label: '🖼️ ResNet', query: '10.1109/CVPR.2016.90' },
]

export function MagicAddModal({ isOpen, onClose, onSuccess }: MagicAddModalProps) {
  const { addToast } = useToast()
  const [query, setQuery] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<FetchedPaper | null>(null)

  const handleFetch = async (inputQuery?: string) => {
    const q = inputQuery || query
    if (!q.trim()) {
      addToast('error', 'Please enter a DOI, arXiv ID, or paper link')
      return
    }

    setFetching(true)
    setPreview(null)
    try {
      const res = await fetch(`/api/arxiv?id=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setPreview(data)
        addToast('success', '✓ Metadata resolved instantly!')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Paper not found. Please verify the DOI or arXiv ID.')
      }
    } catch {
      addToast('error', 'Network error fetching paper metadata')
    } finally {
      setFetching(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!preview) return
    setSaving(true)
    try {
      const payload = {
        title: preview.title,
        authors: preview.authors,
        abstract: preview.abstract || '',
        journal: preview.journal || null,
        publicationYear: preview.publicationYear || null,
        citationCount: preview.citationCount || 0,
        arxivId: preview.arxivId || null,
        doi: preview.doi || null,
        url: preview.url || (preview.arxivId ? `https://arxiv.org/abs/${preview.arxivId}` : null),
        pdfPath: preview.pdfUrl || null,
        architecture: preview.architecture || null,
        tags: preview.tags || [],
        status: 'TO_READ',
        priority: 'MEDIUM',
      }

      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const saved = await res.json()
        addToast('success', '🎉 Paper added to your Research Library!')
        onSuccess(saved)
        onClose()
        setQuery('')
        setPreview(null)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to save paper to library')
      }
    } catch {
      addToast('error', 'Network error saving paper')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="1-Step Magic Paper Import" size="md">
      <div className="space-y-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          Paste any <strong>DOI</strong>, <strong>arXiv link</strong>, or <strong>paper URL</strong>. We automatically extract full metadata, authors, year, and open-access PDF.
        </p>

        {/* Input & Search */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1706.03762 or https://doi.org/10.1038/s41586..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleFetch()
                }
              }}
              className="text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleFetch()}
              loading={fetching}
              icon={<Sparkles size={14} />}
              className="shrink-0"
            >
              Resolve
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
            <span className="text-text-tertiary shrink-0 font-mono">Sample DOIs:</span>
            {SAMPLE_QUERIES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setQuery(sample.query)
                  handleFetch(sample.query)
                }}
                className="px-2 py-0.5 rounded-md bg-bg-tertiary hover:bg-accent/20 hover:text-accent border border-border-default transition-all shrink-0 cursor-pointer font-medium"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Card */}
        {preview && (
          <div className="p-4 rounded-xl glass-card border-accent/40 bg-accent/5 space-y-3 animate-scale-in">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-accent/20 text-accent">
                  {preview.arxivId ? `arXiv:${preview.arxivId}` : preview.doi ? `DOI:${preview.doi}` : 'Paper Preview'}
                </span>
                <h4 className="text-sm font-bold text-text-primary font-display line-clamp-2">
                  {preview.title}
                </h4>
                <p className="text-xs text-text-secondary line-clamp-1">
                  {preview.authors}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-text-tertiary font-mono pt-1 border-t border-border-default">
              {preview.publicationYear && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} className="text-accent" />
                  {preview.publicationYear}
                </span>
              )}
              {preview.journal && (
                <span className="truncate max-w-[140px] text-text-secondary">
                  {preview.journal}
                </span>
              )}
              {preview.architecture && (
                <span className="ml-auto px-1.5 py-0.5 rounded bg-bg-secondary text-accent border border-accent/30 font-sans font-medium text-[10px]">
                  {preview.architecture}
                </span>
              )}
            </div>

            {preview.abstract && (
              <p className="text-[11px] text-text-tertiary line-clamp-3 italic leading-relaxed pt-1">
                &ldquo;{preview.abstract}&rdquo;
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
              <Button size="sm" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveToLibrary}
                loading={saving}
                icon={<CheckCircle2 size={14} />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
              >
                + Add to My Library
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
