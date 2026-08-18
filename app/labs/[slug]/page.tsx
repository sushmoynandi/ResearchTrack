'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building,
  Users,
  Layers,
  Key,
  Plus,
  CheckCircle2,
  XCircle,
  Mail,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  ShieldAlert,
  User,
  BookOpen,
  UserPlus,
  Trash2,
  Megaphone,
  Calendar,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateGroupModal } from '@/components/labs/CreateGroupModal'
import { ManageGroupMembersModal } from '@/components/labs/ManageGroupMembersModal'
import { LabBroadcastsBoard } from '@/components/labs/LabBroadcastsBoard'
import { StarterPackSection } from '@/components/labs/StarterPackSection'
import { JournalClubSection } from '@/components/labs/JournalClubSection'
import { LabMeetingsBoard } from '@/components/labs/LabMeetingsBoard'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface LabDetail {
  id: string
  name: string
  slug: string
  joinCode: string
  institution: string
  department: string | null
  description: string | null
  leadId: string
  lead: { id: string; name: string; email: string }
  members: {
    id: string
    role: string
    joinedAt: string
    user: { id: string; name: string; email: string; department?: string; systemRole: string }
  }[]
  groups: {
    id: string
    name: string
    description: string | null
    color: string
    members: {
      id: string
      role: string
      user: { id: string; name: string; email: string }
    }[]
  }[]
  joinRequests: {
    id: string
    status: string
    message: string | null
    createdAt: string
    user: { id: string; name: string; email: string; department?: string }
  }[]
}

type TabType = 'groups' | 'noticeboard' | 'meetings' | 'starter-packs' | 'journal-club' | 'members' | 'requests'

