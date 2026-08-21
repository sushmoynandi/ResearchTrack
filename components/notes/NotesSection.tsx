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
  Lock,
  Globe,
  ShieldCheck,
  EyeOff,
  GraduationCap,
  Users,
} from 'lucide-react'
import type { Note } from '@/lib/types'

interface NotesSectionProps {
  paperId: string
  initialNotes?: Note[]
  selectedStudentId?: string
  students?: { id: string; name: string }[]
}

export function NotesSection({
  paperId,
  initialNotes = [],
  selectedStudentId,
  students = [],
}: NotesSectionProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [notes, setNotes] = useState<Note[]>(() =>
    (initialNotes || []).filter((n) => !n.isPrivate || n.userId === user?.id)
  )
  const [newContent, setNewContent] = useState('')
  const [newIsPrivate, setNewIsPrivate] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterMode, setFilterMode] = useState<'ALL' | 'PUBLIC' | 'PRIVATE' | 'STUDENT'>('ALL')

  React.useEffect(() => {
    const visible = (initialNotes || []).filter(
      (n) => !n.isPrivate || n.userId === user?.id
    )
    setNotes(visible)
  }, [initialNotes, user?.id])

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editIsPrivate, setEditIsPrivate] = useState(false)
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
        body: JSON.stringify({
          content: newContent,
          isPrivate: newIsPrivate,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        setNewContent('')
        setNewIsPrivate(false)
        setIsAdding(false)
        addToast('success', created.isPrivate ? 'Private note saved (only visible to you)' : 'Public note added')
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
        body: JSON.stringify({
          content: editContent,
          isPrivate: editIsPrivate,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, content: updated.content, isPrivate: updated.isPrivate, updatedAt: updated.updatedAt }
              : n
          )
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

  const publicNotesCount = notes.filter((n) => !n.isPrivate).length
  const myPrivateNotesCount = notes.filter((n) => n.isPrivate && n.userId === user?.id).length

  const selectedStudentObj = selectedStudentId ? students.find((s) => s.id === selectedStudentId) : null
  const selectedStudentName = selectedStudentObj?.name || 'Selected Student'
  const selectedStudentNotesCount = selectedStudentId
    ? notes.filter((n) => n.userId === selectedStudentId).length
    : 0

  const filteredNotes = notes.filter((n) => {
    if (filterMode === 'PUBLIC') return !n.isPrivate
    if (filterMode === 'PRIVATE') return n.isPrivate && n.userId === user?.id
    if (filterMode === 'STUDENT' && selectedStudentId) {
      return n.userId === selectedStudentId || n.userId === user?.id || (n.user?.systemRole === 'SUPERVISOR' && !n.isPrivate)
    }
    return true
  })

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-accent" />
            <h3 className="text-base font-semibold text-text-primary font-display">
              Notes &amp; Annotations
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-bg-tertiary text-text-secondary border border-border-default font-mono">
              {notes.length}
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            Organize study notes. Public notes are shared with supervisors, while private notes are strictly confidential to you.
          </p>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            onClick={() => {
              setIsAdding(true)
              setNewIsPrivate(false)
            }}
            icon={<Plus size={14} />}
          >
            Add Note
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border-default pb-3 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {selectedStudentId && selectedStudentId !== user?.id && selectedStudentNotesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('STUDENT')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'STUDENT'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <GraduationCap size={12} /> {selectedStudentName}&apos;s Notes ({selectedStudentNotesCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterMode('PUBLIC')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterMode === 'PUBLIC'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Globe size={12} /> Public ({publicNotesCount})
          </button>
          {myPrivateNotesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('PRIVATE')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'PRIVATE'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Lock size={12} /> My Private ({myPrivateNotesCount})
            </button>
          )}
        </div>
      )}

      {/* Add note panel */}
      {isAdding && (
        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-3.5 animate-slide-up">
          {/* Privacy Selector Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-bg-primary/80 border border-border-default">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Visibility:</span>
              <div className="inline-flex rounded-lg bg-bg-secondary p-0.5 border border-border-default">
                <button
                  type="button"
                  onClick={() => setNewIsPrivate(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    !newIsPrivate
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Globe size={13} /> Public Note
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsPrivate(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    newIsPrivate
                      ? 'bg-amber-500/20 text-amber-400 font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Lock size={13} /> Private Note
                </button>
              </div>
            </div>

            <span className="text-[11px] text-text-tertiary flex items-center gap-1">
              {newIsPrivate ? (
                <>
                  <EyeOff size={12} className="text-amber-400" /> Only visible to you. Supervisor cannot see.
                </>
              ) : (
                <>
                  <ShieldCheck size={12} className="text-emerald-400" /> Visible to supervisor and research team.
                </>
              )}
            </span>
          </div>

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
            placeholder={
              newIsPrivate
                ? 'Write private confidential thoughts, draft queries, or personal review notes (hidden from supervisor)...'
                : 'Write public research notes, findings, and takeaways for discussion with your supervisor...'
            }
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
                  setNewIsPrivate(false)
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
                Save {newIsPrivate ? 'Private Note' : 'Public Note'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 && !isAdding ? (
        <div className="text-center py-8 border border-dashed border-border-default rounded-xl p-6">
          <BookOpen size={32} className="mx-auto mb-2 text-text-tertiary opacity-60" />
          <p className="text-sm text-text-secondary">
            {filterMode === 'PRIVATE'
              ? 'No private notes found.'
              : filterMode === 'PUBLIC'
              ? 'No public notes found.'
              : 'No notes yet for this paper.'}
          </p>
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
          {filteredNotes.map((note) => {
            const isEditingThis = editingNoteId === note.id

            return (
              <div
                key={note.id}
                className={`group relative p-4 rounded-xl bg-bg-secondary border transition-all duration-200 ${
                  note.isPrivate
                    ? 'border-amber-500/30 hover:border-amber-500/50 bg-amber-950/10'
                    : 'border-border-default hover:border-border-hover'
                }`}
              >
                {isEditingThis ? (
                  <div className="space-y-3">
                    {/* Privacy Selector during edit */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-text-primary">Visibility:</span>
                      <div className="inline-flex rounded-md bg-bg-primary p-0.5 border border-border-default">
                        <button
                          type="button"
                          onClick={() => setEditIsPrivate(false)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer ${
                            !editIsPrivate
                              ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                              : 'text-text-secondary'
                          }`}
                        >
                          <Globe size={12} /> Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditIsPrivate(true)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer ${
                            editIsPrivate
                              ? 'bg-amber-500/20 text-amber-400 font-semibold'
                              : 'text-text-secondary'
                          }`}
                        >
                          <Lock size={12} /> Private
                        </button>
                      </div>
                    </div>

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
                      <div className="space-y-2 flex-1">
                        {/* Note Privacy Badge */}
                        <div className="flex items-center gap-2">
                          {note.isPrivate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Lock size={11} /> PRIVATE NOTE (HIDDEN FROM SUPERVISOR)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Globe size={11} /> PUBLIC NOTE (VISIBLE TO SUPERVISOR)
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </div>
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
                                setEditIsPrivate(Boolean(note.isPrivate))
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

