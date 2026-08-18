'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Users, Sparkles, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  labId: string
  labMembers: { id: string; user: { id: string; name: string; email: string } }[]
  onCreated: (group: any) => void
}

const COLOR_OPTIONS = [
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
]

export function CreateGroupModal({
  isOpen,
  onClose,
  labId,
  labMembers,
  onCreated,
}: CreateGroupModalProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('cyan')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/labs/${labId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          color,
          memberUserIds: selectedUserIds,
        }),
      })

      if (res.ok) {
        const group = await res.json()
        addToast('success', `Created research group: "${group.name}"!`)
        onCreated(group)
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create group')
      }
    } catch {
      addToast('error', 'Network error creating group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Research Sub-Group / Cluster"
      description="Organize students into focused project teams (e.g. Reasoning Team, Multimodal Cluster)."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Group Name *
          </label>
          <input
            type="text"
            placeholder="e.g. LLM Reasoning &amp; Alignment Cluster"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Color Accent Tag
          </label>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  color === c.id ? `${c.bg} shadow-sm ring-1 ring-accent` : 'bg-bg-tertiary border-border-default text-text-secondary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Project Scope &amp; Deliverables
          </label>
          <textarea
            placeholder="e.g. Focused on reproducing DPO, KTO, and RLHF on reasoning benchmarks."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Member Checkbox Roster */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-text-secondary">
            Assign Lab Members ({selectedUserIds.length} selected)
          </label>
          <div className="max-h-40 overflow-y-auto border border-border-default rounded-xl p-2 space-y-1 bg-bg-tertiary/40">
            {labMembers.length > 0 ? (
              labMembers.map((m) => {
                const isChecked = selectedUserIds.includes(m.user.id)
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleUser(m.user.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-accent/15 text-accent font-medium' : 'hover:bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-text-primary">{m.user.name}</span>
                      <span className="text-[10px] text-text-tertiary ml-2">({m.user.email})</span>
                    </div>
                    {isChecked && <Check size={14} className="text-accent" />}
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-text-tertiary p-2 text-center">No other members in this lab yet.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<Sparkles size={13} />}>
            Create Sub-Group
          </Button>
        </div>
      </form>
    </Modal>
  )
}
