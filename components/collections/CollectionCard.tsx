'use client'

import React from 'react'
import Link from 'next/link'
import { FolderOpen, FileText, MoreVertical, Edit2, Trash2, ArrowRight } from 'lucide-react'
import type { Collection, Paper } from '@/lib/types'

interface CollectionWithPapers extends Collection {
  _count?: { papers: number }
  papers?: Partial<Paper>[]
}

interface CollectionCardProps {
  collection: CollectionWithPapers
  onEdit: (collection: CollectionWithPapers) => void
  onDelete: (collection: CollectionWithPapers) => void
}

export function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  const paperCount = collection._count?.papers ?? collection.papers?.length ?? 0
  const color = collection.color || '#06b6d4'

  return (
    <div className="glass-card group relative p-5 flex flex-col justify-between hover:border-border-hover transition-all duration-200">
      <div>
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            <FolderOpen size={20} />
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(collection)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              title="Edit Collection"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(collection)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
              title="Delete Collection"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Info */}
        <Link href={`/collections/${collection.id}`} className="block group-hover:text-accent">
          <h3 className="text-base font-semibold text-text-primary font-display line-clamp-1 group-hover:text-accent transition-colors">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mt-1.5">
              {collection.description}
            </p>
          )}
        </Link>

        {/* Paper previews if any */}
        {collection.papers && collection.papers.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {collection.papers.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs text-text-tertiary truncate py-0.5"
              >
                <FileText size={12} className="shrink-0 text-text-secondary" />
                <span className="truncate">{p.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-border-default flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          {paperCount} {paperCount === 1 ? 'paper' : 'papers'}
        </span>

        <Link
          href={`/collections/${collection.id}`}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
        >
          View papers <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
