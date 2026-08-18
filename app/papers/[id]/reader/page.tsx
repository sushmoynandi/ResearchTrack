'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PdfReaderWorkspace } from '@/components/reader/PdfReaderWorkspace'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Paper } from '@/lib/types'

export default function PaperReaderPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  const paperId = params.id as string

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}?_t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setPaper(data)
      } else {
        addToast('error', 'Paper not found')
        router.push('/papers')
      }
    } catch {
      addToast('error', 'Failed to load paper for reader')
    } finally {
      setLoading(false)
    }
  }, [paperId, router, addToast])

  useEffect(() => {
    fetchPaper()
  }, [fetchPaper])

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[650px] w-full" />
      </div>
    )
  }

  if (!paper) return null

  return (
    <div className="max-w-7xl mx-auto">
      <PdfReaderWorkspace paper={paper} />
    </div>
  )
}
