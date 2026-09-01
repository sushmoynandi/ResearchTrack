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
      {/* Quick Preset Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono text-text-tertiary uppercase shrink-0 mr-1">Presets:</span>
        <button
          type="button"
          onClick={() => onStatusChange(status === 'READING' ? '' : 'READING')}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 cursor-pointer ${
            status === 'READING'
              ? 'bg-accent text-bg-primary font-bold border-accent shadow-xs'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
          }`}
        >
          🔥 Reading Now
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(status === 'TO_READ' ? '' : 'TO_READ')}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 cursor-pointer ${
            status === 'TO_READ'
              ? 'bg-blue-500 text-white font-bold border-blue-500 shadow-xs'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
          }`}
        >
          📖 To Read
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(status === 'COMPLETED' ? '' : 'COMPLETED')}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 cursor-pointer ${
            status === 'COMPLETED'
              ? 'bg-emerald-500 text-white font-bold border-emerald-500 shadow-xs'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
          }`}
        >
          ✅ Completed
        </button>
        <button
          type="button"
          onClick={() => onPriorityChange(priority === 'HIGH' ? '' : 'HIGH')}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 cursor-pointer ${
            priority === 'HIGH'
              ? 'bg-rose-500 text-white font-bold border-rose-500 shadow-xs'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
          }`}
        >
          🚨 High Priority
        </button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by title, author, or abstract..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        icon={<Search size={16} />}
      />

      {/* Filters row */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
        <div className="w-full sm:w-auto sm:min-w-[140px]">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[140px]">
          <Select
            options={priorityOptions}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[130px]">
          <Select
            options={tagOptions}
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[150px]">
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
            col-span-1 sm:w-auto flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium
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
          <div className="col-span-1 sm:w-auto">
            <Button variant="ghost" size="sm" onClick={onClear} icon={<X size={14} />} className="w-full sm:w-auto">
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