export default function LabDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const labSlug = params.slug as string

  const [lab, setLab] = useState<LabDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('groups')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [managingGroup, setManagingGroup] = useState<{ id: string; name: string; memberUserIds: string[] } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const fetchLabDetails = async () => {
    try {
      const res = await fetch(`/api/labs/${labSlug}`)
      if (res.ok) {
        const data = await res.json()
        setLab(data)
        if (data.groups && data.groups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data.groups[0].id)
        }
      } else {
        addToast('error', 'Lab not found')
      }
    } catch {
      addToast('error', 'Network error fetching lab')
    } finally {
      setLoading(false)
    }
  }

  const handleDissolveGroup = async (groupId: string, groupName: string) => {
    if (!lab) return
    if (!confirm(`Are you sure you want to dissolve research group "${groupName}"?`)) return

    try {
      const res = await fetch(`/api/labs/${lab.id}/groups?groupId=${groupId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', `Research group "${groupName}" dissolved`)
        fetchLabDetails()
      } else {
        addToast('error', 'Failed to delete research group')
      }
    } catch {
      addToast('error', 'Network error dissolving group')
    }
  }

  useEffect(() => {
    if (labSlug) fetchLabDetails()
  }, [labSlug])

  const copyJoinCode = () => {
    if (!lab) return
    navigator.clipboard.writeText(lab.joinCode)
    setCopiedCode(true)
    addToast('info', `Copied Lab Join Code: ${lab.joinCode}`)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  const handleRequestDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!lab) return
    try {
      const res = await fetch(`/api/labs/${lab.id}/requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })

      if (res.ok) {
        addToast('success', `Join request ${status.toLowerCase()}!`)
        fetchLabDetails()
      } else {
        addToast('error', 'Failed to update request')
      }
    } catch {
      addToast('error', 'Network error')
    }
  }

  const isLabLead = user && lab && (user.id === lab.leadId || user.systemRole === 'ADMIN')

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-4">
        <Skeleton variant="card" height="150px" />
        <Skeleton variant="card" height="300px" />
      </div>
    )
  }

  if (!lab) {
    return (
      <div className="max-w-xl mx-auto glass-card p-12 text-center space-y-4 my-12">
        <Building size={32} className="mx-auto opacity-30 text-accent" />
        <h3 className="text-lg font-bold text-text-primary">Research Lab Not Found</h3>
        <p className="text-xs text-text-secondary">The requested laboratory could not be located.</p>
        <Link href="/labs">
          <Button variant="secondary" size="sm">
            Back to Labs Directory
          </Button>
        </Link>
      </div>
    )
  }

  const isStudent = Boolean(user && user.systemRole === 'STUDENT' && !isLabLead)
  const visibleGroups = isStudent
    ? lab.groups.filter((g) => g.members.some((m) => m.user.id === user?.id))
    : lab.groups

  const activeGroup = visibleGroups.find((g) => g.id === selectedGroupId) || visibleGroups[0]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Top Breadcrumb */}
      <Link
        href="/labs"
        className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to Labs
      </Link>

      {/* Lab Banner Card */}
      <div className="glass-card p-6 md:p-8 space-y-5 border-accent/30">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-display font-bold text-xl shrink-0">
              {lab.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-accent uppercase tracking-wider">
                  {lab.institution}
                </span>
                {lab.department && (
                  <span className="text-[11px] text-text-tertiary">
                    • {lab.department}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-text-primary font-display">
                {lab.name}
              </h2>

              <p className="text-xs text-text-secondary">
                Principal Investigator: <strong className="text-text-primary">{lab.lead.name}</strong> ({lab.lead.email})
              </p>
            </div>
          </div>

          {/* Join Code Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyJoinCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated border border-border-default transition-all text-xs font-mono cursor-pointer"
              title="Click to copy invite code"
            >
              <Key size={13} className="text-accent" />
              <span className="text-text-secondary">Join Code:</span>
              <strong className="text-text-primary">{lab.joinCode}</strong>
              {copiedCode ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {lab.description && (
          <p className="text-xs text-text-secondary leading-relaxed max-w-3xl pt-2 border-t border-border-default/60">
            {lab.description}
          </p>
        )}

        {/* Quick Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-default">
          {[
            {
              id: 'groups',
              label: isStudent ? `My Sub-Groups (${visibleGroups.length})` : `Sub-Groups (${lab.groups.length})`,
              icon: Layers,
            },
            { id: 'noticeboard', label: 'Noticeboard & Deadlines', icon: Megaphone },
            { id: 'meetings', label: 'Meetings & Syncs', icon: Video },
            { id: 'starter-packs', label: 'Starter Packs', icon: BookOpen },
            { id: 'journal-club', label: 'Journal Club', icon: Calendar },
            { id: 'members', label: `Members (${lab.members.length})`, icon: Users },
            ...(isLabLead
              ? [{ id: 'requests', label: `Join Requests (${lab.joinRequests.length})`, icon: ShieldAlert }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent text-white font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab 1: Research Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <Layers size={16} className="text-accent" />{' '}
              {isStudent
                ? `Your Assigned Sub-Groups (${visibleGroups.length})`
                : `Sub-Teams & Project Clusters (${lab.groups.length})`}
            </h3>

            {isLabLead && (
              <Button size="xs" variant="primary" onClick={() => setIsCreateGroupOpen(true)} icon={<Plus size={13} />}>
                Create Sub-Group
              </Button>
            )}
          </div>

          {visibleGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleGroups.map((g) => (
                <div
                  key={g.id}
                  className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-accent/40 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-accent/15 text-accent border border-accent/30">
                        {g.name.split(' ')[0]} Cluster
                      </span>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        {g.members.length} members
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-text-primary font-display group-hover:text-accent transition-colors">
                      {g.name}
                    </h4>

                    {g.description && (
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {g.description}
                      </p>
                    )}
                  </div>

                  {/* Members list preview */}
                  <div className="space-y-2 pt-3 border-t border-border-default">
                    <span className="text-[10px] uppercase font-bold text-text-tertiary block">Enrolled Researchers</span>
                    <div className="flex flex-wrap gap-1">
                      {g.members.map((m) => (
                        <span
                          key={m.id}
                          className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary text-[11px] font-medium"
                        >
                          {m.user.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar for Supervisor / Lead */}
                  {isLabLead && (
                    <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                      <Button
                        size="xs"
                        variant="secondary"
                        className="flex-1 justify-center text-[11px]"
                        onClick={() =>
                          setManagingGroup({
                            id: g.id,
                            name: g.name,
                            memberUserIds: g.members.map((m) => m.user.id),
                          })
                        }
                        icon={<UserPlus size={12} />}
                      >
                        Assign Students
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleDissolveGroup(g.id, g.name)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Dissolve Sub-Group"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-3">
              <Layers size={28} className="mx-auto opacity-30 text-accent" />
              {isStudent ? (
                <>
                  <h4 className="text-sm font-bold text-text-primary">Not Assigned to a Sub-Group Yet</h4>
                  <p className="max-w-md mx-auto">
                    You are an active member of this laboratory. Your faculty supervisor will assign you to your project cluster.
                  </p>
                </>
              ) : (
                <>
                  <p>No specialized research sub-groups created yet in this lab.</p>
                  {isLabLead && (
                    <Button size="xs" variant="primary" onClick={() => setIsCreateGroupOpen(true)}>
                      Create First Sub-Group
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Noticeboard & Deadlines */}
      {activeTab === 'noticeboard' && (
        <LabBroadcastsBoard labId={lab.id} isLeadOrSupervisor={Boolean(isLabLead)} />
      )}

      {/* Tab 3: Meetings & Syncs */}
      {activeTab === 'meetings' && (
        <LabMeetingsBoard
          labId={lab.id}
          groups={visibleGroups}
          isLeadOrSupervisor={Boolean(isLabLead)}
        />
      )}

      {/* Tab 4: Starter Packs */}
      {activeTab === 'starter-packs' && (
        <div className="space-y-5">
          {visibleGroups.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-text-tertiary">Select Cluster:</span>
              {visibleGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    (selectedGroupId === g.id || (!selectedGroupId && g.id === visibleGroups[0].id))
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {activeGroup ? (
            <StarterPackSection
              labId={lab.id}
              groupId={activeGroup.id}
              groupName={activeGroup.name}
              isLeadOrSupervisor={Boolean(isLabLead)}
            />
          ) : (
            <div className="glass-card p-12 text-center text-xs text-text-tertiary">
              {isStudent
                ? 'You have not been assigned to a research sub-group yet to view onboarding starter packs.'
                : 'Create a research sub-group first to curate an onboarding starter pack.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Journal Club */}
      {activeTab === 'journal-club' && (
        <div className="space-y-5">
          {visibleGroups.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-text-tertiary">Select Cluster:</span>
              {visibleGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    (selectedGroupId === g.id || (!selectedGroupId && g.id === visibleGroups[0].id))
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {activeGroup ? (
            <JournalClubSection
              labId={lab.id}
              groupId={activeGroup.id}
              groupName={activeGroup.name}
              groupMembers={activeGroup.members}
              isLeadOrSupervisor={Boolean(isLabLead)}
            />
          ) : (
            <div className="glass-card p-12 text-center text-xs text-text-tertiary">
              {isStudent
                ? 'You have not been assigned to a research sub-group yet to access journal club seminars.'
                : 'Create a research sub-group first to schedule weekly journal club seminars.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Members Roster */}
      {activeTab === 'members' && (
        <div className="glass-card overflow-hidden border border-border-default space-y-4 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <Users size={16} className="text-accent" /> Laboratory Roster ({lab.members.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                <tr>
                  <th className="p-3">Researcher</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Lab Role</th>
                  <th className="p-3 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                {lab.members.map((m) => (
                  <tr key={m.id} className="hover:bg-bg-tertiary/40 transition-colors">
                    <td className="p-3 font-semibold text-text-primary flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">
                        {m.user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{m.user.name}</span>
                    </td>
                    <td className="p-3 text-text-secondary font-mono">{m.user.email}</td>
                    <td className="p-3 text-text-tertiary">{m.user.department || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.role === 'LEAD'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-accent/15 text-accent border border-accent/30'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3 text-right text-text-tertiary font-mono">
                      {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Join Requests */}
      {activeTab === 'requests' && isLabLead && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-amber-400" /> Pending Join Applications ({lab.joinRequests.length})
          </h3>

          {lab.joinRequests.length > 0 ? (
            <div className="divide-y divide-border-default">
              {lab.joinRequests.map((req) => (
                <div key={req.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <strong className="text-sm text-text-primary font-bold">{req.user.name}</strong>
                    <p className="text-xs text-text-secondary font-mono">{req.user.email}</p>
                    {req.message && (
                      <p className="text-xs text-text-tertiary italic pt-1">&ldquo;{req.message}&rdquo;</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleRequestDecision(req.id, 'REJECTED')}
                      icon={<XCircle size={13} className="text-rose-400" />}
                    >
                      Decline
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleRequestDecision(req.id, 'APPROVED')}
                      icon={<CheckCircle2 size={13} />}
                    >
                      Approve &amp; Enroll
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-text-tertiary">
              No pending membership applications at this time.
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        labId={lab.id}
        labMembers={lab.members}
        onCreated={() => fetchLabDetails()}
      />

      {/* Manage Group Members Modal */}
      {managingGroup && (
        <ManageGroupMembersModal
          isOpen={Boolean(managingGroup)}
          onClose={() => setManagingGroup(null)}
          labId={lab.id}
          groupId={managingGroup.id}
          groupName={managingGroup.name}
          labMembers={lab.members}
          currentMemberUserIds={managingGroup.memberUserIds}
          onUpdated={() => fetchLabDetails()}
        />
      )}
    </div>
  )
}
