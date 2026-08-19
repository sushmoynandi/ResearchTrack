'use client'

import React, { useState } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Copy,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import type { Note } from '@/lib/types'

interface NotesSectionProps {
  paperId: string
  initialNotes?: Note[]
}

export function NotesSection({ paperId, initialNotes = [] }: NotesSectionProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newContent, setNewContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [updating, setUpdating] = useState(false)

  // Delete state
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newContent.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })

      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        setNewContent('')
        setIsAdding(false)
        addToast('success', 'Note added')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to add note')
      }
    } catch {
      addToast('error', 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })

      if (res.ok) {
        const updated = await res.json()
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, content: updated.content, updatedAt: updated.updatedAt } : n))
        )
        setEditingNoteId(null)
        setEditContent('')
        addToast('success', 'Note updated')
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update note')
      }
    } catch {
      addToast('error', 'Failed to update note')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!deletingNote) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/notes/${deletingNote.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id))
        setDeletingNote(null)
        addToast('success', 'Note deleted')
      } else {
        addToast('error', 'Failed to delete note')
      }
    } catch {
      addToast('error', 'Failed to delete note')
    } finally {
      setDeleting(false)
    }
  }

  const copyNote = (content: string) => {
    navigator.clipboard.writeText(content)
    addToast('info', 'Note copied to clipboard')
  }

  const insertTemplate = (prefix: string) => {
    setNewContent((prev) => (prev ? `${prev}\n${prefix}` : prefix))
    setIsAdding(true)
  }

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="text-base font-semibold text-text-primary font-display">
            Notes & Annotations
          </h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-bg-tertiary text-text-secondary border border-border-default font-mono">
            {notes.length}
          </span>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            icon={<Plus size={14} />}
          >
            Add Note
          </Button>
        )}
      </div>

      {/* Add note panel */}
      {isAdding && (
        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-3 animate-slide-up">
          {/* Quick template helpers */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-tertiary flex items-center gap-1">
              <Sparkles size={12} className="text-accent" /> Quick snippets:
            </span>
            <button
              type="button"
              onClick={() => insertTemplate('💡 **Key Takeaway:** ')}
              className="px-2 py-1 rounded bg-bg-elevated hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Key Takeaway
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('🔬 **Methodology / Setup:** ')}
              className="px-2 py-1 rounded bg-bg-elevated hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Methodology
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('⚠️ **Limitation / Open Question:** ')}
              className="px-2 py-1 rounded bg-bg-elevated hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Limitations
            </button>
          </div>

          <Textarea
            placeholder="Write markdown research notes, thoughts, insights, or quotes..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            className="min-h-[110px]"
            autoFocus
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-tertiary">
              Supports markdown formatting
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewContent('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNote}
                loading={submitting}
                disabled={!newContent.trim()}
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !isAdding ? (
        <div className="text-center py-8 border border-dashed border-border-default rounded-xl p-6">
          <BookOpen size={32} className="mx-auto mb-2 text-text-tertiary opacity-60" />
          <p className="text-sm text-text-secondary">No notes yet for this paper.</p>
          <p className="text-xs text-text-tertiary mt-1">
            Keep track of key findings, quotes, methodology details, and critical insights.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            icon={<Plus size={14} />}
            onClick={() => setIsAdding(true)}
          >
            Create first note
          </Button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {notes.map((note) => {
            const isEditingThis = editingNoteId === note.id

            return (
              <div
                key={note.id}
                className="group relative p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-border-hover transition-all duration-200"
              >
                {isEditingThis ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => {
                          setEditingNoteId(null)
                          setEditContent('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => handleUpdateNote(note.id)}
                        loading={updating}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyNote(note.content)}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                          title="Copy note"
                        >
                          <Copy size={13} />
                        </button>
                        {note.userId === user?.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setEditContent(note.content)
                              }}
                              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                              title="Edit note"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingNote(note)}
                              className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
                              title="Delete note"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border-default/60 flex items-center justify-between text-xs text-text-tertiary">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-text-secondary">
                          {note.user?.name || 'Researcher'}
                          {note.user?.systemRole ? ` · ${note.user.systemRole}` : ''}
                        </span>
                        <span>
                          {new Date(note.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <span className="italic text-[11px]">edited</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingNote}
        onClose={() => setDeletingNote(null)}
        title="Delete Note"
        description="Are you sure you want to delete this research note? This cannot be undone."
        size="sm"
      >
        <div className="flex items-center gap-3 pt-2">
          <Button variant="danger" onClick={handleDeleteNote} loading={deleting}>
            Delete Note
          </Button>
          <Button variant="ghost" onClick={() => setDeletingNote(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
