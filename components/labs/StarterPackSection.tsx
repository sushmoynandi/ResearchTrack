'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface StarterItem {
  id: string
  groupId: string
  paperId: string
  order: number
  note: string | null
  paper: {
    id: string
    title: string
    authors: string
    journal: string | null
    publicationYear: number | null
  }
}

interface StarterPackSectionProps {
  labId: string
  groupId: string
  groupName: string
  isLeadOrSupervisor: boolean
}

export function StarterPackSection({
  labId,
  groupId,
  groupName,
  isLeadOrSupervisor,
}: StarterPackSectionProps) {
  const { user, isStudent } = useAuth()
  const { addToast } = useToast()

  const [items, setItems] = useState<StarterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Add Paper Form State
  const [availablePapers, setAvailablePapers] = useState<{ id: string; title: string }[]>([])
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [syllabusNote, setSyllabusNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStarterPack = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/starter-pack`)
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) fetchStarterPack()
  }, [groupId])

  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true)
    try {
      const res = await fetch('/api/papers')
      if (res.ok) {
        const data = await res.json()
        const paperList = Array.isArray(data) ? data.map((p: any) => ({ id: p.id, title: p.title })) : []
        setAvailablePapers(paperList)
        if (paperList.length > 0) setSelectedPaperId(paperList[0].id)
      }
    } catch {
      // silent
    }
  }

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaperId) {
      addToast('error', 'Please select a paper from your library.')
      return
    }
    setSubmitting(true)

    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/starter-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: selectedPaperId,
          note: syllabusNote,
        }),
      })

      if (res.ok) {
        addToast('success', 'Added paper to Starter Pack!')
        setIsAddModalOpen(false)
        setSyllabusNote('')
        fetchStarterPack()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to add paper to starter pack')
      }
    } catch {
      addToast('error', 'Network error adding paper')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (paperId: string) => {
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/starter-pack?paperId=${paperId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Paper removed from starter pack')
        fetchStarterPack()
      }
    } catch {
      addToast('error', 'Failed to remove')
    }
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const res = await fetch(`/api/labs/${labId}/groups/${groupId}/starter-pack/enroll`, {
        method: 'POST',
      })
      if (res.ok) {
        const result = await res.json()
        addToast('success', `Enrolled in "${groupName}" Syllabus! Added ${result.enrolledCount} papers to your queue.`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to enroll')
      }
    } catch {
      addToast('error', 'Network error enrolling')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="glass-card p-6 space-y-5 border-border-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
            <BookOpen size={18} className="text-accent" /> {groupName} Starter Pack (Must-Read Syllabus)
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Curated foundational papers every researcher in this sub-group must synthesize.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              size="xs"
              variant="secondary"
              onClick={handleEnroll}
              loading={enrolling}
              icon={<GraduationCap size={13} className="text-accent" />}
            >
              1-Click Enroll in Starter Pack
            </Button>
          )}

          {isLeadOrSupervisor && (
            <Button size="xs" variant="primary" onClick={handleOpenAddModal} icon={<Plus size={13} />}>
              Add Paper
            </Button>
          )}
        </div>
      </div>

      {/* Syllabus Papers List */}
      {loading ? (
        <div className="p-6 text-center text-xs text-text-tertiary">Loading starter pack...</div>
      ) : items.length > 0 ? (
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-bg-secondary border border-border-default flex items-start justify-between gap-4 hover:border-accent/40 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-6 h-6 rounded-md bg-accent/15 text-accent font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="min-w-0 space-y-0.5">
                  <Link
                    href={`/papers/${item.paper.id}`}
                    className="text-xs font-bold text-text-primary hover:text-accent transition-colors block truncate"
                  >
                    {item.paper.title}
                  </Link>
                  <p className="text-[11px] text-text-tertiary truncate">
                    {item.paper.authors} {item.paper.publicationYear ? `(${item.paper.publicationYear})` : ''}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-accent/90 italic pt-0.5">
                      Advisor Note: &ldquo;{item.note}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/papers/${item.paper.id}`}>
                  <Button size="xs" variant="ghost" icon={<ArrowRight size={12} />}>
                    View
                  </Button>
                </Link>
                {isLeadOrSupervisor && (
                  <button
                    onClick={() => handleRemove(item.paperId)}
                    className="text-text-tertiary hover:text-rose-400 p-1 cursor-pointer"
                    title="Remove from starter pack"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-text-tertiary space-y-2">
          <BookOpen size={24} className="mx-auto opacity-30 text-accent" />
          <p>No foundational starter pack papers curated for this sub-group yet.</p>
        </div>
      )}

      {/* Add Paper Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={`Add Syllabus Paper to "${groupName}"`}
          description="Select a foundational literature paper to include in this sub-group's onboarding starter pack."
          size="md"
        >
          <form onSubmit={handleAddPaper} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Select Paper from Library *
              </label>

              {availablePapers.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  No papers found in your library. Please add a research paper to the library first.
                </div>
              ) : (
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  required
                >
                  <option value="" disabled>-- Select a paper --</option>
                  {availablePapers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Onboarding Reading Guidance (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Must understand Section 3 self-attention mechanism before implementing."
                value={syllabusNote}
                onChange={(e) => setSyllabusNote(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={availablePapers.length === 0 || !selectedPaperId}
                loading={submitting}
                icon={<Sparkles size={13} />}
              >
                Add to Syllabus
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
