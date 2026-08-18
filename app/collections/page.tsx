'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CollectionCard } from '@/components/collections/CollectionCard'
import { CollectionModal } from '@/components/collections/CollectionModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { FolderOpen, Plus, Layers, FileText } from 'lucide-react'
import type { Collection, Paper } from '@/lib/types'

interface CollectionWithMeta extends Collection {
  _count?: { papers: number }
  papers?: Partial<Paper>[]
}

export default function CollectionsPage() {
  const { addToast } = useToast()
  const [collections, setCollections] = useState<CollectionWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<CollectionWithMeta | null>(null)
  const [deletingCollection, setDeletingCollection] = useState<CollectionWithMeta | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections')
      if (res.ok) {
        const data = await res.json()
        setCollections(data)
      }
    } catch {
      addToast('error', 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleDelete = async () => {
    if (!deletingCollection) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/collections/${deletingCollection.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        addToast('success', 'Collection deleted')
        setDeletingCollection(null)
        fetchCollections()
      } else {
        addToast('error', 'Failed to delete collection')
      }
    } catch {
      addToast('error', 'Failed to delete collection')
    } finally {
      setDeleting(false)
    }
  }

  const totalPapersInCollections = collections.reduce(
    (acc, col) => acc + (col._count?.papers || 0),
    0
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and overview stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Layers size={16} className="text-accent" />
              <strong className="text-text-primary">{collections.length}</strong> collections
            </span>
            <span className="flex items-center gap-1.5">
              <FileText size={16} className="text-accent" />
              <strong className="text-text-primary">{totalPapersInCollections}</strong> paper assignments
            </span>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingCollection(null)
            setIsModalOpen(true)
          }}
          icon={<Plus size={16} />}
        >
          New Collection
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="180px" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No collections yet"
          description="Create your first collection to group papers by research domain, topic, or writing project."
          action={
            <Button
              onClick={() => {
                setEditingCollection(null)
                setIsModalOpen(true)
              }}
              icon={<Plus size={16} />}
            >
              Create Collection
            </Button>
          }
        />
      )}

      {/* Grid of collections */}
      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onEdit={(c) => {
                setEditingCollection(c)
                setIsModalOpen(true)
              }}
              onDelete={(c) => setDeletingCollection(c)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CollectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCollection(null)
        }}
        collection={editingCollection}
        onSuccess={fetchCollections}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCollection}
        onClose={() => setDeletingCollection(null)}
        title="Delete Collection"
        description={`Are you sure you want to delete "${deletingCollection?.name}"? Papers inside this collection will not be deleted, they will simply be unlinked.`}
        size="sm"
      >
        <div className="flex items-center gap-3 pt-2">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete Collection
          </Button>
          <Button variant="ghost" onClick={() => setDeletingCollection(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
