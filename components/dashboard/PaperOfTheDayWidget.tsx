'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Plus,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface PotdData {
  id: string
  doi: string
  title: string
  authors: string
  abstract?: string | null
  journal?: string | null
  year?: number | null
  url?: string | null
  pdfUrl?: string | null
  theme?: string
  score?: string | null
  topics?: string[]
  sentAt?: string | null
  alreadyInLibrary: boolean
}

export function PaperOfTheDayWidget() {
  const [potd, setPotd] = useState<PotdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToLibrary, setAddingToLibrary] = useState(false)
  const [inLibrary, setInLibrary] = useState(false)
  const [addedPaperId, setAddedPaperId] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    async function loadPotd() {
      try {
        const res = await fetch('/api/paper-of-the-day')
        if (res.ok) {
          const data = await res.json()
          if (data && data.potd) {
            setPotd(data.potd)
            setInLibrary(Boolean(data.potd.alreadyInLibrary))
          }
        }
      } catch (err) {
        console.error('Failed to load Paper of the Day:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPotd()
  }, [])

  const handleAddToLibrary = async () => {
    if (!potd) return
    try {
      setAddingToLibrary(true)
      const res = await fetch('/api/paper-of-the-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potdId: potd.id }),
      })

      const data = await res.json()
      if (res.ok) {
        setInLibrary(true)
        if (data.paper?.id) {
          setAddedPaperId(data.paper.slug || data.paper.id)
        }
        addToast('success', data.message || 'Added to your library!')
      } else {
        addToast('error', data.error || 'Failed to add paper')
      }
    } catch {
      addToast('error', 'Network error adding paper to library')
    } finally {
      setAddingToLibrary(false)
    }
  }

  if (loading || !potd) return null

  const readUrl = potd.url || (potd.doi ? ('https://doi.org/' + potd.doi) : '#')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/10 via-bg-secondary to-sky-500/5 p-5 md:p-6 shadow-lg backdrop-blur-md animate-fade-in space-y-4">
      {/* Decorative ambient sky-blue background glows */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent border border-accent/30 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <Sparkles size={13} className="text-accent animate-pulse" /> Paper of the Day
          </span>
        </div>

        <span className="text-[11px] font-mono text-text-tertiary">
          Daily Literature Spotlight · {new Date(potd.sentAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Main Content Body */}
      <div className="relative space-y-2.5">
        <div className="space-y-1">
          <a
            href={readUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base md:text-lg font-bold text-text-primary hover:text-accent transition-colors inline-block leading-snug group"
          >
            <span>{potd.title}</span>
            <ExternalLink size={13} className="inline-block ml-1.5 opacity-60 group-hover:opacity-100 text-accent" />
          </a>

          <p className="text-xs text-text-secondary font-medium">
            By {potd.authors}
          </p>
        </div>

        {potd.abstract && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed bg-bg-primary/40 p-3 rounded-xl border border-border-default/60">
            {potd.abstract}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {(potd.journal || potd.year) && (
              <span className="text-[11px] font-medium text-text-tertiary font-mono bg-bg-tertiary px-2 py-0.5 rounded-md border border-border-default/60">
                {[potd.journal, potd.year].filter(Boolean).join(' • ')}
              </span>
            )}

            {potd.topics && potd.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {potd.topics.slice(0, 3).map((topic, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 text-[10px] font-mono"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {inLibrary ? (
              <Link href={addedPaperId ? `/papers/${addedPaperId}` : '/papers'}>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CheckCircle2 size={14} className="text-emerald-400" />}
                  className="text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold"
                >
                  In Library
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="primary"
                loading={addingToLibrary}
                onClick={handleAddToLibrary}
                icon={<Plus size={14} />}
                className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-md shadow-accent/25"
              >
                Save to Library
              </Button>
            )}

            <a
              href={readUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                variant="secondary"
                icon={<BookOpen size={13} className="text-accent" />}
                className="text-xs hover:border-accent/40 hover:text-accent transition-colors"
              >
                Read Paper
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
