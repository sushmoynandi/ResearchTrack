'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Clock,
  User,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface AuditEntry {
  id: string
  userId: string | null
  userName: string | null
  action: string
  resource: string
  details: string | null
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  createdAt: string
}

export default function AdminAuditPage() {
  const { addToast } = useToast()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (severityFilter !== 'ALL') params.set('severity', severityFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      } else {
        addToast('error', 'Failed to load audit logs')
      }
    } catch {
      addToast('error', 'Network error loading audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [severityFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs()
  }

  const handleExportCSV = () => {
    if (logs.length === 0) return
    const headers = ['Timestamp', 'Severity', 'User', 'Action', 'Resource', 'Details']
    const rows = logs.map((l) => [
      `"${new Date(l.createdAt).toISOString()}"`,
      l.severity,
      `"${l.userName || 'System'}"`,
      `"${l.action}"`,
      `"${l.resource}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `researchtrack_audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('success', 'Exported audit log CSV')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <Lock size={12} /> Compliance &amp; Security
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight mt-1">
            System Audit Trail &amp; Lab Governance Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Immutable log of role changes, administrative elevations, and lab security operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            icon={<Download size={14} />}
          >
            Export Log (.CSV)
          </Button>

          <Link href="/admin/users">
            <Button size="sm" variant="primary">
              User Management
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Severity Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                severityFilter === sev
                  ? 'bg-accent text-bg-primary font-bold'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search actions, users, or resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent w-64"
            />
          </div>
          <Button size="xs" variant="secondary" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="60px" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <div className="glass-card overflow-hidden border border-border-default">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-tertiary text-text-secondary text-[11px] uppercase border-b border-border-default">
                <tr>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60 bg-bg-secondary">
                {logs.map((log) => {
                  const isCritical = log.severity === 'CRITICAL'
                  const isWarning = log.severity === 'WARNING'

                  const sevBadge = isCritical ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <AlertTriangle size={11} /> CRITICAL
                    </span>
                  ) : isWarning ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <AlertTriangle size={11} /> WARNING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      <Info size={11} /> INFO
                    </span>
                  )

                  return (
                    <tr key={log.id} className="hover:bg-bg-tertiary/40 transition-colors">
                      <td className="p-3">{sevBadge}</td>
                      <td className="p-3 font-mono font-bold text-text-primary">{log.action}</td>
                      <td className="p-3 text-accent font-medium">{log.resource}</td>
                      <td className="p-3 text-text-secondary flex items-center gap-1">
                        <User size={12} className="text-text-tertiary" /> {log.userName || 'System'}
                      </td>
                      <td className="p-3 text-text-tertiary max-w-sm truncate">{log.details || '—'}</td>
                      <td className="p-3 text-right text-text-tertiary font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-xs text-text-tertiary space-y-2">
          <ShieldCheck size={32} className="mx-auto opacity-30 text-success" />
          <p>No audit events found matching the selected criteria.</p>
        </div>
      )}
    </div>
  )
}
