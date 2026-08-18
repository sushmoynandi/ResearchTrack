'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { Collection } from '@/lib/types'

const PRESET_COLORS = [
  '#06b6d4', // Cyan / Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#6366f1', // Indigo
]

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collection?: Collection | null
  onSuccess: () => void
}

export function CollectionModal({
  isOpen,
  onClose,
  collection,
  onSuccess,
}: CollectionModalProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#06b6d4')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (collection) {
      setName(collection.name)
      setDescription(collection.description || '')
      setColor(collection.color || '#06b6d4')
    } else {
      setName('')
      setDescription('')
      setColor('#06b6d4')
    }
  }, [collection, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const endpoint = collection
        ? `/api/collections/${collection.id}`
        : '/api/collections'
      const method = collection ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color }),
      })

      if (res.ok) {
        addToast(
          'success',
          collection ? 'Collection updated' : 'Collection created'
        )
        onSuccess()
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to save collection')
      }
    } catch {
      addToast('error', 'Failed to save collection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={collection ? 'Edit Collection' : 'New Collection'}
      description={
        collection
          ? 'Update collection details and visual tag'
          : 'Create a collection to group research papers by topic or project'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Collection Name *"
          placeholder="e.g. LLM Reasoning, Thesis Chapter 2..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          placeholder="Short note about what this collection covers..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Color picker presets */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-2">
            Color Accent
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  color === c ? 'scale-110 ring-2 ring-white/60' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {collection ? 'Save Changes' : 'Create Collection'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
