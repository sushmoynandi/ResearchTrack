'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Building, Sparkles, Key, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface CreateLabModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (lab: any) => void
}

export function CreateLabModal({ isOpen, onClose, onCreated }: CreateLabModalProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [description, setDescription] = useState('')
  const [customJoinCode, setCustomJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          institution,
          department,
          description,
          customJoinCode: customJoinCode || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addToast('success', `Created Research Lab: "${data.name}"! Join Code: ${data.joinCode}`)
        onCreated(data)
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create lab')
      }
    } catch {
      addToast('error', 'Network error creating lab')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Found Academic Research Lab"
      description="Create a formal lab workspace for your students, research clusters, and literature reviews."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Lab Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Stanford NLP & Alignment Laboratory"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              University / Institution *
            </label>
            <input
              type="text"
              placeholder="e.g. Stanford University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Department (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Custom Join Code (Optional)
          </label>
          <div className="relative">
            <Key size={14} className="absolute left-3 top-2.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="e.g. ALIGN2026 (Leave empty for auto-generated code)"
              value={customJoinCode}
              onChange={(e) => setCustomJoinCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-text-primary uppercase focus:outline-none focus:border-accent"
            />
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">
            Students can enter this code to join your lab instantly.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Research Mission &amp; Focus Area
          </label>
          <textarea
            placeholder="e.g. Advancing large language model reasoning, constitutional alignment, and empirical reliability..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<Sparkles size={13} />}>
            Establish Lab
          </Button>
        </div>
      </form>
    </Modal>
  )
}
