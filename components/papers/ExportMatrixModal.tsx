'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  Copy,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Check,
  Code,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { Paper, BenchmarkScore, LiteratureReviewData } from '@/lib/types'

interface ExportMatrixModalProps {
  isOpen: boolean
  onClose: () => void
  papers: Paper[]
  title?: string
}

type ExportFormat = 'bibtex' | 'latex' | 'markdown' | 'csv'

export function ExportMatrixModal({
  isOpen,
  onClose,
  papers,
  title = 'Export Literature Review & Citations',
}: ExportMatrixModalProps) {
  const { addToast } = useToast()
  const [format, setFormat] = useState<ExportFormat>('latex')
  const [copied, setCopied] = useState(false)

  // Helper to generate a clean BibTeX citation key
  const generateCiteKey = (paper: Paper) => {
    const firstAuthor = paper.authors.split(',')[0].trim().split(' ').pop()?.toLowerCase() || 'paper'
    const cleanAuthor = firstAuthor.replace(/[^a-z0-9]/gi, '')
    const year = paper.publicationYear || new Date().getFullYear()
    const firstWord = paper.title.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/gi, '')
    return `${cleanAuthor}${year}${firstWord}`
  }

  // 1. Generate BibTeX format
  const generateBibTeX = () => {
    return papers
      .map((p) => {
        const citeKey = generateCiteKey(p)
        const authors = p.authors.replace(/,\s*/g, ' and ')
        let entry = `@article{${citeKey},\n`
        entry += `  title     = {${p.title}},\n`
        entry += `  author    = {${authors}},\n`
        if (p.journal) entry += `  journal   = {${p.journal}},\n`
        if (p.publicationYear) entry += `  year      = {${p.publicationYear}},\n`
        if (p.doi) entry += `  doi       = {${p.doi}},\n`
        if (p.url) entry += `  url       = {${p.url}},\n`
        if (p.arxivId) entry += `  eprint    = {${p.arxivId}},\n  archivePrefix = {arXiv},\n`
        entry += `}`
        return entry
      })
      .join('\n\n')
  }

  // 2. Generate LaTeX Tabularx Table
  const generateLaTeX = () => {
    let tex = `% ====================================================================\n`
    tex += `% ResearchTrack Literature Review Survey Matrix (LaTeX / Overleaf Ready)\n`
    tex += `% Generated on ${new Date().toLocaleDateString()}\n`
    tex += `% ====================================================================\n\n`
    tex += `\\begin{table*}[t]\n`
    tex += `\\centering\n`
    tex += `\\small\n`
    tex += `\\caption{Literature Review and Methodological Comparison Matrix}\n`
    tex += `\\label{tab:literature-review-matrix}\n`
    tex += `\\begin{tabularx}{\\textwidth}{l p{3.2cm} p{3.8cm} p{3.5cm} r}\n`
    tex += `\\hline\n`
    tex += `\\textbf{Citation} & \\textbf{Problem Addressed} & \\textbf{Method / Architecture} & \\textbf{Key Contribution / Benchmarks} & \\textbf{Year} \\\\\n`
    tex += `\\hline\n`

    papers.forEach((p) => {
      const citeKey = generateCiteKey(p)
      const problem = (p.problemSolved || p.abstract?.slice(0, 100) || 'Primary baseline bottleneck')
        .replace(/([&%$#_{}])/g, '\\$1')
        .slice(0, 110)
      const method = (p.architecture ? `${p.architecture} (${p.parameters || 'Standard size'})` : 'Deep Learning Method')
        .replace(/([&%$#_{}])/g, '\\$1')
      const outcome = (p.keyContribution || 'State-of-the-art results')
        .replace(/([&%$#_{}])/g, '\\$1')
        .slice(0, 110)
      const year = p.publicationYear || '-'

      tex += `\\cite{${citeKey}} & ${problem}... & ${method} & ${outcome}... & ${year} \\\\\n`
    })

    tex += `\\hline\n`
    tex += `\\end{tabularx}\n`
    tex += `\\end{table*}\n`
    return tex
  }

  // 3. Generate Markdown Table
  const generateMarkdown = () => {
    let md = `## Literature Review Matrix\n\n`
    md += `| Paper | Authors | Architecture / Model | Problem Solved | Key Contribution | Year |\n`
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`

    papers.forEach((p) => {
      const title = p.title.replace(/\|/g, '-')
      const authors = p.authors.split(',')[0] + ' et al.'
      const arch = p.architecture ? `${p.architecture} (${p.parameters || ''})` : '-'
      const problem = (p.problemSolved || '-').replace(/\|/g, '-')
      const contribution = (p.keyContribution || '-').replace(/\|/g, '-')
      const year = p.publicationYear || '-'

      md += `| **${title}** | ${authors} | ${arch} | ${problem} | ${contribution} | ${year} |\n`
    })

    return md
  }

  // 4. Generate CSV
  const generateCSV = () => {
    const headers = [
      'Title',
      'Authors',
      'Year',
      'Venue/Journal',
      'Status',
      'Priority',
      'DOI',
      'ArXiv ID',
      'Architecture',
      'Parameters',
      'Context Window',
      'Problem Solved',
      'Key Contribution',
      'Limitations',
    ]

    const rows = papers.map((p) => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.authors.replace(/"/g, '""')}"`,
      p.publicationYear || '',
      `"${(p.journal || '').replace(/"/g, '""')}"`,
      p.status,
      p.priority,
      p.doi || '',
      p.arxivId || '',
      `"${(p.architecture || '').replace(/"/g, '""')}"`,
      `"${(p.parameters || '').replace(/"/g, '""')}"`,
      `"${(p.contextWindow || '').replace(/"/g, '""')}"`,
      `"${(p.problemSolved || '').replace(/"/g, '""')}"`,
      `"${(p.keyContribution || '').replace(/"/g, '""')}"`,
      `"${(p.limitations || '').replace(/"/g, '""')}"`,
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }

  const getContent = () => {
    switch (format) {
      case 'bibtex':
        return generateBibTeX()
      case 'latex':
        return generateLaTeX()
      case 'markdown':
        return generateMarkdown()
      case 'csv':
        return generateCSV()
    }
  }

  const handleCopy = () => {
    const text = getContent()
    navigator.clipboard.writeText(text)
    setCopied(true)
    addToast('success', `Copied ${format.toUpperCase()} to clipboard!`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = getContent()
    const extensions: Record<ExportFormat, string> = {
      bibtex: 'bib',
      latex: 'tex',
      markdown: 'md',
      csv: 'csv',
    }
    const mimeTypes: Record<ExportFormat, string> = {
      bibtex: 'text/plain',
      latex: 'text/x-tex',
      markdown: 'text/markdown',
      csv: 'text/csv',
    }

    const blob = new Blob([text], { type: mimeTypes[format] })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `literature_matrix_${new Date().toISOString().slice(0, 10)}.${extensions[format]}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('success', `Downloaded .${extensions[format]} file`)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Export ${papers.length} ${papers.length === 1 ? 'paper' : 'papers'} as ready-to-compile academic matrices, BibTeX references, or datasets.`}
      size="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-border-default pb-3 overflow-x-auto">
          {[
            { id: 'latex', label: 'LaTeX Table (Overleaf)', icon: FileCode },
            { id: 'bibtex', label: 'BibTeX (.bib)', icon: Code },
            { id: 'markdown', label: 'Markdown Matrix (.md)', icon: FileText },
            { id: 'csv', label: 'CSV Spreadsheet (.csv)', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setFormat(tab.id as ExportFormat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  format === tab.id
                    ? 'bg-accent text-bg-primary font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Live Code Preview Box */}
        <div className="relative rounded-xl bg-bg-primary border border-border-default overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border-default text-[11px] text-text-tertiary font-mono">
            <span>
              Format: <strong className="text-accent">{format.toUpperCase()}</strong> ({papers.length} items)
            </span>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="secondary" onClick={handleCopy} icon={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="xs" variant="primary" onClick={handleDownload} icon={<Download size={12} />}>
                Download
              </Button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-text-secondary overflow-x-auto max-h-[320px] overflow-y-auto leading-relaxed select-all">
            {getContent()}
          </pre>
        </div>

        {/* Overleaf Tip */}
        {format === 'latex' && (
          <p className="text-[11px] text-text-tertiary italic">
            💡 <strong>Tip for Overleaf:</strong> Ensure you include <code className="bg-bg-tertiary px-1 rounded text-accent">\usepackage&#123;tabularx&#125;</code> and <code className="bg-bg-tertiary px-1 rounded text-accent">\usepackage&#123;cite&#125;</code> in your LaTeX preamble.
          </p>
        )}

        {/* Modal footer */}
        <div className="flex justify-end pt-3 border-t border-border-default">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
