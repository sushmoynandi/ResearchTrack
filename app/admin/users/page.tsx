'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  ShieldCheck,
  Plus,
  Users,
  Building,
  GraduationCap,
  Mail,
  UserCheck,
  UserX,
  Edit2,
  Check,
  Search,
} from 'lucide-react'
import type { SystemRole } from '@/lib/types'

interface AdminUserRecord {
  id: string
  name: string
  email: string
  systemRole: SystemRole
  institution: string | null
  department: string | null
  isActive: boolean
  isGuest: boolean
  createdAt: string
  supervisorId: string | null
  supervisor?: { id: string; name: string; email: string } | null
  _count: {
    papers: number
    notes: number
    students: number
    assignedPapers: number
  }
}

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [supervisors, setSupervisors] = useState<{ id: string; name: string; email: string; department?: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null)
  const [editRole, setEditRole] = useState<SystemRole>('STUDENT')
  const [editSupervisorId, setEditSupervisorId] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<SystemRole>('STUDENT')
  const [createDepartment, setCreateDepartment] = useState('')
  const [createInstitution, setCreateInstitution] = useState('')
  const [createSupervisorId, setCreateSupervisorId] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setSupervisors(data.supervisors)
      } else {
        addToast('error', 'Administrator permission required')
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenEdit = (u: AdminUserRecord) => {
    setEditingUser(u)
    setEditRole(u.systemRole)
    setEditSupervisorId(u.supervisorId || '')
    setEditDepartment(u.department || '')
    setEditInstitution(u.institution || '')
    setEditIsActive(u.isActive)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          systemRole: editRole,
          supervisorId: editSupervisorId || null,
          department: editDepartment,
          institution: editInstitution,
          isActive: editIsActive,
        }),
      })

      if (res.ok) {
        addToast('success', `Updated account for ${editingUser.name}`)
        setEditingUser(null)
        loadData()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to update user')
      }
    } catch {
      addToast('error', 'Network error updating user')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName || !createEmail || !createPassword) {
      addToast('error', 'Name, email, and password are required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          systemRole: createRole,
          department: createDepartment,
          institution: createInstitution,
          supervisorId: createSupervisorId || null,
        }),
      })

      if (res.ok) {
        addToast('success', 'User created successfully')
        setIsCreateOpen(false)
        setCreateName('')
        setCreateEmail('')
        setCreatePassword('')
        setCreateDepartment('')
        loadData()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to create user')
      }
    } catch {
      addToast('error', 'Network error creating user')
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()))

    const matchesRole = roleFilter === 'ALL' || u.systemRole === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-red-500" /> User Management &amp; Access Control
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Institutional directory for managing academic researcher roles, department affiliations, and mentorship links.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} icon={<Plus size={16} />}>
          Create New User
        </Button>
      </div>

      {/* Institutional Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3 border-border-default">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Total Users</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{users.length}</p>
            <p className="text-[10px] text-text-tertiary">{users.filter(u => u.isActive).length} active accounts</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3 border-border-default">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Students</p>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">
              {users.filter((u) => u.systemRole === 'STUDENT').length}
            </p>
            <p className="text-[10px] text-text-tertiary">Active researchers</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3 border-border-default">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Building size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Supervisors</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">
              {users.filter((u) => u.systemRole === 'SUPERVISOR').length}
            </p>
            <p className="text-[10px] text-text-tertiary">Faculty advisors</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3 border-border-default">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Administrators</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">
              {users.filter((u) => u.systemRole === 'ADMIN').length}
            </p>
            <p className="text-[10px] text-text-tertiary">Full system access</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'STUDENT', 'SUPERVISOR', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                roleFilter === r
                  ? 'bg-accent text-bg-primary font-bold'
                  : 'text-text-secondary hover:text-text-primary bg-bg-secondary border border-border-default'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="64px" />
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-tertiary/70 border-b border-border-default text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">System Role</th>
                  <th className="p-4">Department &amp; Lab</th>
                  <th className="p-4">Assigned Supervisor</th>
                  <th className="p-4">Library</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60">
                {filteredUsers.map((u) => {
                  const roleBadge =
                    u.systemRole === 'ADMIN'
                      ? 'bg-red-500/10 text-red-500 border-red-500/30'
                      : u.systemRole === 'SUPERVISOR'
                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/30'

                  return (
                    <tr key={u.id} className="hover:bg-bg-tertiary/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-text-primary">{u.name}</div>
                        <div className="text-[11px] text-text-tertiary">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${roleBadge}`}>
                          {u.systemRole}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">
                        <div>{u.department || '—'}</div>
                        <div className="text-[10px] text-text-tertiary">{u.institution || '—'}</div>
                      </td>
                      <td className="p-4 text-text-secondary">
                        {u.systemRole === 'STUDENT' ? (
                          u.supervisor ? (
                            <span className="font-medium text-purple-400">{u.supervisor.name}</span>
                          ) : (
                            <span className="text-text-tertiary italic">Unassigned</span>
                          )
                        ) : u.systemRole === 'SUPERVISOR' ? (
                          <span className="text-xs text-text-tertiary">{u._count.students} students</span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="p-4 text-text-secondary font-medium">
                        {u._count.papers} papers · {u._count.notes} notes
                      </td>
                      <td className="p-4">
                        {u.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Deactivated</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleOpenEdit(u)}
                          icon={<Edit2 size={12} />}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-modal space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Edit2 size={16} className="text-accent" /> Edit Account: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  System Role *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as SystemRole)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="STUDENT">Student Researcher</option>
                  <option value="SUPERVISOR">Supervisor / Faculty Advisor</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {editRole === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Assign Faculty Supervisor
                  </label>
                  <select
                    value={editSupervisorId}
                    onChange={(e) => setEditSupervisorId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">No Supervisor (Independent)</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Department"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
              />

              <Input
                label="Institution"
                value={editInstitution}
                onChange={(e) => setEditInstitution(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-border-default"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-text-primary">
                  Account is Active (Uncheck to suspend login)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-modal space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Plus size={16} className="text-accent" /> Provision New User
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-text-tertiary hover:text-text-primary text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Full Name *"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />

              <Input
                label="Email Address *"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />

              <Input
                label="Initial Password *"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  System Role *
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as SystemRole)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="STUDENT">Student Researcher</option>
                  <option value="SUPERVISOR">Supervisor / Faculty Advisor</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {createRole === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Assign Faculty Supervisor
                  </label>
                  <select
                    value={createSupervisorId}
                    onChange={(e) => setCreateSupervisorId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">No Supervisor (Independent)</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Department"
                placeholder="e.g. Electrical Engineering"
                value={createDepartment}
                onChange={(e) => setCreateDepartment(e.target.value)}
              />

              <Input
                label="Institution"
                placeholder="e.g. Stanford University"
                value={createInstitution}
                onChange={(e) => setCreateInstitution(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creating}>
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
