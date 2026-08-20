'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  ExternalLink,
  Edit2,
  Trash2,
  Filter,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Code2,
  FlaskConical,
  FileText,
  Database,
  Presentation,
  ShieldCheck,
  Link as LinkIcon,
  MessageSquare,
  Building,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'

export interface TaskItem {
  id: string
  title: string
  description: string | null
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  dueDate: string | null
  deliverableUrl: string | null
  progressNotes: string | null
  createdAt: string
  assignee: { id: string; name: string; email: string; department?: string } | null
  createdBy: { id: string; name: string; email: string }
  group: { id: string; name: string; color: string } | null
}

interface LabTasksBoardProps {
  labId: string
  labSlug: string
  groups: {
    id: string
    name: string
    color: string
    members?: { id: string; role?: string; user: { id: string; name: string; email: string; systemRole?: string } }[]
  }[]
  members: { id: string; role: string; user: { id: string; name: string; email: string; systemRole?: string } }[]
  isLeadOrSupervisor: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
  RESEARCH: { label: 'Research & Literature', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', icon: FileText },
  EXPERIMENT: { label: 'Experiment & Ablation', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: FlaskConical },
  CODING: { label: 'Code & Implementation', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Code2 },
  WRITING: { label: 'Paper Writing / Draft', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: FileText },
  DATASET: { label: 'Dataset & Preprocessing', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Database },
  PRESENTATION: { label: 'Presentation & Slides', bg: 'bg-pink-500/15 text-pink-400 border-pink-500/30', icon: Presentation },
  REVIEW: { label: 'Peer Review & Audit', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: ShieldCheck },
}

const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  URGENT: { label: 'Urgent', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' },
  HIGH: { label: 'High', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  MEDIUM: { label: 'Medium', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  LOW: { label: 'Low', badge: 'bg-bg-tertiary text-text-tertiary border-border-default' },
}

export function LabTasksBoard({
  labId,
  labSlug,
  groups,
  members,
  isLeadOrSupervisor,
}: LabTasksBoardProps) {
  const { user } = useAuth()
  const { addToast } = useToast()

  // Strictly filter student researchers only (never assign to or list supervisors/admins/leads as assignees)
  const isStudentResearcher = (memberUser: { id: string; systemRole?: string; role?: string }) => {
    if (memberUser.id === user?.id && isLeadOrSupervisor) return false
    if (memberUser.systemRole === 'SUPERVISOR' || memberUser.systemRole === 'ADMIN') return false
    if (memberUser.role === 'LEAD') return false
    return true
  }

  // All eligible student researchers enrolled in this laboratory
  const studentMembers = members.filter((m) =>
    isStudentResearcher({ id: m.user.id, systemRole: m.user.systemRole, role: m.role })
  )

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [groupFilter, setGroupFilter] = useState<string>('ALL')
  const [onlyMyTasks, setOnlyMyTasks] = useState(false)

  // Create Task Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('RESEARCH')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [targetScope, setTargetScope] = useState<'ALL_LAB' | 'SUB_GROUP' | 'INDIVIDUAL'>('ALL_LAB')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('ALL_LAB')
  const [dueDate, setDueDate] = useState('')
  const [deliverableUrl, setDeliverableUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('RESEARCH')
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [editGroupId, setEditGroupId] = useState('')
  const [editAssigneeId, setEditAssigneeId] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Submit Deliverable Modal State (for students)
  const [submittingDeliverableTask, setSubmittingDeliverableTask] = useState<TaskItem | null>(null)
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitNotes, setSubmitNotes] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'>('IN_REVIEW')
  const [savingDeliverable, setSavingDeliverable] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/labs/${labId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (labId) fetchTasks()
  }, [labId])

  const handleOpenCreate = () => {
    setTitle('')
    setDescription('')
    setCategory('RESEARCH')
    setPriority('MEDIUM')
    setTargetScope('ALL_LAB')
    setSelectedGroupId(groups.length > 0 ? groups[0].id : '')
    setSelectedAssigneeId('ALL_LAB')
    const defaultDue = new Date()
    defaultDue.setDate(defaultDue.getDate() + 7)
    setDueDate(defaultDue.toISOString().slice(0, 10))
    setDeliverableUrl('')
    setIsCreateOpen(true)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const formattedLocalTime = dueDate
        ? new Date(dueDate).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : undefined

      const effectiveAssigneeId =
        targetScope === 'ALL_LAB'
          ? 'ALL_LAB'
          : targetScope === 'SUB_GROUP'
          ? selectedAssigneeId || 'ALL_GROUP'
          : selectedAssigneeId

      const res = await fetch(`/api/labs/${labId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          targetScope,
          groupId: targetScope === 'SUB_GROUP' ? selectedGroupId : undefined,
          assigneeId: effectiveAssigneeId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          deliverableUrl: deliverableUrl.trim() || undefined,
          formattedTime: formattedLocalTime,
        }),
      })

      if (res.ok) {
        addToast(
          'success',
          targetScope === 'ALL_LAB'
            ? 'Research task assigned to all lab students!'
            : targetScope === 'SUB_GROUP' && effectiveAssigneeId === 'ALL_GROUP'
            ? 'Research task assigned to all sub-group members!'
            : 'Research task created and assigned!'
        )
        setIsCreateOpen(false)
        fetchTasks()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create task')
      }
    } catch {
      addToast('error', 'Network error creating task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditCategory(task.category)
    setEditPriority(task.priority)
    setEditGroupId(task.group ? task.group.id : '')
    setEditAssigneeId(task.assignee ? task.assignee.id : '')
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    setSavingEdit(true)

    try {
      const res = await fetch(`/api/labs/${labId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: editingTask.id,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory,
          priority: editPriority,
          groupId: editGroupId || null,
          assigneeId: editAssigneeId || null,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        }),
      })

      if (res.ok) {
        addToast('success', 'Task updated!')
        setEditingTask(null)
        fetchTasks()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update task')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/labs/${labId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status: newStatus,
        }),
      })

      if (res.ok) {
        addToast('success', `Task marked as ${newStatus}`)
        fetchTasks()
      } else {
        addToast('error', 'Failed to update status')
      }
    } catch {
      addToast('error', 'Network error')
    }
  }

  const handleOpenSubmitDeliverable = (task: TaskItem) => {
    setSubmittingDeliverableTask(task)
    setSubmitUrl(task.deliverableUrl || '')
    setSubmitNotes(task.progressNotes || '')
    setSubmitStatus(task.status === 'COMPLETED' ? 'COMPLETED' : 'IN_REVIEW')
  }

  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submittingDeliverableTask) return
    setSavingDeliverable(true)

    try {
      const res = await fetch(`/api/labs/${labId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: submittingDeliverableTask.id,
          deliverableUrl: submitUrl.trim() || null,
          progressNotes: submitNotes.trim() || null,
          status: submitStatus,
        }),
      })

      if (res.ok) {
        addToast('success', 'Deliverables submitted and supervisor notified!')
        setSubmittingDeliverableTask(null)
        fetchTasks()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to submit deliverable')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setSavingDeliverable(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this research task?')) return
    try {
      const res = await fetch(`/api/labs/${labId}/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('success', 'Task removed')
        fetchTasks()
      } else {
        addToast('error', 'Failed to delete task')
      }
    } catch {
      addToast('error', 'Network error')
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (groupFilter !== 'ALL' && t.group?.id !== groupFilter) return false
    if (onlyMyTasks && t.assignee?.id !== user?.id) return false
    return true
  })

  // Calculate days remaining helper
  const getDueBadge = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr) return null
    if (status === 'COMPLETED') return null

    const diff = new Date(dueDateStr).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          Overdue by {Math.abs(days)}d
        </span>
      )
    }
    if (days === 0) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
          Due Today
        </span>
      )
    }
    if (days <= 3) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
          Due in {days}d
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-bg-tertiary text-text-tertiary border border-border-default">
        Due {new Date(dueDateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <CheckSquare size={18} className="text-accent" /> Lab Research Tasks &amp; Deliverables
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Assign experimental ablations, code implementations, dataset prep, and thesis milestones.
          </p>
        </div>

        {isLeadOrSupervisor && (
          <Button size="xs" variant="primary" onClick={handleOpenCreate} icon={<Plus size={14} />}>
            Assign Research Task
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-secondary border border-border-default">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'All Tasks' },
            { id: 'TODO', label: 'To Do' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'IN_REVIEW', label: 'In Review' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-accent text-white font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                onlyMyTasks
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-bg-tertiary text-text-secondary border-border-default hover:text-text-primary'
              }`}
            >
              <User size={12} /> Assigned to Me
            </button>
          )}

          {groups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="ALL">All Sub-Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-tertiary">Loading research tasks...</div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((t) => {
            const cat = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.RESEARCH
            const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.MEDIUM
            const CatIcon = cat.icon
            const isAssignedToMe = t.assignee?.id === user?.id
            const isCompleted = t.status === 'COMPLETED'
            const isInReview = t.status === 'IN_REVIEW'

            return (
              <div
                key={t.id}
                className={`glass-card p-5 space-y-3.5 relative flex flex-col justify-between transition-all ${
                  isCompleted ? 'opacity-75 border-success/30' : isAssignedToMe ? 'border-accent/40 bg-accent/5' : ''
                }`}
              >
                <div className="space-y-3">
                  {/* Card Meta Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${cat.bg}`}>
                        <CatIcon size={11} /> {cat.label}
                      </span>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${prio.badge}`}>
                        {prio.label}
                      </span>

                      {t.group && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-bg-tertiary text-text-secondary border border-border-default flex items-center gap-1">
                          <Layers size={10} className="text-accent" /> {t.group.name}
                        </span>
                      )}
                    </div>

                    {getDueBadge(t.dueDate, t.status)}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-base font-bold text-text-primary font-display flex items-start gap-2">
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                      ) : (
                        <CheckSquare size={16} className="text-accent shrink-0 mt-0.5" />
                      )}
                      <span>{t.title}</span>
                    </h4>

                    {t.description && (
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Deliverable Artifact Link (if attached) */}
                  {t.deliverableUrl && (
                    <div className="p-2.5 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <LinkIcon size={13} className="text-accent shrink-0" />
                        <span className="text-[11px] text-text-secondary font-mono truncate">
                          {t.deliverableUrl}
                        </span>
                      </div>
                      <a
                        href={t.deliverableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-accent hover:underline shrink-0 flex items-center gap-1"
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {/* Progress Notes (if attached) */}
                  {t.progressNotes && (
                    <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/70 space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare size={11} /> Progress &amp; Implementation Notes:
                      </span>
                      <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {t.progressNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Assignee & Action Buttons */}
                <div className="pt-3 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <User size={13} className="text-text-tertiary" />
                    <span>
                      Assignee:{' '}
                      <strong className="text-text-primary">
                        {t.assignee ? t.assignee.name : 'Unassigned'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Student Assignee Actions: Change Working Status & Submit Deliverables */}
                    {isAssignedToMe ? (
                      <>
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isInReview
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-bg-tertiary text-text-secondary border-border-default'
                          }`}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Ready for Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleOpenSubmitDeliverable(t)}
                          icon={<LinkIcon size={12} />}
                        >
                          Submit / Notes
                        </Button>
                      </>
                    ) : (
                      /* Supervisor / Observer View: Status Badge & Review Sign-Off */
                      <>
                        <span
                          className={`text-[10px] font-bold rounded-lg px-2.5 py-1 border font-mono flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isInReview
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-bg-tertiary text-text-secondary border-border-default'
                          }`}
                        >
                          {isCompleted
                            ? '🟢 Completed'
                            : isInReview
                            ? '🟠 In Review'
                            : t.status === 'IN_PROGRESS'
                            ? '🔵 In Progress'
                            : '⚪ To Do'}
                        </span>

                        {isLeadOrSupervisor && isInReview && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleQuickStatusChange(t.id, 'COMPLETED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            icon={<CheckCircle2 size={12} />}
                          >
                            Approve Deliverable
                          </Button>
                        )}
                      </>
                    )}

                    {/* Edit & Delete for Supervisors */}
                    {isLeadOrSupervisor && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-bg-tertiary transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-3">
          <CheckSquare size={30} className="mx-auto opacity-30 text-accent" />
          <h4 className="text-sm font-bold text-text-primary">No Research Tasks Found</h4>
          <p className="max-w-md mx-auto">
            {isLeadOrSupervisor
              ? 'Assign research milestones, model training tasks, code implementations, or paper writeups to your students.'
              : 'No active tasks assigned in this filter view.'}
          </p>
          {isLeadOrSupervisor && (
            <Button size="xs" variant="primary" onClick={handleOpenCreate}>
              Assign First Task
            </Button>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Assign Research Task"
          description="Create a research milestone, experiment ablation, or task for lab students."
          size="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement LoRA Fine-Tuning Baseline on LLaMA-3"
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Description &amp; Task Objectives
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe key hypotheses, dataset splits, code repo expectations, or writeup sections..."
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Task Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="RESEARCH">Research &amp; Literature</option>
                  <option value="EXPERIMENT">Experiment &amp; Ablation</option>
                  <option value="CODING">Code &amp; Implementation</option>
                  <option value="WRITING">Paper Writing / Draft</option>
                  <option value="DATASET">Dataset &amp; Preprocessing</option>
                  <option value="PRESENTATION">Presentation &amp; Slides</option>
                  <option value="REVIEW">Peer Review &amp; Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Priority Level *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent 🚨</option>
                </select>
              </div>
            </div>

            {/* Assignment Target Scope */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-text-secondary">
                Assign Task To *
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('ALL_LAB')
                    setSelectedAssigneeId('ALL_LAB')
                    setSelectedGroupId('')
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    targetScope === 'ALL_LAB'
                      ? 'bg-accent/15 border-accent text-accent shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Building size={13} /> Whole Lab
                  </span>
                  <span className="text-[10px] opacity-80 line-clamp-1">
                    All {studentMembers.length} students
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('SUB_GROUP')
                    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id)
                    setSelectedAssigneeId('ALL_GROUP')
                  }}
                  disabled={groups.length === 0}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    targetScope === 'SUB_GROUP'
                      ? 'bg-accent/15 border-accent text-accent shadow-sm'
                      : groups.length === 0
                      ? 'opacity-40 cursor-not-allowed bg-bg-tertiary border-border-default text-text-tertiary'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Layers size={13} /> Sub-Group
                  </span>
                  <span className="text-[10px] opacity-80 line-clamp-1">
                    Cluster members
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('INDIVIDUAL')
                    const firstStudent = studentMembers[0]
                    setSelectedAssigneeId(firstStudent ? firstStudent.user.id : '')
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    targetScope === 'INDIVIDUAL'
                      ? 'bg-accent/15 border-accent text-accent shadow-sm'
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <User size={13} /> Individual
                  </span>
                  <span className="text-[10px] opacity-80 line-clamp-1">
                    Single researcher
                  </span>
                </button>
              </div>
            </div>

            {/* Scope Specific Details */}
            {targetScope === 'ALL_LAB' && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Users size={13} className="text-accent" /> Automatically Assigns All Enrolled Students
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono text-[10px] font-bold">
                    {studentMembers.length} Students
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Every enrolled student researcher will receive their own trackable deliverable instance with instant in-app &amp; background phone push alerts.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {studentMembers.map((m) => (
                    <span
                      key={m.user.id}
                      className="px-2 py-0.5 rounded-md bg-bg-secondary text-text-primary text-[10px] border border-border-default"
                    >
                      {m.user.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {targetScope === 'SUB_GROUP' && (() => {
              const currentGroup = groups.find((g) => g.id === selectedGroupId)
              const groupStudentMembers =
                currentGroup?.members?.filter((m) =>
                  isStudentResearcher({ id: m.user.id, systemRole: m.user.systemRole, role: m.role })
                ) || []

              return (
                <div className="space-y-3 p-3 rounded-xl bg-bg-tertiary border border-border-default">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Select Target Research Sub-Group *
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(e.target.value)
                        setSelectedAssigneeId('ALL_GROUP')
                      }}
                      required
                      className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} (
                          {
                            g.members?.filter((m) =>
                              isStudentResearcher({ id: m.user.id, systemRole: m.user.systemRole, role: m.role })
                            ).length || 0
                          }{' '}
                          students)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Sub-Group Assignee Option
                    </label>
                    <select
                      value={selectedAssigneeId}
                      onChange={(e) => setSelectedAssigneeId(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="ALL_GROUP">
                        👥 All {groupStudentMembers.length} Students in this Sub-Group (Automatically Assigned)
                      </option>
                      {groupStudentMembers.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          👤 {m.user.name} ({m.user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {groupStudentMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {groupStudentMembers.map((m) => (
                        <span
                          key={m.user.id}
                          className="px-2 py-0.5 rounded-md bg-bg-secondary text-text-primary text-[10px] border border-border-default"
                        >
                          {m.user.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {targetScope === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Select Student Researcher *
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  required
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select a student...</option>
                  {studentMembers.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Reference / Starter Link (Optional)
                </label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Sparkles size={13} />}>
                Assign Task &amp; Notify Student
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <Modal
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          title="Edit Research Task"
          description="Update task objectives, priority, due date, or student assignee."
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Description &amp; Objectives
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="RESEARCH">Research &amp; Literature</option>
                  <option value="EXPERIMENT">Experiment &amp; Ablation</option>
                  <option value="CODING">Code &amp; Implementation</option>
                  <option value="WRITING">Paper Writing / Draft</option>
                  <option value="DATASET">Dataset &amp; Preprocessing</option>
                  <option value="PRESENTATION">Presentation &amp; Slides</option>
                  <option value="REVIEW">Peer Review &amp; Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Priority Level
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as any)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent 🚨</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Student Assignee
                </label>
                <select
                  value={editAssigneeId}
                  onChange={(e) => setEditAssigneeId(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {studentMembers.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submit Deliverable & Progress Notes Modal (for Student / Assignee) */}
      {submittingDeliverableTask && (
        <Modal
          isOpen={Boolean(submittingDeliverableTask)}
          onClose={() => setSubmittingDeliverableTask(null)}
          title="Submit Deliverable & Progress Notes"
          description={`Submit your completed work for "${submittingDeliverableTask.title}".`}
          size="md"
        >
          <form onSubmit={handleSaveDeliverable} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Deliverable URL (GitHub PR, WandB Run, Overleaf Draft, Google Doc)
              </label>
              <input
                type="url"
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="https://github.com/repo/pull/12 or https://wandb.ai/..."
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Progress &amp; Synthesis Notes
              </label>
              <textarea
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                placeholder="Summarize key findings, test accuracy, roadblocks, or notes for your advisor..."
                rows={4}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Update Status
              </label>
              <select
                value={submitStatus}
                onChange={(e) => setSubmitStatus(e.target.value as any)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent font-semibold"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">Ready for Review (In Review)</option>
                <option value="COMPLETED">Completed 🎉</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <Button type="button" variant="ghost" onClick={() => setSubmittingDeliverableTask(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingDeliverable} icon={<CheckCircle2 size={13} />}>
                Submit Deliverable &amp; Notify Advisor
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
