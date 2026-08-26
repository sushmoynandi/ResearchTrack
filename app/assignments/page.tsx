'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { CalendarSyncButton } from '@/components/calendar/CalendarSyncButton'
import { CalendarSubscriptionModal } from '@/components/calendar/CalendarSubscriptionModal'
import {
  ClipboardList,
  Plus,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

interface AssignmentItem {
  id: string
  paperId: string
  studentId: string
  assignedById: string
  dueDate: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  note: string | null
  createdAt: string
  paper: {
    id: string
    slug?: string | null
    title: string
    authors: string
    status: string
    priority: string
    journal: string | null
    publicationYear: number | null
    arxivId: string | null
  }
  student: {
    id: string
    name: string
    email: string
    institution: string | null
    department: string | null
  }
  assignedBy: {
    id: string
    name: string
    email: string
    systemRole: string
  }
}

export default function AssignmentsPage() {
  const { user, isStudent, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Assign Paper Modal State (Supervisors / Admins)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false)
  const [assignMode, setAssignMode] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL')
  const [availablePapers, setAvailablePapers] = useState<{ id: string; title: string }[]>([])
  const [availableStudents, setAvailableStudents] = useState<{ id: string; name: string; email: string }[]>([])
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string; labName: string; memberCount: number }[]>([])
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [paperSearch, setPaperSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAssignments = async () => {
    try {
      const res = await fetch('/api/assignments')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (err) {
      console.error('Failed to load assignments:', err)
      addToast('error', 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignOptions = async () => {
    try {
      // 1. Fetch available papers
      const papersRes = await fetch('/api/papers')
      if (papersRes.ok) {
        const papers = await papersRes.json()
        setAvailablePapers(papers)
        if (papers.length > 0 && selectedPaperIds.length === 0) {
          setSelectedPaperIds([papers[0].id])
        }
      }

      // 2. Fetch available students
      const studentsRes = await fetch('/api/students')
      if (studentsRes.ok) {
        const students = await studentsRes.json()
        setAvailableStudents(students)
        if (students.length > 0) setSelectedStudentId(students[0].id)
      }

      // 3. Fetch research labs & sub-groups
      const labsRes = await fetch('/api/labs')
      if (labsRes.ok) {
        const labs = await labsRes.json()
        const groupsList: { id: string; name: string; labName: string; memberCount: number }[] = []
        labs.forEach((l: any) => {
          (l.groups || []).forEach((g: any) => {
            groupsList.push({
              id: g.id,
              name: g.name,
              labName: l.name,
              memberCount: g.members?.length || 0,
            })
          })
        })
        setAvailableGroups(groupsList)
        if (groupsList.length > 0) setSelectedGroupId(groupsList[0].id)
      }
    } catch (err) {
      console.error('Failed to load assignment options:', err)
    }
  }

  const handleOpenModal = async () => {
    setIsModalOpen(true)
    await loadAssignOptions()
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPaperIds.length === 0) {
      addToast('error', 'Please select at least one paper from your library')
      return
    }

    setSubmitting(true)
    try {
      if (assignMode === 'GROUP') {
        if (!selectedGroupId) {
          addToast('error', 'Please select a research group')
          setSubmitting(false)
          return
        }

        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperIds: selectedPaperIds,
            groupId: selectedGroupId,
            targetType: 'GROUP',
            dueDate: dueDate || null,
            note: assignmentNote || null,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          addToast('success', data.message || `Assigned ${selectedPaperIds.length} paper(s) to group!`)
          setIsModalOpen(false)
          setAssignmentNote('')
          setDueDate('')
          setSelectedPaperIds([])
          loadAssignments()
        } else {
          const err = await res.json()
          addToast('error', err.error || 'Failed to assign to group')
        }
      } else {
        if (!selectedStudentId) {
          addToast('error', 'Please select a student')
          setSubmitting(false)
          return
        }

        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperIds: selectedPaperIds,
            studentId: selectedStudentId,
            targetType: 'STUDENT',
            dueDate: dueDate || null,
            note: assignmentNote || null,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          addToast('success', data.message || `Assigned ${selectedPaperIds.length} paper(s) successfully!`)
          setIsModalOpen(false)
          setAssignmentNote('')
          setDueDate('')
          setSelectedPaperIds([])
          loadAssignments()
        } else {
          const err = await res.json()
          addToast('error', err.error || 'Failed to assign paper')
        }
      }
    } catch {
      addToast('error', 'Network error creating assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (assignmentId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId, status: newStatus }),
      })

      if (res.ok) {
        addToast('success', `Status updated to ${newStatus}`)
        loadAssignments()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('paper-status-changed'))
          window.dispatchEvent(new Event('assignment-status-changed'))
        }
      } else {
        addToast('error', 'Failed to update assignment status')
      }
    } catch {
      addToast('error', 'Network error updating assignment')
    }
  }

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'ALL') return true
    return a.status === statusFilter
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <ClipboardList size={22} className="text-accent" /> Research Assignments &amp; Reading Tasks
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isStudent
              ? 'Literature assigned by your supervisor for literature synthesis and review.'
              : 'Direct students to landmark papers, set deadlines, and monitor reading progress.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => setIsSubscriptionOpen(true)}
            icon={<Sparkles size={15} className="text-accent" />}
          >
            <span>Auto-Sync to Google Calendar</span>
          </Button>

          {(isSupervisor || isAdmin) && (
            <Button onClick={handleOpenModal} icon={<Plus size={16} />}>
              Assign New Paper
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-default pb-3">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === tab
                ? 'bg-accent text-bg-primary font-bold'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="100px" />
          ))}
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="space-y-3">
          {filteredAssignments.map((a) => (
            <div
              key={a.id}
              className="glass-card p-5 hover:border-accent/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      a.status === 'COMPLETED'
                        ? 'success'
                        : a.status === 'IN_PROGRESS'
                        ? 'warning'
                        : 'info'
                    }
                    size="sm"
                  >
                    {a.status}
                  </Badge>

                  {isSupervisor || isAdmin ? (
                    <span className="text-xs text-purple-400 font-medium">
                      Assigned to: {a.student.name} ({a.student.department || 'Student'})
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">
                      Assigned by: {a.assignedBy.name}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-text-primary hover:text-accent transition-colors font-display">
                  <Link href={`/papers/${a.paper.slug || a.paper.id}`}>{a.paper.title}</Link>
                </h3>

                <p className="text-xs text-text-secondary">{a.paper.authors}</p>

                {a.note && (
                  <p className="text-xs text-text-tertiary bg-bg-tertiary/60 p-2 rounded-lg mt-1 italic border border-border-default/40">
                    &ldquo;{a.note}&rdquo;
                  </p>
                )}
              </div>

              {/* Action and Due Date area */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                {a.dueDate && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-text-tertiary bg-bg-tertiary px-3 py-1.5 rounded-lg border border-border-default">
                      <Calendar size={13} className="text-accent" />
                      <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                    </div>
                    <CalendarSyncButton
                      event={{
                        title: `📖 Reading Deadline: ${a.paper.title}`,
                        description: `Research reading assignment for: ${a.paper.title}\nAuthors: ${a.paper.authors}\nAssigned by: ${a.assignedBy?.name || 'Supervisor'}\nNote: ${a.note || 'None'}\n\nWorkspace: ${typeof window !== 'undefined' ? `${window.location.origin}/papers/${a.paper.slug || a.paper.id}` : ''}`,
                        startDate: new Date(a.dueDate),
                        location: 'ResearchTrack Paper Workspace',
                      }}
                      filename={`assignment_${a.paper.title.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                      buttonText="Sync"
                      size="xs"
                    />
                  </div>
                )}

                {/* Status Switcher for Student */}
                {isStudent && a.status !== 'COMPLETED' && (
                  <div className="flex items-center gap-2">
                    {a.status === 'PENDING' && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleStatusChange(a.id, 'IN_PROGRESS')}
                      >
                        Start Reading
                      </Button>
                    )}
                    {a.status === 'IN_PROGRESS' && (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleStatusChange(a.id, 'COMPLETED')}
                        icon={<CheckCircle2 size={13} />}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}

                <Link href={`/papers/${a.paper.slug || a.paper.id}`}>
                  <Button size="xs" variant="secondary" icon={<ArrowRight size={13} />}>
                    Open Paper
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
            <ClipboardList size={24} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            No Assignments Found
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {isStudent
              ? 'You have no pending reading assignments from your supervisor.'
              : 'You have not assigned any papers to students yet.'}
          </p>
          {(isSupervisor || isAdmin) && (
            <Button onClick={handleOpenModal} size="sm" icon={<Plus size={14} />}>
              Assign First Paper
            </Button>
          )}
        </div>
      )}

      {/* Assign Paper Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-modal space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <ClipboardList size={18} className="text-accent" /> Assign Paper to Student
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Target Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Assignment Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignMode('INDIVIDUAL')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      assignMode === 'INDIVIDUAL'
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    👤 Individual Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('GROUP')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      assignMode === 'GROUP'
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    🔬 Research Sub-Group ({availableGroups.length})
                  </button>
                </div>
              </div>

              {/* Select Target */}
              {assignMode === 'GROUP' ? (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Select Research Sub-Group *
                  </label>
                  {availableGroups.length > 0 ? (
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                      required
                    >
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.labName}) • {g.memberCount} members
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-400 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      No research sub-groups found. Create a group in your Lab Center first.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Select Student *
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                    required
                  >
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select Papers (Multi-select supported) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    Select Papers from Library * ({selectedPaperIds.length} selected)
                  </label>
                  {availablePapers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPaperIds.length === availablePapers.length) {
                          setSelectedPaperIds([])
                        } else {
                          setSelectedPaperIds(availablePapers.map((p) => p.id))
                        }
                      }}
                      className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
                    >
                      {selectedPaperIds.length === availablePapers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {availablePapers.length > 5 && (
                  <input
                    type="text"
                    placeholder="Search papers to assign..."
                    value={paperSearch}
                    onChange={(e) => setPaperSearch(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent mb-2"
                  />
                )}

                <div className="max-h-48 overflow-y-auto space-y-1.5 bg-bg-tertiary/60 border border-border-default rounded-lg p-2 divide-y divide-border-default/40">
                  {availablePapers
                    .filter((p) => !paperSearch || p.title.toLowerCase().includes(paperSearch.toLowerCase()))
                    .map((p) => {
                      const isChecked = selectedPaperIds.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 p-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                            isChecked ? 'bg-accent/15 text-text-primary font-medium' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaperIds((prev) => [...prev, p.id])
                              } else {
                                setSelectedPaperIds((prev) => prev.filter((id) => id !== p.id))
                              }
                            }}
                            className="mt-0.5 accent-accent cursor-pointer shrink-0"
                          />
                          <span className="truncate leading-tight flex-1">{p.title}</span>
                        </label>
                      )
                    })}
                  {availablePapers.filter((p) => !paperSearch || p.title.toLowerCase().includes(paperSearch.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-xs text-text-tertiary">
                      No matching papers found.
                    </div>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <Input
                label="Due Date (Optional)"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              {/* Note / Research Guidance */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Supervisor Research Note (Optional)
                </label>
                <textarea
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Focus on Section 4 ablation studies and compare against our baseline..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none h-24"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Calendar Auto-Sync Modal */}
      <CalendarSubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </div>
  )
}
