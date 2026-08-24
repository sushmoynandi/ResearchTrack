'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Share2,
  ExternalLink,
  Plus,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Filter,
  Layers,
  ArrowLeft,
  X,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export interface GraphNode {
  id: string
  title: string
  authors: string
  year: number | null
  citationCount: number
  type: 'center' | 'reference' | 'citation'
  venue: string
  url: string
  inLibrary: boolean
  libraryId?: string
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphLink {
  source: string
  target: string
  type: 'cites' | 'referenced_by'
}

interface CitationGraphProps {
  paperId: string
  paperTitle: string
}

export function CitationGraph({ paperId, paperTitle }: CitationGraphProps) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [stats, setStats] = useState<{
    totalReferences: number
    totalCitations: number
    connectedNodesCount: number
  }>({ totalReferences: 0, totalCitations: 0, connectedNodesCount: 0 })

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'reference' | 'citation' | 'library'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [importingId, setImportingId] = useState<string | null>(null)

  // Canvas / SVG Transform
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadCitationNetwork() {
      setLoading(true)
      try {
        const res = await fetch(`/api/papers/${paperId}/citations`)
        if (res.ok) {
          const data = await res.json()
          setNodes(data.nodes || [])
          setLinks(data.links || [])
          setStats(data.stats || { totalReferences: 0, totalCitations: 0, connectedNodesCount: 0 })
          // Select center paper by default
          const center = (data.nodes || []).find((n: GraphNode) => n.type === 'center')
          if (center) setSelectedNode(center)
        } else {
          addToast('error', 'Failed to fetch citation network')
        }
      } catch {
        addToast('error', 'Network error fetching citations')
      } finally {
        setLoading(false)
      }
    }
    loadCitationNetwork()
  }, [paperId, addToast])

  // Compute 2D Circular Layout coordinates
  const positionedNodes = useMemo(() => {
    if (nodes.length === 0) return []
    const width = 800
    const height = 550
    const centerX = width / 2
    const centerY = height / 2

    const refs = nodes.filter((n) => n.type === 'reference')
    const cits = nodes.filter((n) => n.type === 'citation')
    const centerNode = nodes.find((n) => n.type === 'center')

    const result: Array<GraphNode & { cx: number; cy: number; radius: number; color: string }> = []

    // Center Node
    if (centerNode) {
      result.push({
        ...centerNode,
        cx: centerX,
        cy: centerY,
        radius: 28,
        color: '#06b6d4', // Cyan
      })
    }

    // Position References on Left Half-Circle (Radius = 220)
    const refRadius = 220
    refs.forEach((ref, idx) => {
      const angle = Math.PI * 0.5 + (Math.PI / (refs.length + 1)) * (idx + 1)
      const cx = centerX + refRadius * Math.cos(angle)
      const cy = centerY + refRadius * Math.sin(angle) * 0.85
      const sizeRadius = Math.max(12, Math.min(22, 10 + Math.log10(ref.citationCount + 1) * 3))
      result.push({
        ...ref,
        cx,
        cy,
        radius: sizeRadius,
        color: '#10b981', // Emerald green
      })
    })

    // Position Citations on Right Half-Circle (Radius = 240)
    const citRadius = 240
    cits.forEach((cit, idx) => {
      const angle = -Math.PI * 0.5 + (Math.PI / (cits.length + 1)) * (idx + 1)
      const cx = centerX + citRadius * Math.cos(angle)
      const cy = centerY + citRadius * Math.sin(angle) * 0.85
      const sizeRadius = Math.max(12, Math.min(22, 10 + Math.log10(cit.citationCount + 1) * 3))
      result.push({
        ...cit,
        cx,
        cy,
        radius: sizeRadius,
        color: '#f59e0b', // Amber
      })
    })

    return result
  }, [nodes])

  // Filtered nodes
  const displayNodes = useMemo(() => {
    return positionedNodes.filter((n) => {
      if (n.type === 'center') return true
      if (filterType === 'reference' && n.type !== 'reference') return false
      if (filterType === 'citation' && n.type !== 'citation') return false
      if (filterType === 'library' && !n.inLibrary) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.authors.toLowerCase().includes(q) ||
          n.venue.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [positionedNodes, filterType, searchTerm])

  const nodeMap = useMemo(() => {
    return new Map(positionedNodes.map((n) => [n.id, n]))
  }, [positionedNodes])

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && e.target.tagName !== 'circle' && e.target.tagName !== 'text') {
      isDragging.current = true
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      })
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.5, Math.min(2.5, prev + delta)))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // 1-Click Import of Connected Node to Research Library & Matrix
  // 1-Click Import of Connected Node to Research Library & Matrix
  const handleImportNode = async (node: GraphNode) => {
    setImportingId(node.id)
    try {
      // 1. Try to enrich metadata via ArXiv / Semantic Scholar if possible
      let fetched: any = null
      try {
        const query = node.url && node.url.includes('arxiv.org') ? node.url : node.title
        const res = await fetch(`/api/arxiv?query=${encodeURIComponent(query)}`)
        if (res.ok) {
          fetched = await res.json()
        }
      } catch {
        // Enriched metadata fetch is optional fallback
      }

      // 2. Build paper payload using enriched data or node metadata
      const paperPayload = {
        title: fetched?.title || node.title,
        authors: fetched?.authors || node.authors || 'Unknown Authors',
        abstract: fetched?.abstract || `Imported via Citation Graph exploration connected to "${paperTitle}".`,
        doi: fetched?.doi || null,
        url: fetched?.url || node.url || null,
        journal: fetched?.journal || node.venue || (node.type === 'reference' ? 'Foundational Literature' : 'Citing Literature'),
        publicationYear: fetched?.publicationYear || node.year || new Date().getFullYear(),
        citationCount: fetched?.citationCount !== undefined ? fetched.citationCount : node.citationCount || 0,
        status: 'TO_READ',
        priority: 'MEDIUM',
        tags: ['citation-network', node.type === 'reference' ? 'reference' : 'citation'],
        literatureReview: {
          sl: '1',
          assignedPerson: 'Lead Researcher',
          selectedPaperTitle: fetched?.title || node.title,
          paperTitle: fetched?.title || node.title,
          paperLink: fetched?.url || node.url || '',
          pdfAccessibility: 'Open Access',
          researchGap: fetched?.problemSolved || `Connected ${node.type === 'reference' ? 'foundational background' : 'derivative citation'} of "${paperTitle}".`,
          usedDataset: 'Benchmark datasets',
          summaryRepository: fetched?.githubUrl || '',
          remarks: `Added from Interactive Citation Network (${node.type === 'reference' ? 'Cited Reference' : 'Citing Work'}).`,
          outcome: fetched?.keyContribution || 'Key connected literature reference.',
        },
      }

      const createRes = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paperPayload),
      })

      if (createRes.ok) {
        const created = await createRes.json()
        addToast('success', `Imported "${node.title.slice(0, 35)}..." into library!`)
        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id ? { ...n, inLibrary: true, libraryId: created.id } : n
          )
        )
        if (selectedNode?.id === node.id) {
          setSelectedNode((prev) => (prev ? { ...prev, inLibrary: true, libraryId: created.id } : null))
        }
      } else {
        const err = await createRes.json()
        addToast('error', err.error || 'Failed to save paper')
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4 rounded-xl border border-border-default overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                Interactive Citation Network &amp; Connected Papers
              </h3>
              <p className="text-xs text-text-secondary">
                Visual exploration of foundational prior works (references) and derivative literature (citations).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-bg-tertiary p-1 rounded-lg border border-border-default text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterType === 'all' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All ({nodes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('reference')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterType === 'reference' ? 'bg-emerald-600 text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              References
            </button>
            <button
              type="button"
              onClick={() => setFilterType('citation')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterType === 'citation' ? 'bg-amber-600 text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Citations
            </button>
            <button
              type="button"
              onClick={() => setFilterType('library')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterType === 'library' ? 'bg-purple-600 text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              In Library
            </button>
          </div>

          <div className="flex items-center gap-1 border border-border-default rounded-lg p-1 bg-bg-tertiary">
            <button
              type="button"
              onClick={() => handleZoom(0.15)}
              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-bg-elevated cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.15)}
              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-bg-elevated cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-bg-elevated cursor-pointer"
              title="Reset Zoom & Pan"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas & Drawer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SVG Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="lg:col-span-2 relative h-[520px] bg-bg-primary/95 rounded-xl border border-border-default overflow-hidden cursor-grab active:cursor-grabbing select-none"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-text-tertiary">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs">Mapping citation network from Semantic Scholar...</p>
            </div>
          ) : nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-text-tertiary">
              <Share2 size={32} className="opacity-30 mb-2" />
              <p className="text-sm font-medium text-text-secondary">No citation connections found</p>
              <p className="text-xs">Ensure the paper has a valid DOI or ArXiv ID to map connected literature.</p>
            </div>
          ) : (
            <>
              {/* Legend overlay */}
              <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 p-2 rounded-lg bg-bg-tertiary/80 backdrop-blur-md border border-border-default/70 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-accent">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" /> Target Paper
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> References (Prior)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Citations (Derivative)
                </span>
              </div>

              {/* Quick Search */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary/90 border border-border-default text-xs max-w-[200px]">
                <Search size={13} className="text-text-tertiary shrink-0" />
                <input
                  placeholder="Filter nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-xs text-text-primary placeholder:text-text-tertiary outline-none w-full font-mono"
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} className="text-text-tertiary hover:text-text-primary">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Interactive SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 550"
                className="w-full h-full"
              >
                <defs>
                  {/* Glowing Filter */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <marker
                    id="arrow-cites"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" opacity="0.6" />
                  </marker>
                  <marker
                    id="arrow-citedby"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" opacity="0.6" />
                  </marker>
                </defs>

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Links */}
                  {links.map((link, idx) => {
                    const sourceNode = nodeMap.get(link.source)
                    const targetNode = nodeMap.get(link.target)
                    if (!sourceNode || !targetNode) return null

                    const isHighlight =
                      selectedNode &&
                      (selectedNode.id === sourceNode.id || selectedNode.id === targetNode.id)

                    return (
                      <line
                        key={`link-${idx}`}
                        x1={sourceNode.cx}
                        y1={sourceNode.cy}
                        x2={targetNode.cx}
                        y2={targetNode.cy}
                        stroke={link.type === 'cites' ? '#10b981' : '#f59e0b'}
                        strokeWidth={isHighlight ? 2.5 : 1}
                        strokeOpacity={isHighlight ? 0.9 : 0.25}
                        strokeDasharray={link.type === 'cites' ? '4 3' : undefined}
                        markerEnd={link.type === 'cites' ? 'url(#arrow-cites)' : 'url(#arrow-citedby)'}
                      />
                    )
                  })}

                  {/* Nodes */}
                  {displayNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id
                    const isCenter = node.type === 'center'

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.cx}, ${node.cy})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer transition-transform"
                      >
                        {/* Glow ring on center or selected */}
                        {(isCenter || isSelected) && (
                          <circle
                            r={node.radius + 8}
                            fill="none"
                            stroke={node.color}
                            strokeWidth={2}
                            strokeOpacity={0.6}
                            strokeDasharray={isSelected ? '3 3' : undefined}
                            className={isCenter ? 'animate-pulse' : ''}
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r={node.radius}
                          fill={node.color}
                          filter={isCenter ? 'url(#glow)' : undefined}
                          opacity={isSelected ? 1 : 0.9}
                          style={{ stroke: 'var(--bg-secondary)' }}
                          strokeWidth={isSelected ? 2 : 1}
                        />

                        {/* In-library badge dot */}
                        {node.inLibrary && !isCenter && (
                          <circle
                            cx={node.radius * 0.7}
                            cy={-node.radius * 0.7}
                            r={4.5}
                            fill="#a855f7"
                            style={{ stroke: 'var(--bg-secondary)' }}
                            strokeWidth={1}
                          />
                        )}

                        {/* Node Label */}
                        <text
                          y={node.radius + 12}
                          textAnchor="middle"
                          style={{
                            fill: isSelected
                              ? 'var(--text-primary)'
                              : 'var(--text-tertiary)',
                          }}
                          fontSize={isCenter ? 11 : 9}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          className="pointer-events-none font-sans"
                        >
                          {node.title.length > 20
                            ? node.title.slice(0, 18) + '…'
                            : node.title}
                        </text>
                      </g>
                    )
                  })}
                </g>
              </svg>
            </>
          )}
        </div>

        {/* Selected Paper Details Drawer */}
        <div className="h-[520px] rounded-xl bg-bg-tertiary border border-border-default p-4 flex flex-col justify-between overflow-y-auto space-y-3">
          {selectedNode ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase tracking-wider ${
                      selectedNode.type === 'center'
                        ? 'bg-accent/20 text-accent border border-accent/40'
                        : selectedNode.type === 'reference'
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                    }`}
                  >
                    {selectedNode.type === 'center'
                      ? 'Target Paper'
                      : selectedNode.type === 'reference'
                      ? 'Foundational Reference'
                      : 'Derivative Citation'}
                  </span>

                  {selectedNode.inLibrary && (
                    <span className="text-[11px] font-mono text-purple-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> In Library
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-text-primary leading-snug">
                    {selectedNode.title}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    {selectedNode.authors}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default/60 text-xs">
                  <div className="p-2 rounded bg-bg-primary border border-border-default/40">
                    <span className="text-[10px] text-text-tertiary block font-mono">Year</span>
                    <span className="font-semibold text-text-primary">
                      {selectedNode.year || 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-bg-primary border border-border-default/40">
                    <span className="text-[10px] text-text-tertiary block font-mono">Citations</span>
                    <span className="font-mono font-bold text-accent">
                      {selectedNode.citationCount ? selectedNode.citationCount.toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

                {selectedNode.venue && (
                  <div className="text-xs text-text-secondary">
                    <span className="text-text-tertiary">Venue: </span>
                    <span className="font-medium text-text-primary">{selectedNode.venue}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-border-default">
                {selectedNode.libraryId && (
                  <Link href={`/papers/${selectedNode.libraryId}`}>
                    <Button variant="primary" size="sm" className="w-full" icon={<BookOpen size={13} />}>
                      View in ResearchTrack
                    </Button>
                  </Link>
                )}

                {!selectedNode.inLibrary && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleImportNode(selectedNode)}
                    loading={importingId === selectedNode.id}
                    icon={<Plus size={13} />}
                  >
                    Import to Library &amp; Matrix
                  </Button>
                )}

                {selectedNode.url && (
                  <a
                    href={selectedNode.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-primary hover:bg-bg-elevated text-text-secondary hover:text-accent border border-border-default transition-colors"
                  >
                    <ExternalLink size={13} /> View on Semantic Scholar
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-tertiary">
              <Layers size={28} className="opacity-40 mb-2" />
              <p className="text-xs font-medium">Click on any node to view paper details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
