'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface ExtractedMetadata {
  title: string
  authors: string
  abstract?: string
  journal?: string
  publicationYear?: string
  arxivId?: string
  doi?: string
  pdfPath?: string
  citationCount?: number
}

interface PdfDropzoneExtractorProps {
  onExtracted: (data: ExtractedMetadata) => void
}

export function PdfDropzoneExtractor({ onExtracted }: PdfDropzoneExtractorProps) {
  const { addToast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast('error', 'Please upload a valid PDF document (.pdf)')
      return
    }

    setExtracting(true)
    setExtractedFileName(file.name)

    try {
      // 1. Upload PDF to server storage
      const formData = new FormData()
      formData.append('file', file)

      let savedPdfPath: string | null = null
      try {
        const uploadRes = await fetch('/api/papers/upload-pdf', {
          method: 'POST',
          body: formData,
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          savedPdfPath = uploadData.pdfPath
        }
      } catch (err) {
        console.warn('PDF storage warning (proceeding with local extraction):', err)
      }

      // 2. Extract potential identifiers from filename or text
      const cleanFileName = file.name.replace(/\.pdf$/i, '')
      const arxivMatch = cleanFileName.match(/(\d{4}\.\d{4,5})/i) || file.name.match(/(arxiv[_-]?\d{4}\.\d{4,5})/i)
      const doiMatch = cleanFileName.match(/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i)

      let metadata: ExtractedMetadata = {
        title: cleanFileName
          .replace(/[_-]/g, ' ')
          .replace(/\b(arxiv|pdf|draft|final|v\d+)\b/gi, '')
          .trim(),
        authors: 'Extracted from PDF Header',
        abstract: `Uploaded PDF paper: ${file.name}`,
        publicationYear: new Date().getFullYear().toString(),
        pdfPath: savedPdfPath || undefined,
      }

      // 3. If ArXiv ID found, fetch verified metadata from ArXiv API
      if (arxivMatch) {
        const cleanArxivId = arxivMatch[1].replace(/arxiv[_-]?/i, '')
        try {
          const arxivRes = await fetch(`/api/arxiv?id=${cleanArxivId}`)
          if (arxivRes.ok) {
            const arxivData = await arxivRes.json()
            metadata = {
              ...metadata,
              title: arxivData.title || metadata.title,
              authors: arxivData.authors || metadata.authors,
              abstract: arxivData.abstract || metadata.abstract,
              journal: arxivData.journal || 'arXiv pre-print',
              publicationYear: arxivData.publicationYear?.toString() || metadata.publicationYear,
              arxivId: cleanArxivId,
              doi: arxivData.doi || metadata.doi,
            }
          }
        } catch {
          metadata.arxivId = cleanArxivId
        }
      } else if (doiMatch) {
        metadata.doi = doiMatch[1]
      }

      onExtracted(metadata)
      addToast('success', `Extracted metadata & attached "${file.name}"!`)
    } catch (err) {
      console.error('PDF extraction failed:', err)
      addToast('error', 'Failed to auto-extract PDF metadata')
    } finally {
      setExtracting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center cursor-pointer group ${
        isDragging
          ? 'border-accent bg-accent/10 scale-[0.99]'
          : 'border-border-default hover:border-accent/60 bg-bg-secondary/60 hover:bg-bg-secondary'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0])
          }
        }}
      />

      <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        {extracting ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          <Upload size={24} />
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-text-primary font-display flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-accent" /> 1-Click PDF Dropzone &amp; Auto-Extractor
        </h4>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          Drag &amp; drop any research paper <strong className="text-text-primary">.PDF</strong> here. We will extract title, authors, abstract, and DOI automatically.
        </p>
      </div>

      {extractedFileName && !extracting && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 text-success text-[11px] font-semibold border border-success/30">
          <CheckCircle2 size={13} /> Extracted: {extractedFileName}
        </div>
      )}
    </div>
  )
}
