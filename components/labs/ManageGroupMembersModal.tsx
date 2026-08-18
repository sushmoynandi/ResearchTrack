'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Users, UserPlus, Check, Search, ShieldCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface LabMemberItem {
  id: string
  role: string
  user: {
    id: string
    name: string
    email: string
    department?: string | null
    systemRole: string
  }
}

interface ManageGroupMembersModalProps {
  isOpen: boolean
  onClose: () => void
  labId: string
  groupId: string
  groupName: string
  labMembers: LabMemberItem[]
  currentMemberUserIds: string[]
  onUpdated: () => void
}

export function ManageGroupMembersModal({
  isOpen,
  onClose,
  labId,
  groupId,
  groupName,
  labMembers,
  currentMemberUserIds,
  onUpdated,
}: ManageGroupMembersModalProps) {
  const { addToast } = useToast()
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([...currentMemberUserIds])
      setSearchQuery('')
    }
  }, [isOpen, currentMemberUserIds])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    const studentUserIds = labMembers
      .filter((m) => m.user.systemRole === 'STUDENT' || m.role === 'RESEARCHER')
      .map((m) => m.user.id)
    setSelectedUserIds(studentUserIds)
  }

  const handleClearAll = () => {
    setSelectedUserIds([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/labs/${labId}/groups`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          memberUserIds: selectedUserIds,
        }),
      })

      if (res.ok) {
        addToast('success', `Updated members for "${groupName}"! (${selectedUserIds.length} assigned)`)
        onUpdated()
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update members')
      }
    } catch {
      addToast('error', 'Network error updating members')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = labMembers.filter((m) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      m.user.name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      (m.user.department && m.user.department.toLowerCase().includes(q))
    )
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Students to Sub-Group`}
      description={`Select which lab researchers and students belong to "${groupName}".`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search lab members by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-8 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-text-secondary font-medium">
            <strong className="text-accent font-bold">{selectedUserIds.length}</strong> of{' '}
            {labMembers.length} lab members assigned
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] text-accent hover:underline cursor-pointer font-medium"
            >
              Select All
            </button>
            <span className="text-border-default">•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Members Roster List */}
        <div className="max-h-64 overflow-y-auto border border-border-default rounded-xl p-2 space-y-1 bg-bg-tertiary/40">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((m) => {
              const isChecked = selectedUserIds.includes(m.user.id)
              return (
                <div
                  key={m.id}
                  onClick={() => toggleUser(m.user.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                    isChecked
                      ? 'bg-accent/15 border-accent/40 text-accent font-medium'
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border-default/60 text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        isChecked
                          ? 'bg-accent text-white'
                          : 'bg-bg-tertiary text-text-tertiary border border-border-default'
                      }`}
                    >
                      {m.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-text-primary truncate">{m.user.name}</span>
                        {m.role === 'LEAD' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-tertiary truncate">
                        {m.user.email} {m.user.department ? `• ${m.user.department}` : ''}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-accent border-accent text-white'
                        : 'border-border-default bg-bg-tertiary'
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-text-tertiary p-4 text-center">
              No lab members found matching your search.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<UserPlus size={13} />}>
            Save Group Roster
          </Button>
        </div>
      </form>
    </Modal>
  )
}
