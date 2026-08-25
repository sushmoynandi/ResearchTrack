'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { PdfReaderWorkspace } from '@/components/reader/PdfReaderWorkspace'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Paper } from '@/lib/types'

export default function PaperReaderPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAccessDenied, setIsAccessDenied] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('')

  const paperId = params.id as string

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}?_t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setPaper(data)
        setIsAccessDenied(false)
        if (data.slug && paperId !== data.slug && typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href)
          currentUrl.pathname = `/papers/${data.slug}/reader`
          window.history.replaceState(null, '', currentUrl.toString())
        }
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}))
        setIsAccessDenied(true)
        setAccessDeniedMessage(
          errData.error || 'You do not have permission to access this private paper workspace.'
        )
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

  if (isAccessDenied) {
    return (
      <div className="max-w-xl mx-auto glass-card p-10 text-center space-y-5 my-12 border-rose-500/30">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary font-display">Access Denied</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {accessDeniedMessage || 'You do not have permission to access this private paper workspace.'}
          </p>
        </div>
        <div className="pt-2">
          <Link href="/papers">
            <Button variant="primary" size="sm" icon={<ArrowLeft size={14} />}>
              Back to Paper Library
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!paper) return null

  return (
    <div className="w-full">
      <PdfReaderWorkspace paper={paper} />
    </div>
  )
}
