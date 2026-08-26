'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  Search,
  Plus,
  Check,
  Trash2,
  FileText,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import type { Paper } from '@/lib/types'

interface AddPapersToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collectionId: string
  collectionName: string
  currentPaperIds: string[]
  onSuccess: () => void
}

export function AddPapersToCollectionModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  currentPaperIds,
  onSuccess,
}: AddPapersToCollectionModalProps) {
  const { addToast } = useToast()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [localPaperIds, setLocalPaperIds] = useState<string[]>(currentPaperIds)

  useEffect(() => {
    setLocalPaperIds(currentPaperIds)
  }, [currentPaperIds])

  useEffect(() => {
    if (!isOpen) return

    async function loadPapers() {
      setLoading(true)
      try {
        const res = await fetch('/api/papers?scope=all')
        if (res.ok) {
          const data = await res.json()
          setPapers(data)
        }
      } catch {
        addToast('error', 'Failed to load library papers')
      } finally {
        setLoading(false)
      }
    }

    loadPapers()
  }, [isOpen, addToast])

  const handleAddPaper = async (paperId: string) => {
    setProcessingId(paperId)
    try {
      const res = await fetch(`/api/collections/${collectionId}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      if (res.ok) {
        setLocalPaperIds((prev) => [...prev, paperId])
        addToast('success', 'Paper added to collection')
        onSuccess()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to add paper')
      }
    } catch {
      addToast('error', 'Network error adding paper')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRemovePaper = async (paperId: string) => {
    setProcessingId(paperId)
    try {
      const res = await fetch(`/api/collections/${collectionId}/papers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      if (res.ok) {
        setLocalPaperIds((prev) => prev.filter((id) => id !== paperId))
        addToast('success', 'Paper removed from collection')
        onSuccess()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to remove paper')
      }
    } catch {
      addToast('error', 'Network error removing paper')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredPapers = papers.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.authors.toLowerCase().includes(q) ||
      (p.journal && p.journal.toLowerCase().includes(q))
    )
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Papers to "${collectionName}"`}
      description="Select papers from your research library to group inside this collection."
      size="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Search bar & quick create link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder="Search library by title, author, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <Link href={`/papers/new?collectionId=${collectionId}`} onClick={onClose}>
            <Button size="sm" variant="secondary" icon={<Plus size={14} />}>
              Create New Paper
            </Button>
          </Link>
        </div>

        {/* Papers list */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-border-default/40">
          {loading ? (
            <div className="py-8 text-center text-xs text-text-tertiary">
              Loading your research library...
            </div>
          ) : filteredPapers.length > 0 ? (
            filteredPapers.map((paper) => {
              const isInCollection = localPaperIds.includes(paper.id)
              const isBusy = processingId === paper.id

              return (
                <div
                  key={paper.id}
                  className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-text-primary truncate">
                        {paper.title}
                      </h4>
                      {isInCollection && (
                        <Badge variant="success" size="sm" className="shrink-0 text-[10px]">
                          In Collection
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate">
                      {paper.authors} {paper.publicationYear ? `(${paper.publicationYear})` : ''}
                      {paper.journal ? ` · ${paper.journal}` : ''}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isInCollection ? (
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => handleRemovePaper(paper.id)}
                        loading={isBusy}
                        icon={<Trash2 size={12} />}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleAddPaper(paper.id)}
                        loading={isBusy}
                        icon={<Plus size={12} />}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-8 text-center space-y-2">
              <FileText size={24} className="mx-auto text-text-tertiary" />
              <p className="text-xs text-text-tertiary">
                {search ? 'No matching papers found in your library.' : 'No papers found in your library.'}
              </p>
              <Link href={`/papers/new?collectionId=${collectionId}`} onClick={onClose}>
                <Button size="xs" icon={<Plus size={12} />}>
                  Add Your First Paper
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default text-xs text-text-tertiary">
          <span>
            {localPaperIds.length} {localPaperIds.length === 1 ? 'paper' : 'papers'} in this collection
          </span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
