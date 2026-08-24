'use client'

import React, { useState } from 'react'
import {
  Highlighter,
  MessageSquare,
  Sparkles,
  Check,
  X,
  Send,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { HighlightColor, HighlightCategory } from '@/lib/types'

interface HighlightFloatingToolbarProps {
  selectedText: string
  pageNumber?: number
  position?: { x: number; y: number }
  onHighlight: (data: {
    text: string
    color: HighlightColor
    category: HighlightCategory
    pageNumber: number
    initialComment?: string
  }) => Promise<void>
  onClose: () => void
}

const CATEGORY_OPTIONS: {
  category: HighlightCategory
  color: HighlightColor
  label: string
  icon: any
  badgeClass: string
  bgHover: string
}[] = [
  {
    category: 'METHODOLOGY',
    color: 'YELLOW',
    label: 'Methodology / Architecture',
    icon: Cpu,
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    bgHover: 'hover:bg-yellow-500/30',
  },
  {
    category: 'CONTRIBUTION',
    color: 'GREEN',
    label: 'Key Novelty / Contribution',
    icon: Sparkles,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgHover: 'hover:bg-emerald-500/30',
  },
  {
    category: 'LIMITATION',
    color: 'ROSE',
    label: 'Threat to Validity / Limitation',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    bgHover: 'hover:bg-rose-500/30',
  },
  {
    category: 'FEEDBACK',
    color: 'PURPLE',
    label: 'Advisor Marginal Feedback',
    icon: MessageSquare,
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    bgHover: 'hover:bg-purple-500/30',
  },
]

export function HighlightFloatingToolbar({
  selectedText,
  pageNumber = 1,
  position,
  onHighlight,
  onClose,
}: HighlightFloatingToolbarProps) {
  const [selectedCategory, setSelectedCategory] = useState<HighlightCategory>('METHODOLOGY')
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('YELLOW')
  const [comment, setComment] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSelectOption = (cat: HighlightCategory, col: HighlightColor) => {
    setSelectedCategory(cat)
    setSelectedColor(col)
  }

  const handleSave = async () => {
    if (!selectedText.trim()) return
    setSaving(true)
    try {
      await onHighlight({
        text: selectedText.trim(),
        color: selectedColor,
        category: selectedCategory,
        pageNumber,
        initialComment: comment.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 glass-card p-3 shadow-2xl border border-accent/40 rounded-2xl max-w-sm w-[340px] space-y-3"
      style={{
        left: position ? Math.min(Math.max(position.x, 20), window.innerWidth - 360) : '50%',
        top: position ? Math.min(position.y + 15, window.innerHeight - 260) : '20%',
        transform: position ? 'none' : 'translateX(-50%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-default pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          <Highlighter size={14} className="text-accent" />
          <span>Inline PDF Highlight</span>
          <span className="text-[10px] text-text-tertiary font-mono">p.{pageNumber}</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary p-0.5 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Selected snippet preview */}
      <div className="p-2 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-secondary line-clamp-2 italic font-serif">
        &ldquo;{selectedText}&rdquo;
      </div>

      {/* 4 Category / Color Selectors */}
      <div className="grid grid-cols-2 gap-1.5">
        {CATEGORY_OPTIONS.map((opt) => {
          const isSelected = selectedCategory === opt.category
          const Icon = opt.icon
          return (
            <button
              key={opt.category}
              type="button"
              onClick={() => handleSelectOption(opt.category, opt.color)}
              className={`flex items-center gap-1.5 p-1.5 rounded-xl text-[11px] font-medium border text-left transition-all ${
                isSelected
                  ? `${opt.badgeClass} ring-1 ring-accent font-bold scale-[1.02]`
                  : 'bg-bg-secondary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
              }`}
            >
              <Icon size={12} className="shrink-0" />
              <span className="truncate">{opt.label.split('/')[0].trim()}</span>
              {isSelected && <Check size={11} className="ml-auto shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Toggle Comment Field */}
      {!showCommentInput ? (
        <button
          type="button"
          onClick={() => setShowCommentInput(true)}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline w-full justify-center py-0.5"
        >
          <MessageSquare size={13} />
          <span>+ Add marginal note or question</span>
        </button>
      ) : (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Type your marginal comment, question, or advisor note..."
            rows={2}
            className="w-full text-xs p-2 rounded-xl bg-bg-primary border border-border-default focus:border-accent focus:outline-none text-text-primary resize-none placeholder:text-text-tertiary"
            autoFocus
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button size="xs" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="xs"
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          icon={saving ? undefined : <Check size={13} />}
        >
          {saving ? 'Saving...' : 'Apply Highlight'}
        </Button>
      </div>
    </div>
  )
}
