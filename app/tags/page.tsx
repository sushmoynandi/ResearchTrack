'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  Tags as TagsIcon,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Hash,
} from 'lucide-react'

interface TagWithCount {
  id: string
  name: string
  _count: { papers: number }
}

export default function TagsPage() {
  const { addToast } = useToast()
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)

  // Create state
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deletingTag, setDeletingTag] = useState<TagWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch {
      addToast('error', 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      })

      if (res.ok) {
        setNewTagName('')
        addToast('success', 'Tag created')
        fetchTags()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create tag')
      }
    } catch {
      addToast('error', 'Failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editingTag || !editName.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })

      if (res.ok) {
        setEditingTag(null)
        addToast('success', 'Tag renamed')
        fetchTags()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to rename tag')
      }
    } catch {
      addToast('error', 'Failed to rename tag')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTag) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/tags/${deletingTag.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeletingTag(null)
        addToast('success', 'Tag deleted')
        fetchTags()
      } else {
        addToast('error', 'Failed to delete tag')
      }
    } catch {
      addToast('error', 'Failed to delete tag')
    } finally {
      setDeleting(false)
    }
  }

  const totalPapersTagged = tags.reduce((sum, t) => sum + t._count.papers, 0)

  // Calculate max count for relative sizing in tag cloud
  const maxCount = Math.max(...tags.map((t) => t._count.papers), 1)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stats bar */}
      <div className="flex items-center gap-6 animate-fade-in">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Hash size={16} className="text-accent" />
          <span>
            <strong className="text-text-primary">{tags.length}</strong> tag
            {tags.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <FileText size={16} className="text-accent" />
          <span>
            <strong className="text-text-primary">{totalPapersTagged}</strong> tagged paper
            {totalPapersTagged !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Create tag */}
      <form
        onSubmit={handleCreate}
        className="glass-card p-5 flex flex-col sm:flex-row items-end gap-3 animate-slide-up"
      >
        <div className="flex-1 w-full">
          <Input
            label="New Tag"
            placeholder="Enter tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          loading={creating}
          icon={<Plus size={16} />}
          className="shrink-0"
        >
          Create Tag
        </Button>
      </form>

      {/* Tag Cloud */}
      {!loading && tags.length > 0 && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
            Tag Cloud
          </h3>
          <div className="flex flex-wrap gap-3 items-center">
            {tags.map((tag) => {
              // Scale font size from 0.75rem to 1.5rem based on paper count
              const ratio = tag._count.papers / maxCount
              const fontSize = 0.75 + ratio * 0.75
              const opacity = 0.5 + ratio * 0.5

              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    setEditingTag(tag)
                    setEditName(tag.name)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default
                    hover:border-accent hover:bg-accent-subtle
                    transition-all duration-200 cursor-pointer group"
                  style={{ fontSize: `${fontSize}rem`, opacity }}
                  title={`${tag._count.papers} paper${tag._count.papers !== 1 ? 's' : ''}`}
                >
                  <span className="text-text-secondary group-hover:text-accent transition-colors">
                    {tag.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="64px" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tags.length === 0 && (
        <EmptyState
          icon={<TagsIcon size={48} />}
          title="No tags yet"
          description="Create your first tag to start organizing papers by topic."
        />
      )}

      {/* Tags list */}
      {!loading && tags.length > 0 && (
        <div className="space-y-2 stagger-children">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg
                bg-bg-secondary border border-border-default
                hover:border-border-hover transition-all duration-200
                animate-slide-up"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center">
                  <Hash size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{tag.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {tag._count.papers} paper{tag._count.papers !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingTag(tag)
                    setEditName(tag.name)
                  }}
                  className="p-2 rounded-lg text-text-tertiary hover:text-text-primary
                    hover:bg-bg-tertiary transition-all duration-200 cursor-pointer"
                  aria-label="Edit tag"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeletingTag(tag)}
                  className="p-2 rounded-lg text-text-tertiary hover:text-danger
                    hover:bg-danger-subtle transition-all duration-200 cursor-pointer"
                  aria-label="Delete tag"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={!!editingTag}
        onClose={() => setEditingTag(null)}
        title="Rename Tag"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Tag Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter new name..."
          />
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleEdit} loading={saving}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditingTag(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={!!deletingTag}
        onClose={() => setDeletingTag(null)}
        title="Delete Tag"
        description={`Are you sure you want to delete "${deletingTag?.name}"? This will unlink it from ${deletingTag?._count.papers || 0} paper(s). Papers will not be deleted.`}
        size="sm"
      >
        <div className="flex items-center gap-3 pt-2">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete Tag
          </Button>
          <Button variant="ghost" onClick={() => setDeletingTag(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
