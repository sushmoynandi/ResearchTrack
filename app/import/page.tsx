'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload,
  FileCode,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface ParsedPaper {
  id: string
  title: string
  authors: string
  abstract?: string
  journal?: string
  publicationYear?: string
  doi?: string
  arxivId?: string
  selected: boolean
}

type ImportFormat = 'bibtex' | 'ris' | 'csv'

export default function BulkImportPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [format, setFormat] = useState<ImportFormat>('bibtex')
  const [rawText, setRawText] = useState('')
  const [parsedPapers, setParsedPapers] = useState<ParsedPaper[]>([])
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch('/api/collections')
        if (res.ok) {
          const data = await res.json()
          setCollections(data)
        }
      } catch {
        // silent
      }
    }
    loadCollections()
  }, [])

  // 1. BibTeX Parser
  const parseBibTeX = (text: string): ParsedPaper[] => {
    const entries: ParsedPaper[] = []
    const entryRegex = /@\w+\s*\{\s*([^,]+),([^@]*)\}/g
    let match: RegExpExecArray | null

    let idx = 0
    while ((match = entryRegex.exec(text)) !== null) {
      idx++
      const body = match[2]

      const extractField = (fieldName: string) => {
        const regex = new RegExp(`${fieldName}\\s*=\\s*[{"]([^}"]+)[}"]`, 'i')
        const m = body.match(regex)
        return m ? m[1].replace(/[\r\n]+/g, ' ').trim() : undefined
      }

      const title = extractField('title') || `BibTeX Entry ${idx}`
      const authors = extractField('author') || extractField('authors') || 'Academic Researcher'
      const journal = extractField('journal') || extractField('booktitle') || extractField('publisher')
      const year = extractField('year')
      const doi = extractField('doi')
      const arxivId = extractField('eprint') || extractField('arxivid')
      const abstract = extractField('abstract')

      entries.push({
        id: `bib-${idx}`,
        title,
        authors: authors.replace(/ and /gi, ', '),
        abstract,
        journal,
        publicationYear: year,
        doi,
        arxivId,
        selected: true,
      })
    }
    return entries
  }

  // 2. RIS Parser
  const parseRIS = (text: string): ParsedPaper[] => {
    const entries: ParsedPaper[] = []
    const rawRecords = text.split(/ER\s{2}-/i)

    rawRecords.forEach((record, idx) => {
      if (!record.trim()) return

      const lines = record.split('\n')
      let title = ''
      const authors: string[] = []
      let journal = ''
      let year = ''
      let doi = ''
      let abstract = ''

      lines.forEach((line) => {
        const tag = line.slice(0, 2).trim()
        const val = line.slice(6).trim()

        if (tag === 'TI' || tag === 'T1') title = val
        if (tag === 'AU' || tag === 'A1') authors.push(val)
        if (tag === 'JO' || tag === 'JF' || tag === 'T2') journal = val
        if (tag === 'PY' || tag === 'Y1') year = val.slice(0, 4)
        if (tag === 'DO') doi = val
        if (tag === 'AB' || tag === 'N2') abstract = val
      })

      if (title || authors.length > 0) {
        entries.push({
          id: `ris-${idx + 1}`,
          title: title || `RIS Document ${idx + 1}`,
          authors: authors.length > 0 ? authors.join(', ') : 'Academic Researcher',
          journal: journal || undefined,
          publicationYear: year || undefined,
          doi: doi || undefined,
          abstract: abstract || undefined,
          selected: true,
        })
      }
    })
    return entries
  }

  // 3. CSV Parser
  const parseCSV = (text: string): ParsedPaper[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length <= 1) return []

    const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/["']/g, '').trim())
    const titleIdx = header.findIndex((h) => h.includes('title'))
    const authorIdx = header.findIndex((h) => h.includes('author'))
    const yearIdx = header.findIndex((h) => h.includes('year'))
    const journalIdx = header.findIndex((h) => h.includes('journal') || h.includes('venue'))
    const doiIdx = header.findIndex((h) => h.includes('doi'))

    const entries: ParsedPaper[] = []

    for (let i = 1; i < lines.length; i++) {
      // Split with quotes support
      const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',')
      const cleanCols = cols.map((c) => c.replace(/^"|"$/g, '').trim())

      const title = titleIdx >= 0 ? cleanCols[titleIdx] : cleanCols[0]
      const authors = authorIdx >= 0 ? cleanCols[authorIdx] : 'Academic Researcher'
      const year = yearIdx >= 0 ? cleanCols[yearIdx] : undefined
      const journal = journalIdx >= 0 ? cleanCols[journalIdx] : undefined
      const doi = doiIdx >= 0 ? cleanCols[doiIdx] : undefined

      if (title) {
        entries.push({
          id: `csv-${i}`,
          title,
          authors: authors || 'Academic Researcher',
          publicationYear: year,
          journal,
          doi,
          selected: true,
        })
      }
    }
    return entries
  }

  const handleParse = (textToParse: string, fmt: ImportFormat) => {
    if (!textToParse.trim()) {
      setParsedPapers([])
      return
    }

    let parsed: ParsedPaper[] = []
    if (fmt === 'bibtex') parsed = parseBibTeX(textToParse)
    else if (fmt === 'ris') parsed = parseRIS(textToParse)
    else if (fmt === 'csv') parsed = parseCSV(textToParse)

    setParsedPapers(parsed)
    if (parsed.length > 0) {
      addToast('info', `Parsed ${parsed.length} papers from ${fmt.toUpperCase()}`)
    } else {
      addToast('warning', `No valid entries found. Check formatting.`)
    }
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setRawText(content)

      let detectedFormat = format
      if (file.name.endsWith('.bib')) detectedFormat = 'bibtex'
      else if (file.name.endsWith('.ris')) detectedFormat = 'ris'
      else if (file.name.endsWith('.csv')) detectedFormat = 'csv'

      setFormat(detectedFormat)
      handleParse(content, detectedFormat)
    }
    reader.readAsText(file)
  }

  const toggleSelectAll = (select: boolean) => {
    setParsedPapers((prev) => prev.map((p) => ({ ...p, selected: select })))
  }

  const toggleItemSelect = (id: string) => {
    setParsedPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    )
  }

  const handleExecuteImport = async () => {
    const selected = parsedPapers.filter((p) => p.selected)
    if (selected.length === 0) {
      addToast('error', 'Please select at least 1 paper to import')
      return
    }

    setImporting(true)
    try {
      const res = await fetch('/api/papers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          papers: selected,
          collectionId: selectedCollectionId || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addToast(
          'success',
          `Successfully imported ${data.importedCount} papers (${data.skippedCount} duplicates skipped)!`
        )
        router.push('/papers')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to import papers')
      }
    } catch {
      addToast('error', 'Network error during batch import')
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = parsedPapers.filter((p) => p.selected).length

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <Upload size={22} className="text-accent" /> Bulk Literature Import &amp; Migration Engine
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Migrate entire libraries from <strong>Zotero</strong>, <strong>Mendeley</strong>, or <strong>Google Scholar</strong> in BibTeX, RIS, or CSV formats.
          </p>
        </div>

        <Link href="/papers">
          <Button variant="secondary" size="sm">
            Back to Library
          </Button>
        </Link>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Controls & Upload */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              1. Choose Import Format
            </h3>

            {/* Format Pills */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bibtex', label: 'BibTeX (.bib)', icon: FileCode },
                { id: 'ris', label: 'RIS / Zotero', icon: FileText },
                { id: 'csv', label: 'CSV Table', icon: FileSpreadsheet },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFormat(tab.id as ImportFormat)
                      handleParse(rawText, tab.id as ImportFormat)
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-semibold ${
                      format === tab.id
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* File Upload Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-xl border-2 border-dashed border-border-default hover:border-accent/60 bg-bg-tertiary/40 hover:bg-bg-tertiary transition-all text-center cursor-pointer space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".bib,.ris,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
              />
              <Upload size={24} className="mx-auto text-accent group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-text-primary">Click or drop export file</p>
              <p className="text-[10px] text-text-tertiary">Accepts .bib, .ris, .csv files</p>
            </div>

            {/* Destination Collection */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-text-secondary">
                Assign to Collection (Optional)
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">No Collection (General Library)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    📁 {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Text Paste & Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                2. Paste Raw Citations or Content
              </h3>
              {rawText && (
                <button
                  onClick={() => {
                    setRawText('')
                    setParsedPapers([])
                  }}
                  className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>

            <textarea
              placeholder={`Paste your raw ${format.toUpperCase()} contents here...\ne.g. @article{vaswani2017attention, title={Attention is All You Need}, author={Vaswani, Ashish}, year={2017}}`}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value)
                handleParse(e.target.value, format)
              }}
              rows={5}
              className="w-full bg-bg-primary border border-border-default rounded-xl p-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* 3. Verified Live Preview Table */}
          {parsedPapers.length > 0 && (
            <div className="glass-card p-5 space-y-4 animate-scale-in">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border-default pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">
                    Parsed Literature ({parsedPapers.length} found)
                  </span>
                  <span className="text-xs text-accent font-semibold font-mono">
                    {selectedCount} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="text-xs text-text-tertiary hover:text-text-primary cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-text-tertiary">|</span>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="text-xs text-text-tertiary hover:text-text-primary cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto border border-border-default rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8 text-center">✓</th>
                      <th className="p-2.5">Paper Title</th>
                      <th className="p-2.5">Authors</th>
                      <th className="p-2.5">Year</th>
                      <th className="p-2.5">Venue / Journal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                    {parsedPapers.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => toggleItemSelect(p.id)}
                        className={`cursor-pointer transition-colors ${
                          p.selected ? 'bg-accent/5 hover:bg-accent/10' : 'opacity-50 hover:bg-bg-tertiary/40'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => {}}
                            className="rounded text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="p-2.5 font-medium text-text-primary max-w-xs truncate">{p.title}</td>
                        <td className="p-2.5 text-text-secondary max-w-[180px] truncate">{p.authors}</td>
                        <td className="p-2.5 text-text-tertiary font-mono">{p.publicationYear || '—'}</td>
                        <td className="p-2.5 text-text-tertiary truncate max-w-[140px]">{p.journal || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-text-tertiary">
                  Duplicates by DOI or exact title will be skipped automatically.
                </p>

                <Button
                  variant="primary"
                  onClick={handleExecuteImport}
                  loading={importing}
                  disabled={selectedCount === 0}
                  icon={<Sparkles size={14} />}
                >
                  Import {selectedCount} Papers
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
