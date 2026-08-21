'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PaperForm } from '@/components/papers/PaperForm'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Paper } from '@/lib/types'

export default function EditPaperPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  const paperId = params.id as string

  useEffect(() => {
    async function fetchPaper() {
      try {
        const res = await fetch(`/api/papers/${paperId}?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        })
        if (res.ok) {
          const data = await res.json()
          setPaper(data)
          if (data.slug && paperId !== data.slug && typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href)
            currentUrl.pathname = `/papers/${data.slug}/edit`
            window.history.replaceState(null, '', currentUrl.toString())
          }
        } else {
          addToast('error', 'Paper not found')
          router.push('/papers')
        }
      } catch {
        addToast('error', 'Failed to load paper')
      } finally {
        setLoading(false)
      }
    }
    fetchPaper()
  }, [paperId, router, addToast])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton variant="rect" height="2rem" width="40%" />
        <Skeleton variant="card" height="400px" />
      </div>
    )
  }

  if (!paper) return null

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="text-text-secondary text-sm">
          Update the details for &quot;{paper.title}&quot;
        </p>
      </div>
      <div className="glass-card p-6 md:p-8">
        <PaperForm paper={paper} mode="edit" />
      </div>
    </div>
  )
}
