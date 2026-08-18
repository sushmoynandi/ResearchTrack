'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building,
  Users,
  Key,
  Plus,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  GraduationCap,
  Layers,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateLabModal } from '@/components/labs/CreateLabModal'
import { JoinLabModal } from '@/components/labs/JoinLabModal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface LabItem {
  id: string
  name: string
  slug: string
  joinCode: string
  institution: string
  department: string | null
  description: string | null
  lead: { id: string; name: string; email: string }
  _count: { members: number; groups: number }
}

export default function LabsPage() {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [labs, setLabs] = useState<LabItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const fetchLabs = async () => {
    try {
      const res = await fetch('/api/labs')
      if (res.ok) {
        const data = await res.json()
        setLabs(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLabs()
  }, [])

  const copyJoinCode = (labId: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeId(labId)
    addToast('info', `Copied Lab Join Code: ${code}`)
    setTimeout(() => setCopiedCodeId(null), 1500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <Building size={22} className="text-accent" /> Academic Research Labs &amp; Clusters
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Collaborative laboratory hubs: group literature libraries, sub-team clusters, and unified student rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsJoinOpen(true)} icon={<Key size={14} />}>
            Join with Code
          </Button>

          {(isSupervisor || isAdmin) && (
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} icon={<Plus size={16} />}>
              Establish Lab
            </Button>
          )}
        </div>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="220px" />
          ))}
        </div>
      ) : labs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {labs.map((lab) => (
            <div
              key={lab.id}
              className="glass-card p-6 flex flex-col justify-between space-y-5 hover:border-accent/40 transition-all group"
            >
              <div className="space-y-3">
                {/* Institution Tag */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-accent tracking-wider">
                    {lab.institution}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyJoinCode(lab.id, lab.joinCode)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary text-[10px] font-mono border border-border-default transition-colors cursor-pointer"
                    title="Click to copy join code"
                  >
                    <Key size={10} className="text-accent" />
                    <span>{lab.joinCode}</span>
                    {copiedCodeId === lab.id ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                  </button>
                </div>

                {/* Lab Title */}
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display group-hover:text-accent transition-colors line-clamp-1">
                    {lab.name}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Lead: <strong className="text-text-secondary">{lab.lead.name}</strong>
                    {lab.department ? ` • ${lab.department}` : ''}
                  </p>
                </div>

                {/* Description */}
                {lab.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {lab.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default/60 text-center">
                  <div className="p-2 rounded-lg bg-bg-tertiary/40 border border-border-default/40">
                    <p className="text-[10px] text-text-tertiary flex items-center justify-center gap-1">
                      <Users size={11} /> Members
                    </p>
                    <p className="text-sm font-bold text-text-primary">{lab._count?.members || 1}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-bg-tertiary/40 border border-border-default/40">
                    <p className="text-[10px] text-text-tertiary flex items-center justify-center gap-1">
                      <Layers size={11} /> Sub-Groups
                    </p>
                    <p className="text-sm font-bold text-accent">{lab._count?.groups || 0}</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link href={`/labs/${lab.slug || lab.id}`} className="w-full">
                  <Button size="xs" variant="secondary" className="w-full justify-center" icon={<ArrowRight size={13} />}>
                    Enter Lab Center
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
            <Building size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-text-primary font-display">
              No Academic Research Labs Enrolled
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Supervisors can establish a new research lab, or students can enter an advisor&apos;s 6-character Join Code to get started.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsJoinOpen(true)} icon={<Key size={14} />}>
              Enter Join Code
            </Button>
            {(isSupervisor || isAdmin) && (
              <Button variant="primary" onClick={() => setIsCreateOpen(true)} icon={<Plus size={16} />}>
                Establish New Lab
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateLabModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchLabs()}
      />

      <JoinLabModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoined={() => fetchLabs()}
      />
    </div>
  )
}
