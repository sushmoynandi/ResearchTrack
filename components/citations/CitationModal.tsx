'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Copy, Check, Quote } from 'lucide-react'
import { generateCitation, CitationFormat } from '@/lib/citations'
import type { Paper } from '@/lib/types'

const FORMATS: { key: CitationFormat; label: string; desc: string }[] = [
  { key: 'APA', label: 'APA 7th', desc: 'American Psychological Association' },
  { key: 'MLA', label: 'MLA 9th', desc: 'Modern Language Association' },
  { key: 'IEEE', label: 'IEEE', desc: 'Institute of Electrical and Electronics Engineers' },
  { key: 'CHICAGO', label: 'Chicago', desc: 'Chicago Manual of Style (Author-Date)' },
  { key: 'BIBTEX', label: 'BibTeX', desc: 'LaTeX / Reference Managers' },
]

interface CitationModalProps {
  isOpen: boolean
  onClose: () => void
  paper: Paper
}

export function CitationModal({ isOpen, onClose, paper }: CitationModalProps) {
  const { addToast } = useToast()
  const [activeFormat, setActiveFormat] = useState<CitationFormat>('APA')
  const [copied, setCopied] = useState(false)

  const currentCitation = generateCitation(paper, activeFormat)

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCitation)
    setCopied(true)
    addToast('success', `${activeFormat} citation copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cite This Paper"
      description={`Generate formatted reference citations for "${paper.title}"`}
      size="lg"
    >
      <div className="space-y-5 pt-2">
        {/* Format tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-tertiary rounded-xl overflow-x-auto">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFormat(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeFormat === f.key
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Citation preview block */}
        <div className="relative p-4 rounded-xl bg-bg-tertiary/70 border border-border-default">
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
            <span>
              {FORMATS.find((f) => f.key === activeFormat)?.desc}
            </span>
            {activeFormat === 'BIBTEX' && (
              <span className="font-mono text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded">
                .bib
              </span>
            )}
          </div>

          <pre
            className={`text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed select-all ${
              activeFormat === 'BIBTEX' ? 'font-mono text-xs text-accent' : ''
            }`}
          >
            {currentCitation}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-default">
          <p className="text-xs text-text-tertiary">
            Make sure to verify journal and page numbers for published manuscripts.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleCopy}
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? 'Copied' : 'Copy Citation'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
