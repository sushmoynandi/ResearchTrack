'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface TopicCluster {
  id: string
  name: string
  paperCount: number
  growth: string
  color: string
  researchers: string[]
}

const DEFAULT_CLUSTERS: TopicCluster[] = [
  {
    id: 'cluster-transformers',
    name: 'Transformer Architectures & Attention',
    paperCount: 8,
    growth: '+3 this month',
    color: '#06b6d4',
    researchers: ['Sophia Chen', 'Sushmoy Nandi'],
  },
  {
    id: 'cluster-diffusion',
    name: 'Continuous Normalizing Flows & Diffusion',
    paperCount: 5,
    growth: '+2 this month',
    color: '#a855f7',
    researchers: ['Sophia Chen'],
  },
  {
    id: 'cluster-alignment',
    name: 'RLHF, DPO & Value Alignment',
    paperCount: 6,
    growth: '+4 this month',
    color: '#10b981',
    researchers: ['Sushmoy Nandi', 'Dr. Evelyn Vance'],
  },
  {
    id: 'cluster-efficiency',
    name: 'Quantization & FlashAttention Systems',
    paperCount: 4,
    growth: '+1 this month',
    color: '#f59e0b',
    researchers: ['Sushmoy Nandi'],
  },
]

export function LabReadingVelocityWidget() {
  const [selectedCluster, setSelectedCluster] = useState<string>(DEFAULT_CLUSTERS[0].id)
  const active = DEFAULT_CLUSTERS.find((c) => c.id === selectedCluster) || DEFAULT_CLUSTERS[0]

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
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
            <Flame size={13} /> High Research Momentum
          </span>
        </div>
      </div>

      {/* Primary Velocity Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Weekly Reading Velocity</span>
          <p className="text-2xl font-bold text-text-primary font-display flex items-baseline gap-1.5">
            4.2 <span className="text-xs font-normal text-text-tertiary font-sans">papers / wk</span>
          </p>
          <span className="text-[10px] text-success font-medium">↑ 18% vs last month</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Average Synthesis Time</span>
          <p className="text-2xl font-bold text-text-primary font-display flex items-baseline gap-1.5">
            2.4 <span className="text-xs font-normal text-text-tertiary font-sans">days / paper</span>
          </p>
          <span className="text-[10px] text-text-tertiary">From To-Read to Completed</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Annotation Density</span>
          <p className="text-2xl font-bold text-accent font-display flex items-baseline gap-1.5">
            5.8 <span className="text-xs font-normal text-text-tertiary font-sans">notes / paper</span>
          </p>
          <span className="text-[10px] text-text-tertiary">Across 20-col surveys</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-1">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Active Research Clusters</span>
          <p className="text-2xl font-bold text-purple-400 font-display">
            {DEFAULT_CLUSTERS.length} Subfields
          </p>
          <span className="text-[10px] text-purple-400 font-medium">100% lab coverage</span>
        </div>
      </div>

      {/* Interactive Topic Cluster Map */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={14} className="text-accent" /> Active Research Topic Cluster Map
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEFAULT_CLUSTERS.map((cluster) => {
            const isSelected = cluster.id === selectedCluster
            return (
              <div
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-bg-secondary border-accent shadow-sm'
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
        <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active.color }} />
              <h5 className="text-xs font-bold text-text-primary">{active.name}</h5>
            </div>
            <p className="text-xs text-text-secondary">
              Active researchers: <strong className="text-text-primary">{active.researchers.join(', ')}</strong> ({active.paperCount} papers cataloged)
            </p>
          </div>

          <Link href={`/papers?search=${encodeURIComponent(active.name.split(' ')[0])}`}>
            <Button size="xs" variant="secondary" icon={<ArrowRight size={13} />}>
              Explore Cluster Papers
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
