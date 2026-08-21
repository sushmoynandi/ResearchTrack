'use client'

import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { PriorityIndicator } from './PriorityIndicator'
import { StarButton } from './StarButton'
import { Badge } from '@/components/ui/Badge'
import { MessageSquare, Cpu, Trophy, UserCheck } from 'lucide-react'
import { GithubIcon } from '@/components/ui/Icons'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Paper } from '@/lib/types'
import { REPLICATION_LABELS, REPLICATION_COLORS } from '@/lib/types'

interface PaperRowProps {
  paper: Paper & { _count?: { notes: number } }
  onUpdate?: () => void
}

export function PaperRow({ paper, onUpdate }: PaperRowProps) {
  const { user } = useAuth()
  const firstAssignment = paper.assignments?.[0]
  const isAssignedToCurrentUser = user?.id === firstAssignment?.studentId
  const isStudentView = user?.systemRole === 'STUDENT' && isAssignedToCurrentUser

  return (
    <Link
      href={`/papers/${paper.slug || paper.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-lg surface-interactive group border border-transparent hover:border-border-default"
    >
      {/* Star */}
      <StarButton
        paperId={paper.id}
        initialFavorite={paper.isFavorite}
        onToggle={onUpdate}
      />

      {/* Title + Authors + Specs */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors duration-200">
            {paper.title}
          </h3>
          {paper.codeUrl && (
            <GithubIcon size={13} className="text-accent shrink-0" />
          )}
          {paper.parameters && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono rounded bg-bg-elevated text-text-secondary shrink-0">
              {paper.parameters}
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary truncate mt-0.5">
          {paper.authors}
          {paper.journal && <span className="text-text-tertiary"> · {paper.journal}</span>}
          {paper.publicationYear && <span className="text-text-tertiary"> · {paper.publicationYear}</span>}
          {paper.architecture && <span className="text-accent/80"> · {paper.architecture}</span>}
        </p>
      </div>

      {/* Assigned Person badge */}
      {firstAssignment && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30"
            title={`Assigned by ${firstAssignment.assignedBy?.name || 'Supervisor'} to ${firstAssignment.student?.name || 'Student'}`}
          >
            <UserCheck size={11} />
            <span>
              {isStudentView
                ? `By ${firstAssignment.assignedBy?.name || 'Supervisor'}`
                : `To ${firstAssignment.student?.name || 'Student'}`}
            </span>
            {firstAssignment.status && (
              <span
                className={`ml-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                  firstAssignment.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : firstAssignment.status === 'IN_PROGRESS'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {firstAssignment.status}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Replication Status if set */}
      {paper.replicationStatus && paper.replicationStatus !== 'UNTESTED' && (
        <div className="hidden md:block shrink-0">
          <Badge
            variant={REPLICATION_COLORS[paper.replicationStatus] as 'success' | 'warning' | 'danger' | 'default'}
            size="sm"
          >
            {REPLICATION_LABELS[paper.replicationStatus]}
          </Badge>
        </div>
      )}

      {/* Tags */}
      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
        {paper.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag.id} variant="outline" size="sm">
            #{tag.name}
          </Badge>
        ))}
        {paper.tags && paper.tags.length > 2 && (
          <Badge variant="outline" size="sm">+{paper.tags.length - 2}</Badge>
        )}
      </div>

      {/* Notes count */}
      {paper._count?.notes ? (
        <span className="hidden md:flex items-center gap-1 text-xs text-text-tertiary shrink-0">
          <MessageSquare size={12} />
          {paper._count.notes}
        </span>
      ) : null}

      {/* Priority */}
      <div className="hidden sm:block shrink-0">
        <PriorityIndicator priority={paper.priority} size="sm" />
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={paper.status} size="sm" />
      </div>
    </Link>
  )
}
