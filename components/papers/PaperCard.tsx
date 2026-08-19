'use client'

import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { PriorityIndicator } from './PriorityIndicator'
import { StarButton } from './StarButton'
import { Badge } from '@/components/ui/Badge'
import {
  Calendar,
  MessageSquare,
  ExternalLink,
  Cpu,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react'
import { GithubIcon } from '@/components/ui/Icons'
import type { Paper, BenchmarkScore } from '@/lib/types'
import { REPLICATION_LABELS, REPLICATION_COLORS } from '@/lib/types'

interface PaperCardProps {
  paper: Paper & { _count?: { notes: number } }
  onUpdate?: () => void
}

export function PaperCard({ paper, onUpdate }: PaperCardProps) {
  // Parse benchmarks if present
  let benchmarks: BenchmarkScore[] = []
  if (paper.benchmarks) {
    try {
      benchmarks = JSON.parse(paper.benchmarks)
    } catch {
      benchmarks = []
    }
  }

  return (
    <Link href={`/papers/${paper.id}`} className="block group">
      <article className="glass-card p-5 h-full flex flex-col justify-between transition-all duration-200 group-hover:border-border-hover">
        <div>
          {/* Top row: Status + Priority + Star */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={paper.status} size="sm" />
              <PriorityIndicator priority={paper.priority} size="sm" />
              {paper.replicationStatus && paper.replicationStatus !== 'UNTESTED' && (
                <Badge
                  variant={REPLICATION_COLORS[paper.replicationStatus] as 'success' | 'warning' | 'danger' | 'default'}
                  size="sm"
                >
                  {REPLICATION_LABELS[paper.replicationStatus]}
                </Badge>
              )}
            </div>
            <StarButton
              paperId={paper.id}
              initialFavorite={paper.isFavorite}
              onToggle={onUpdate}
            />
          </div>

          {/* Assigned Person / Supervisor Badge */}
          {paper.assignments && paper.assignments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              {paper.assignments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  title={`Assigned by ${a.assignedBy?.name || 'Supervisor'} to ${a.student?.name || 'Student'}`}
                >
                  <UserCheck size={11} />
                  <span>
                    {a.assignedBy?.name ? `Assigned by ${a.assignedBy.name}` : a.student?.name ? `Assigned to ${a.student.name}` : 'Assigned Paper'}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="text-base font-semibold text-text-primary mb-1.5 line-clamp-2 group-hover:text-accent transition-colors duration-200">
            {paper.title}
          </h3>

          {/* Authors */}
          <p className="text-sm text-text-secondary mb-2 line-clamp-1">
            {paper.authors}
          </p>

          {/* AI/ML Highlights: Architecture / Parameters */}
          {(paper.architecture || paper.parameters || paper.contextWindow) && (
            <div className="flex items-center gap-1.5 flex-wrap my-2.5">
              {paper.architecture && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-bg-tertiary text-accent border border-border-default">
                  <Cpu size={11} /> {paper.architecture}
                </span>
              )}
              {paper.parameters && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-bg-elevated text-text-secondary">
                  {paper.parameters}
                </span>
              )}
              {paper.contextWindow && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-bg-elevated text-text-tertiary">
                  {paper.contextWindow}
                </span>
              )}
            </div>
          )}

          {/* Abstract preview */}
          {paper.abstract && (
            <p className="text-xs text-text-tertiary mb-3 line-clamp-2">
              {paper.abstract}
            </p>
          )}

          {/* Benchmark Teaser */}
          {benchmarks.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-tertiary/60 px-2 py-1 rounded-md mb-3 border border-border-default/60">
              <Trophy size={12} className="text-warning shrink-0" />
              <span className="font-semibold text-text-primary">{benchmarks[0].name}:</span>
              <span className="text-accent font-mono font-medium">{benchmarks[0].score}</span>
              {benchmarks.length > 1 && (
                <span className="text-[10px] text-text-tertiary ml-auto">+{benchmarks.length - 1} more</span>
              )}
            </div>
          )}

          {/* Tags */}
          {paper.tags && paper.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {paper.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" size="sm">
                  #{tag.name}
                </Badge>
              ))}
              {paper.tags.length > 3 && (
                <Badge variant="outline" size="sm">
                  +{paper.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Bottom meta */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-default text-text-tertiary text-xs">
          {paper.publicationYear && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {paper.publicationYear}
            </span>
          )}
          {paper.journal && (
            <span className="truncate max-w-[120px]">
              {paper.journal}
            </span>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {paper.codeUrl && (
              <span title="Code Repository Available" className="text-accent">
                <GithubIcon size={13} />
              </span>
            )}
            {paper._count?.notes ? (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {paper._count.notes}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
