'use client'

import React, { useEffect, useState } from 'react'
import { PlayCircle, GraduationCap, HelpCircle, ExternalLink, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { youTubeEmbedUrl, youTubeThumbnailUrl, youTubeWatchUrl } from '@/lib/youtube'

interface HelpVideo {
  id: string
  title: string
  description: string | null
  videoId: string
  audience: 'ALL' | 'STUDENT' | 'SUPERVISOR'
  createdAt: string
}

const audienceLabel: Record<HelpVideo['audience'], string> = {
  ALL: 'Everyone',
  STUDENT: 'For students',
  SUPERVISOR: 'For supervisors',
}

export default function HelpPage() {
  const { addToast } = useToast()
  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loading, setLoading] = useState(true)
  /** The one video whose player has been opened — only one plays at a time. */
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/help-videos')
        if (res.ok) {
          const data = await res.json()
          setVideos(data.videos || [])
        } else {
          addToast('error', 'Could not load the tutorial videos')
        }
      } catch {
        addToast('error', 'Network error loading the tutorial videos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [addToast])

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6 border-border-default/80">
        <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-accent-subtle text-accent border border-accent/30 inline-flex items-center gap-1">
          <GraduationCap size={12} /> Getting started
        </span>
        <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight mt-1">
          How to Use ResearchTrack
        </h2>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          Short walkthrough videos for every part of the app — adding papers, reading tracks,
          assignments and meetings. Pick one and press play.
        </p>
      </div>

      {/* Videos */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton variant="card" height="180px" />
              <Skeleton variant="text" width="60%" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<HelpCircle size={44} />}
          title="No tutorial videos yet"
          description="Your administrator has not published any walkthrough videos. Check back soon."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {videos.map((video) => {
            const isPlaying = playingId === video.id
            return (
              <article
                key={video.id}
                className="glass-card overflow-hidden border-border-default/80 flex flex-col"
              >
                <div className="relative aspect-video bg-bg-tertiary">
                  {isPlaying ? (
                    <iframe
                      src={`${youTubeEmbedUrl(video.videoId)}&autoplay=1`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  ) : (
                    /* A still image until it's clicked, so opening the page
                       doesn't load a YouTube player for every video at once. */
                    <button
                      type="button"
                      onClick={() => setPlayingId(video.id)}
                      className="group absolute inset-0 w-full h-full cursor-pointer"
                      aria-label={`Play ${video.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={youTubeThumbnailUrl(video.videoId)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <span className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors duration-200" />
                      <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-lg">
                        <PlayCircle size={56} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
                      </span>
                    </button>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-text-primary leading-snug">
                      {video.title}
                    </h3>
                    {video.audience !== 'ALL' && (
                      <Badge variant="outline" size="sm">
                        <span className="inline-flex items-center gap-1">
                          <Users size={10} /> {audienceLabel[video.audience]}
                        </span>
                      </Badge>
                    )}
                  </div>

                  {video.description && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {video.description}
                    </p>
                  )}

                  <a
                    href={youTubeWatchUrl(video.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-2 text-[11px] text-text-tertiary hover:text-accent inline-flex items-center gap-1 transition-colors w-fit"
                  >
                    Open on YouTube <ExternalLink size={11} />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
