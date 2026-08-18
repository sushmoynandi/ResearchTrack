'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Compass,
  Sparkles,
  BookOpen,
  Plus,
  Check,
  ExternalLink,
  Layers,
  Calendar,
  Zap,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface RecommendedItem {
  id: string
  title: string
  authors: string
  abstract?: string | null
  journal?: string | null
  publicationYear?: number | null
  citationCount?: number | null
  arxivId?: string | null
  doi?: string | null
  url?: string | null
  category: 'foundational' | 'recent' | 'alternative'
  reason: string
}

export function ConnectedLiteratureExplorer({
  paperId,
  paperTitle,
}: {
  paperId: string
  paperTitle: string
}) {
  const { addToast } = useToast()
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<string[]>([])

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const res = await fetch(`/api/papers/${paperId}/recommendations`)
        if (res.ok) {
          const data = await res.json()
          setRecommendations(data.recommendations || [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadRecommendations()
  }, [paperId])

  const handleAddToLibrary = async (rec: RecommendedItem) => {
    setAddingId(rec.id)
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          authors: rec.authors,
          abstract: rec.abstract || `Recommended literature related to "${paperTitle}"`,
          journal: rec.journal || null,
          publicationYear: rec.publicationYear || null,
          citationCount: rec.citationCount || 0,
          arxivId: rec.arxivId || null,
          doi: rec.doi || null,
          url: rec.url || null,
          status: 'TO_READ',
          priority: 'MEDIUM',
          tags: [rec.category, 'connected-literature'],
        }),
      })

      if (res.ok) {
        setAddedIds((prev) => [...prev, rec.id])
        addToast('success', `Added "${rec.title.slice(0, 40)}..." to library!`)
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to add paper')
      }
    } catch {
      addToast('error', 'Network error adding paper to library')
    } finally {
      setAddingId(null)
    }
  }

  const filtered = recommendations.filter((r) => {
    if (filterCategory === 'all') return true
    return r.category === filterCategory
  })

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
            <Compass size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
              Connected Literature &amp; Semantic Discovery Engine
            </h3>
            <p className="text-xs text-text-secondary">
              Discovered seminal citations, latest derivatives, and competing baselines
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Connected' },
            { id: 'foundational', label: '🏛️ Foundational' },
            { id: 'recent', label: '⚡ Recent Advances' },
            { id: 'alternative', label: '⚔️ Alternatives' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-accent text-bg-primary font-bold'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of recommendations */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="150px" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filtered.map((rec) => {
            const isAdded = addedIds.includes(rec.id)
            const isAdding = addingId === rec.id

            const badgeColor =
              rec.category === 'foundational'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : rec.category === 'recent'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'

            return (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-bg-secondary border border-border-default hover:border-accent/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${badgeColor}`}>
                      {rec.category}
                    </span>
                    {rec.citationCount !== null && rec.citationCount !== undefined && (
                      <span className="text-[11px] font-mono text-text-tertiary">
                        📚 {rec.citationCount.toLocaleString()} citations
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors font-display line-clamp-2">
                    {rec.title}
                  </h4>

                  <p className="text-xs text-text-secondary line-clamp-1">
                    {rec.authors} {rec.publicationYear ? `(${rec.publicationYear})` : ''}
                  </p>

                  <p className="text-[11px] text-text-tertiary bg-bg-tertiary/60 p-2 rounded-lg border border-border-default/40 italic">
                    &ldquo;{rec.reason}&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-default">
                  {rec.url ? (
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      View Source <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-xs text-text-tertiary">{rec.journal || 'Academic Paper'}</span>
                  )}

                  {isAdded ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                      <Check size={13} /> Added to Library
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleAddToLibrary(rec)}
                      loading={isAdding}
                      icon={<Plus size={12} />}
                    >
                      Add to Library
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-text-tertiary">
          No connected papers found in this filter category.
        </div>
      )}
    </div>
  )
}
