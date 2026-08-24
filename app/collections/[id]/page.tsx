'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PaperCard } from '@/components/papers/PaperCard'
import { PaperRow } from '@/components/papers/PaperRow'
import { CollectionModal } from '@/components/collections/CollectionModal'
import { AddPapersToCollectionModal } from '@/components/collections/AddPapersToCollectionModal'
import { ExportMatrixModal } from '@/components/papers/ExportMatrixModal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import {
  FolderOpen,
  ArrowLeft,
  Edit2,
  Plus,
  LayoutGrid,
  List,
  FileText,
  BookmarkPlus,
  Trash2,
  Download,
  BookOpen,
} from 'lucide-react'
import type { Collection, Paper } from '@/lib/types'

interface CollectionDetail extends Collection {
  papers: (Paper & { _count?: { notes: number } })[]
  _count?: { papers: number }
}

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddPapersOpen, setIsAddPapersOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const collectionId = params.id as string

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`)
      if (res.ok) {
        const data = await res.json()
        setCollection(data)
      } else {
        addToast('error', 'Collection not found')
        router.push('/collections')
      }
    } catch {
      addToast('error', 'Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [collectionId, router, addToast])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  const handleRemovePaper = async (paperId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setRemovingId(paperId)
    try {
      const res = await fetch(`/api/collections/${collectionId}/papers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      if (res.ok) {
        addToast('success', 'Paper unlinked from collection')
        fetchCollection()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to remove paper')
      }
    } catch {
      addToast('error', 'Network error removing paper')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton variant="rect" height="40px" width="300px" />
        <Skeleton variant="card" height="120px" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton variant="card" height="200px" />
          <Skeleton variant="card" height="200px" />
          <Skeleton variant="card" height="200px" />
        </div>
      </div>
    )
  }

  if (!collection) return null

  const color = collection.color || '#06b6d4'
  const currentPaperIds = collection.papers.map((p) => p.id)

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Collections
        </Link>
      </div>

      {/* Collection Hero */}
      <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              <FolderOpen size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary font-display">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="text-sm text-text-secondary mt-1 max-w-2xl">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
                <span>
                  {collection.papers.length}{' '}
                  {collection.papers.length === 1 ? 'paper' : 'papers'} in collection
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {collection.papers.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<BookOpen size={14} className="text-accent" />}
                onClick={() => setIsExportOpen(true)}
              >
                Export Vault
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 size={14} />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<BookmarkPlus size={14} />}
              onClick={() => setIsAddPapersOpen(true)}
            >
              Add Papers
            </Button>
            <Link href={`/papers/new?collectionId=${collection.id}`}>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />}>
                New Paper
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Papers listing controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary font-display">
          Papers in this collection ({collection.papers.length})
        </h3>

        {collection.papers.length > 0 && (
          <div className="flex items-center gap-3">
            <Button
              size="xs"
              variant="secondary"
              icon={<BookmarkPlus size={13} />}
              onClick={() => setIsAddPapersOpen(true)}
            >
              Manage Papers
            </Button>
            <div className="flex items-center bg-bg-secondary border border-border-default rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {collection.papers.length === 0 && (
        <EmptyState
          icon={<FileText size={48} />}
          title="No papers in this collection yet"
          description="Add existing papers from your library or create a brand new paper for this collection."
          action={
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                icon={<BookmarkPlus size={14} />}
                onClick={() => setIsAddPapersOpen(true)}
              >
                Add From Library
              </Button>
              <Link href={`/papers/new?collectionId=${collection.id}`}>
                <Button variant="secondary" icon={<Plus size={14} />}>
                  Create New Paper
                </Button>
              </Link>
            </div>
          }
        />
      )}

      {/* Grid view */}
      {collection.papers.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {collection.papers.map((paper) => (
            <div key={paper.id} className="relative group">
              <PaperCard
                paper={paper}
                onUpdate={fetchCollection}
              />
              <button
                type="button"
                onClick={(e) => handleRemovePaper(paper.id, e)}
                disabled={removingId === paper.id}
                title="Remove paper from this collection"
                className="absolute top-3 right-10 p-1.5 rounded-lg bg-bg-secondary/90 text-text-tertiary hover:text-danger hover:bg-danger-subtle border border-border-default opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer text-xs"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {collection.papers.length > 0 && viewMode === 'list' && (
        <div className="space-y-1 stagger-children">
          {collection.papers.map((paper) => (
            <div key={paper.id} className="relative group flex items-center">
              <div className="flex-1">
                <PaperRow
                  paper={paper}
                  onUpdate={fetchCollection}
                />
              </div>
              <button
                type="button"
                onClick={(e) => handleRemovePaper(paper.id, e)}
                disabled={removingId === paper.id}
                title="Remove paper from this collection"
                className="p-2 mr-2 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-subtle opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Papers Modal */}
      <AddPapersToCollectionModal
        isOpen={isAddPapersOpen}
        onClose={() => setIsAddPapersOpen(false)}
        collectionId={collection.id}
        collectionName={collection.name}
        currentPaperIds={currentPaperIds}
        onSuccess={fetchCollection}
      />

      {/* Edit collection modal */}
      <CollectionModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        collection={collection}
        onSuccess={fetchCollection}
      />

      {/* Export to PKM Vault & Calendar Modal */}
      <ExportMatrixModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        papers={collection.papers}
        title={`Export "${collection.name}" to Obsidian Vault & PKM`}
      />
    </div>
  )
}
