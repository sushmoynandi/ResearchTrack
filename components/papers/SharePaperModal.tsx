'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Share2,
  Users,
  Search,
  Check,
  Copy,
  Trash2,
  Lock,
  Globe,
  UserCheck,
  Sparkles,
  Shield,
  GraduationCap,
} from 'lucide-react'
import type { PaperShare } from '@/lib/types'

interface PeerStudent {
  id: string
  name: string
  email: string
  image?: string | null
  department?: string | null
  institution?: string | null
}

interface SharePaperModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  paperTitle: string
  paperSlug?: string | null
  currentShares?: PaperShare[]
  onSharesUpdated?: () => void
}

export function SharePaperModal({
  isOpen,
  onClose,
  paperId,
  paperTitle,
  paperSlug,
  currentShares = [],
  onSharesUpdated,
}: SharePaperModalProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [peers, setPeers] = useState<PeerStudent[]>([])
  const [loadingPeers, setLoadingPeers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeerId, setSelectedPeerId] = useState('')
  const [permission, setPermission] = useState<'VIEW' | 'COMMENT'>('VIEW')
  const [shareNote, setShareNote] = useState('')
  const [sharing, setSharing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [sharesList, setSharesList] = useState<PaperShare[]>(currentShares)
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch active shares whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetch(`/api/papers/${paperId}/shares`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setSharesList(data))
        .catch(() => {})

      if (peers.length === 0) {
        setLoadingPeers(true)
        fetch('/api/peers')
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            setPeers(data)
            if (data.length > 0) setSelectedPeerId(data[0].id)
          })
          .catch(() => {})
          .finally(() => setLoadingPeers(false))
      }
    }
  }, [isOpen, paperId, peers.length])

  // Filter peers by search query and exclude already shared peers
  const sharedPeerIds = new Set(sharesList.map((s) => s.sharedWithId))
  const filteredPeers = peers.filter((peer) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = peer.name?.toLowerCase().includes(q)
      const matchEmail = peer.email?.toLowerCase().includes(q)
      const matchDept = peer.department?.toLowerCase().includes(q)
      return matchName || matchEmail || matchDept
    }
    return true
  })

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeerId) {
      addToast('error', 'Please select a student to share with')
      return
    }

    setSharing(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharedWithId: selectedPeerId,
          permission,
          note: shareNote.trim() || undefined,
        }),
      })

      if (res.ok) {
        const createdShare = await res.json()
        setSharesList((prev) => [
          createdShare,
          ...prev.filter((s) => s.sharedWithId !== selectedPeerId),
        ])
        setShareNote('')
        addToast('success', `Paper shared with ${createdShare.sharedWith?.name || 'peer student'}!`)
        onSharesUpdated?.()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to share paper')
      }
    } catch {
      addToast('error', 'Network error sharing paper')
    } finally {
      setSharing(false)
    }
  }

  const handleRevokeShare = async (shareId: string, studentName: string) => {
    setRevokingId(shareId)
    try {
      const res = await fetch(`/api/papers/${paperId}/shares?shareId=${shareId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSharesList((prev) => prev.filter((s) => s.id !== shareId))
        addToast('info', `Revoked share with ${studentName}`)
        onSharesUpdated?.()
      } else {
        addToast('error', 'Failed to revoke share')
      }
    } catch {
      addToast('error', 'Network error revoking share')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/papers/${paperSlug || paperId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    addToast('success', 'Paper link copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Paper with Peer Researchers" size="lg">
      <div className="space-y-6">
        {/* Paper Header Preview */}
        <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-accent/15 text-accent uppercase tracking-wider">
              Research Paper
            </span>
            <span className="text-xs text-text-tertiary">Select colleagues to collaborate</span>
          </div>
          <h4 className="text-sm font-semibold text-text-primary line-clamp-1">{paperTitle}</h4>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-tertiary font-mono">
              /papers/{paperSlug || paperId}
            </span>
            <Button
              size="xs"
              variant="secondary"
              icon={copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              onClick={handleCopyLink}
            >
              {copiedLink ? 'Link Copied' : 'Copy Direct Link'}
            </Button>
          </div>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShare} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Select Student Researcher
            </label>

            {loadingPeers ? (
              <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-tertiary animate-pulse">
                Loading peer student directory...
              </div>
            ) : peers.length === 0 ? (
              <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-tertiary">
                No other student accounts registered yet.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    placeholder="Search students by name or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary divide-y divide-border-default/50">
                  {filteredPeers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-text-tertiary">
                      No matching students found
                    </div>
                  ) : (
                    filteredPeers.map((peer) => {
                      const isAlreadyShared = sharedPeerIds.has(peer.id)
                      const isSelected = selectedPeerId === peer.id

                      return (
                        <button
                          key={peer.id}
                          type="button"
                          onClick={() => setSelectedPeerId(peer.id)}
                          className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-accent/15 text-accent font-medium'
                              : 'hover:bg-bg-tertiary text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">
                              {peer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold flex items-center gap-1.5">
                                {peer.name}
                                {isAlreadyShared && (
                                  <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-400 font-normal">
                                    Already Shared
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-tertiary">
                                {peer.department || peer.institution || peer.email}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-accent shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Collaboration Permission
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'VIEW' | 'COMMENT')}
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="VIEW">Can View (Read paper &amp; digest)</option>
                <option value="COMMENT">Can Comment &amp; Annotate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Optional Message / Context
              </label>
              <input
                type="text"
                placeholder="e.g. Check section 4 for baseline numbers"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              type="submit"
              disabled={!selectedPeerId || sharing}
              icon={<Share2 size={14} />}
            >
              {sharing ? 'Sharing...' : 'Share Paper'}
            </Button>
          </div>
        </form>

        {/* Current Active Shares List */}
        {sharesList.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border-default">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Users size={14} className="text-accent" /> Active Shared Collaborators (
                {sharesList.length})
              </h5>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sharesList.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-bg-tertiary/70 border border-border-default text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                      {share.sharedWith?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">
                        {share.sharedWith?.name || 'Peer Researcher'}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        {share.sharedWith?.email} • Permission:{' '}
                        <span className="text-accent font-medium">{share.permission}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRevokeShare(share.id, share.sharedWith?.name || 'student')
                    }
                    disabled={revokingId === share.id}
                    className="p-1.5 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Revoke access"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
