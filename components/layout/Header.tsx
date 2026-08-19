'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Plus, FileText, ArrowRight, X, Menu } from 'lucide-react'
import { StatusBadge } from '@/components/papers/StatusBadge'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserMenu } from '@/components/auth/UserMenu'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSidebar } from './SidebarContext'
import type { Paper } from '@/lib/types'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/papers': 'Research Library & Matrix',
  '/papers/new': 'Add New Research Paper',
  '/collections': 'Paper Collections & Syntheses',
  '/tracks': 'Reading Tracks & Lineage',
  '/tags': 'Taxonomy & Tags Management',
  '/assignments': 'Supervisory Paper Assignments',
  '/meetings': '1-on-1 Mentorship Meetings',
  '/students': 'My Supervised Students',
  '/labs': 'Academic Research Labs & Clusters',
  '/admin/users': 'User Management & Access Control',
  '/admin/audit': 'Security & System Audit Trail',
  '/profile': 'Researcher Profile & Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (/^\/labs\/[^/]+$/.test(pathname)) return 'Lab Workspace & Clusters'
  if (/^\/papers\/[^/]+\/reader$/.test(pathname)) return 'In-App PDF Reader'
  if (/^\/papers\/[^/]+\/present$/.test(pathname)) return 'Presentation Mode'
  if (/^\/papers\/[^/]+\/edit$/.test(pathname)) return 'Edit Paper Metadata'
  if (/^\/papers\/[^/]+$/.test(pathname)) return 'Paper Workspace'
  if (/^\/collections\/[^/]+$/.test(pathname)) return 'Collection Workspace'
  return 'ResearchTrack'
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const title = getPageTitle(pathname)
  const { isAdmin } = useAuth()
  const { openMobile } = useSidebar()

  // Spotlight search modal state
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSpotlightOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isSpotlightOpen) {
        setIsSpotlightOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSpotlightOpen])

  // Focus search input on open
  useEffect(() => {
    if (isSpotlightOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isSpotlightOpen])

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/papers?search=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.slice(0, 5))
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-border-default bg-bg-primary/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Left: Mobile Drawer Button & Page Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openMobile()
              }}
              className="md:hidden p-2 -ml-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              aria-label="Open mobile navigation menu"
            >
              <Menu size={22} />
            </button>

            <h1 className="text-base sm:text-xl font-semibold text-text-primary font-display tracking-tight truncate max-w-[160px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
              {title}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search trigger button (non-admin) */}
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 h-9 bg-bg-tertiary border border-border-default rounded-lg w-56 text-left transition-all duration-200 hover:border-border-hover cursor-pointer"
                >
                  <Search size={14} className="text-text-tertiary shrink-0" />
                  <span className="flex-1 text-xs text-text-tertiary">Quick search...</span>
                  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-elevated rounded border border-border-default">
                    ⌘K
                  </kbd>
                </button>

                {/* Mobile search button */}
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(true)}
                  className="md:hidden p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
                  aria-label="Search papers"
                >
                  <Search size={18} />
                </button>
              </>
            )}

            {/* Real-time Notifications Bell */}
            <NotificationBell />

            {/* User Profile Menu Dropdown */}
            <UserMenu />

            {/* Add paper button (Researcher / Supervisor only) */}
            {!isAdmin && (
              <Link
                href="/papers/new"
                className="flex items-center gap-2 h-9 px-3.5 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent-hover transition-all duration-200 shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Paper</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Spotlight Search Modal */}
      {isSpotlightOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsSpotlightOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-bg-secondary border border-border-default rounded-xl shadow-modal overflow-hidden animate-scale-in z-10">
            {/* Search Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
              <Search size={18} className="text-accent shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type to search papers, authors, abstracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setIsSpotlightOpen(false)
                    router.push(`/papers?search=${encodeURIComponent(searchQuery)}`)
                  }
                }}
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-text-tertiary hover:text-text-primary cursor-pointer p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results container */}
            <div className="max-h-[360px] overflow-y-auto p-2">
              {loading ? (
                <div className="p-4 text-center text-xs text-text-tertiary animate-pulse">
                  Searching research library...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/papers/${p.id}`}
                      onClick={() => setIsSpotlightOpen(false)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-tertiary transition-colors group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                          {p.title}
                        </p>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {p.authors} {p.publicationYear ? `(${p.publicationYear})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={p.status} />
                        <ArrowRight size={14} className="text-text-tertiary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-6 text-center text-xs text-text-tertiary">
                  No papers found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-text-tertiary">
                  Start typing to search your library by title, author, or keyword
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-bg-tertiary/50 border-t border-border-default flex items-center justify-between text-[11px] text-text-tertiary font-mono">
              <span>Press <kbd className="px-1 bg-bg-elevated rounded">ESC</kbd> to close</span>
              <span>Press <kbd className="px-1 bg-bg-elevated rounded">↵</kbd> to search all</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
