'use client'

import React, { useState, useEffect } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, X, Star } from 'lucide-react'

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'TO_READ', label: 'To Read' },
  { value: 'READING', label: 'Reading' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const sortOptions = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'publicationYear', label: 'Publication Year' },
  { value: 'updatedAt', label: 'Last Updated' },
]

interface PaperFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  tag: string
  onTagChange: (value: string) => void
  favoritesOnly: boolean
  onFavoritesToggle: () => void
  onClear: () => void
  hasActiveFilters: boolean
}

export function PaperFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  sort,
  onSortChange,
  tag,
  onTagChange,
  favoritesOnly,
  onFavoritesToggle,
  onClear,
  hasActiveFilters,
}: PaperFiltersProps) {
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'All Tags' },
  ])

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags')
        if (res.ok) {
          const data = await res.json()
          setTagOptions([
            { value: '', label: 'All Tags' },
            ...data.map((t: { id: string; name: string }) => ({
              value: t.name,
              label: t.name,
            })),
          ])
        }
      } catch {
        // silently fail, tags filter just won't populate
      }
    }
    fetchTags()
  }, [])

  return (
    <div className="space-y-3">
      {/* Search */}
      <Input
        placeholder="Search by title, author, or abstract..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        icon={<Search size={16} />}
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          />
        </div>
        <div className="min-w-[140px]">
          <Select
            options={priorityOptions}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
          />
        </div>
        <div className="min-w-[130px]">
          <Select
            options={tagOptions}
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
          />
        </div>
        <div className="min-w-[150px]">
          <Select
            options={sortOptions}
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          />
        </div>

        {/* Favorites toggle */}
        <button
          onClick={onFavoritesToggle}
          className={`
            flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium
            transition-all duration-200 cursor-pointer
            ${favoritesOnly
              ? 'bg-warning-subtle border-warning/30 text-warning'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
            }
          `}
        >
          <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} />
          Favorites
        </button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} icon={<X size={14} />}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
