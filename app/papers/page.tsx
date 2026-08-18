'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PaperCard } from '@/components/papers/PaperCard'
import { PaperRow } from '@/components/papers/PaperRow'
import { PaperFilters } from '@/components/papers/PaperFilters'
import { LiteratureReviewTable } from '@/components/papers/LiteratureReviewTable'
import { ExportMatrixModal } from '@/components/papers/ExportMatrixModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LayoutGrid, List, FileText, Table2, Download } from 'lucide-react'
import type { Paper } from '@/lib/types'

type ViewMode = 'grid' | 'list' | 'matrix'

export default function PapersPage() {
  const [papers, setPapers] = useState<(Paper & { _count?: { notes: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filter state
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [tag, setTag] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState('createdAt')
  const [isExportOpen, setIsExportOpen] = useState(false)

  const hasActiveFilters = !!(search || status || priority || tag || favoritesOnly)

  const fetchPapers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (priority) params.set('priority', priority)
      if (tag) params.set('tag', tag)
      if (favoritesOnly) params.set('favorite', 'true')
      if (sort) params.set('sort', sort)
      params.set('order', 'desc')
      params.set('_t', Date.now().toString())

      const res = await fetch(`/api/papers?${params}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      if (res.ok) {
        const data = await res.json()
        setPapers(data)
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, status, priority, tag, favoritesOnly, sort])

  useEffect(() => {
    const debounce = setTimeout(fetchPapers, 300)
    return () => clearTimeout(debounce)
  }, [fetchPapers])

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPriority('')
    setTag('')
    setFavoritesOnly(false)
    setSort('createdAt')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} in your research library
          </p>
        </div>

        {/* Actions & View toggle */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            icon={<Download size={14} />}
            onClick={() => setIsExportOpen(true)}
            disabled={papers.length === 0}
          >
            Export Matrix
          </Button>

          <div className="flex items-center bg-bg-secondary border border-border-default rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs ${
                viewMode === 'grid'
                  ? 'bg-bg-tertiary text-text-primary shadow-xs font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              aria-label="Grid view"
              title="Grid Cards View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs ${
                viewMode === 'list'
                  ? 'bg-bg-tertiary text-text-primary shadow-xs font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              aria-label="List view"
              title="Compact List View"
            >
              <List size={15} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-2 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs ${
                viewMode === 'matrix'
                  ? 'bg-accent/20 text-accent border border-accent/40 shadow-xs font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              aria-label="Survey Matrix view"
              title="20-Column Literature Review Matrix Table"
            >
              <Table2 size={15} />
              <span className="hidden sm:inline">Review Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters (only show in grid/list mode or when not in matrix) */}
      {viewMode !== 'matrix' && (
        <PaperFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          sort={sort}
          onSortChange={setSort}
          tag={tag}
          onTagChange={setTag}
          favoritesOnly={favoritesOnly}
          onFavoritesToggle={() => setFavoritesOnly((prev) => !prev)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={viewMode === 'grid' ? '220px' : '72px'} />
          ))}
        </div>
      )}

      {/* 20-Column Review Matrix View */}
      {!loading && viewMode === 'matrix' && (
        <LiteratureReviewTable papers={papers} />
      )}

      {/* Empty state */}
      {!loading && viewMode !== 'matrix' && papers.length === 0 && (
        <EmptyState
          icon={<FileText size={48} />}
          title={hasActiveFilters ? 'No papers match your filters' : 'No papers yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Add your first research paper to start building your library.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add Paper'}
          actionHref={hasActiveFilters ? undefined : '/papers/new'}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      )}

      {/* Grid view */}
      {!loading && viewMode === 'grid' && papers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && viewMode === 'list' && papers.length > 0 && (
        <div className="space-y-2">
          {papers.map((paper) => (
            <PaperRow key={paper.id} paper={paper} />
          ))}
        </div>
      )}

      {/* Export Matrix & BibTeX Modal */}
      <ExportMatrixModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        papers={papers}
        title="Export Research Library Matrix & BibTeX"
      />
    </div>
  )
}
