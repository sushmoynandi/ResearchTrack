'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Key, Sparkles, Building, ArrowRight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface JoinLabModalProps {
  isOpen: boolean
  onClose: () => void
  onJoined: (lab: any) => void
}

export function JoinLabModal({ isOpen, onClose, onJoined }: JoinLabModalProps) {
  const { addToast } = useToast()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/labs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      })

      if (res.ok) {
        const data = await res.json()
        addToast('success', `Enrolled in "${data.lab.name}"! Welcome to the lab.`)
        onJoined(data.lab)
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Invalid join code')
      }
    } catch {
      addToast('error', 'Network error joining lab')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Academic Research Lab"
      description="Enter the 6-12 character Join Code provided by your faculty supervisor / lab lead."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Lab Join Code *
          </label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-3 text-accent" />
            <input
              type="text"
              placeholder="e.g. ALIGN2026"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              maxLength={15}
              className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-bold tracking-wider text-text-primary uppercase focus:outline-none focus:border-accent text-center"
            />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1.5 text-center">
            Ask your faculty advisor for their lab invite code.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<ArrowRight size={14} />}>
            Join Lab
          </Button>
        </div>
      </form>
    </Modal>
  )
}
