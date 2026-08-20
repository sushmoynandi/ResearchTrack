'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Zap,
  Activity,
  Layers,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  FolderOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

interface TopicCluster {
  id: string
  name: string
  paperCount: number
  growth: string
  color: string
  researchers: string[]
  description?: string
  type: 'group' | 'collection' | 'tag'
}

interface VelocityData {
  weeklyRate: string
  weeklyUnit: string
  growthLabel: string
  averageSynthesisTime: string
  averageSynthesisUnit: string
  annotationDensity: string
  annotationUnit: string
  activeClustersCount: number
  momentumLabel: string
  totalPapers: number
  totalCompleted: number
}

const DEFAULT_CLUSTERS: TopicCluster[] = [
  {
    id: 'cluster-transformers',
    name: 'Transformer Architectures & Attention',
    paperCount: 8,
    growth: '+3 active',
    color: '#06b6d4',
    researchers: ['Sophia Chen', 'Sushmoy Nandi'],
    type: 'tag',
  },
  {
    id: 'cluster-diffusion',
    name: 'Generative Models & Diffusion',
    paperCount: 5,
    growth: '+2 active',
    color: '#a855f7',
    researchers: ['Sophia Chen'],
    type: 'tag',
  },
  {
    id: 'cluster-alignment',
    name: 'RLHF, Alignment & Reasoning',
    paperCount: 6,
    growth: '+4 active',
    color: '#10b981',
    researchers: ['Sushmoy Nandi', 'Dr. Evelyn Vance'],
    type: 'tag',
  },
  {
    id: 'cluster-efficiency',
    name: 'Efficient Inference & Systems',
    paperCount: 4,
    growth: '+1 active',
    color: '#f59e0b',
    researchers: ['Sushmoy Nandi'],
    type: 'tag',
  },
]

export function LabReadingVelocityWidget() {
  const [clusters, setClusters] = useState<TopicCluster[]>([])
  const [velocity, setVelocity] = useState<VelocityData>({
    weeklyRate: '0.0',
    weeklyUnit: 'papers / wk',
    growthLabel: '0 papers completed',
    averageSynthesisTime: '0.0',
    averageSynthesisUnit: 'days / paper',
    annotationDensity: '0.0',
    annotationUnit: 'notes / paper',
    activeClustersCount: 0,
    momentumLabel: 'Awaiting Research Activity',
    totalPapers: 0,
    totalCompleted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedClusterId, setSelectedClusterId] = useState<string>('')

  useEffect(() => {
    async function fetchVelocityData() {
      try {
        const res = await fetch('/api/analytics/velocity')
        if (res.ok) {
          const data = await res.json()
          if (data.clusters) {
            setClusters(data.clusters)
            if (data.clusters.length > 0) {
              setSelectedClusterId(data.clusters[0].id)
            }
          }
          if (data.velocity) {
            setVelocity(data.velocity)
          }
        }
      } catch (err) {
        console.error('Error fetching reading velocity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVelocityData()
  }, [])

  const activeCluster = clusters.find((c) => c.id === selectedClusterId) || clusters[0]

  if (loading) {
    return (
      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border-default pb-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
              Lab Reading Velocity &amp; Research Topic Clusters
            </h3>
            <p className="text-xs text-text-secondary">
              Real-time reading volume, literature synthesis speed, and active subfield clusters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
            <Flame size={13} /> {velocity.momentumLabel}
          </span>
        </div>
      </div>

      {/* Primary Velocity Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Weekly Reading Velocity</span>
          <p className="text-2xl font-bold text-text-primary font-display flex items-baseline gap-1.5">
            {velocity.weeklyRate}{' '}
            <span className="text-xs font-normal text-text-tertiary font-sans">{velocity.weeklyUnit}</span>
          </p>
          <span className="text-[10px] text-success font-medium">{velocity.growthLabel}</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Average Synthesis Time</span>
          <p className="text-2xl font-bold text-text-primary font-display flex items-baseline gap-1.5">
            {velocity.averageSynthesisTime}{' '}
            <span className="text-xs font-normal text-text-tertiary font-sans">{velocity.averageSynthesisUnit}</span>
          </p>
          <span className="text-[10px] text-text-tertiary">From To-Read to Completed</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Annotation Density</span>
          <p className="text-2xl font-bold text-accent font-display flex items-baseline gap-1.5">
            {velocity.annotationDensity}{' '}
            <span className="text-xs font-normal text-text-tertiary font-sans">{velocity.annotationUnit}</span>
          </p>
          <span className="text-[10px] text-text-tertiary">Across active surveys</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Active Research Clusters</span>
          <p className="text-2xl font-bold text-purple-400 font-display">
            {velocity.activeClustersCount} Clusters
          </p>
          <span className="text-[10px] text-purple-400 font-medium">Live workspace sync</span>
        </div>
      </div>

      {/* Interactive Topic Cluster Map */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-accent" /> Active Research Topic Cluster Map ({clusters.length})
          </h4>
          {clusters.length > 0 && (
            <span className="text-[11px] text-text-tertiary">Click any cluster to inspect research focus</span>
          )}
        </div>

        {clusters.length === 0 ? (
          <div className="p-6 rounded-xl bg-bg-secondary/40 border border-dashed border-border-default text-center space-y-2">
            <Layers size={22} className="mx-auto text-text-tertiary" />
            <p className="text-xs font-semibold text-text-secondary">No Active Research Topic Clusters Yet</p>
            <p className="text-[11px] text-text-tertiary max-w-md mx-auto">
              Create a Research Lab with Sub-Group clusters or add papers and collections to populate active research topics.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {clusters.map((cluster) => {
                const isSelected = cluster.id === selectedClusterId
                return (
                  <div
                    key={cluster.id}
                    onClick={() => setSelectedClusterId(cluster.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-bg-secondary border-accent shadow-sm ring-1 ring-accent/30'
                        : 'bg-bg-secondary/60 border-border-default hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="text-[10px] text-success font-mono font-medium">
                        {cluster.growth}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-text-primary font-display line-clamp-1">
                      {cluster.name}
                    </h5>

                    <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1 border-t border-border-default/40">
                      <span>{cluster.paperCount} papers</span>
                      <span>{cluster.researchers.length} researchers</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected Cluster Detail Panel */}
            {activeCluster && (
              <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCluster.color }} />
                    <h5 className="text-xs font-bold text-text-primary">{activeCluster.name}</h5>
                    {activeCluster.type === 'group' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cyan-500/15 text-cyan-300 font-mono">
                        Sub-Group
                      </span>
                    )}
                    {activeCluster.type === 'collection' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/15 text-purple-300 font-mono">
                        Collection
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Active researchers:{' '}
                    <strong className="text-text-primary">{activeCluster.researchers.join(', ')}</strong> ({activeCluster.paperCount} papers cataloged)
                  </p>
                </div>

                <Link href={`/papers?search=${encodeURIComponent(activeCluster.name.split(' ')[0])}`}>
                  <Button size="xs" variant="secondary" icon={<ArrowRight size={13} />}>
                    Explore Cluster Papers
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

