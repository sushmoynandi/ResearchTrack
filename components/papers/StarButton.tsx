'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

export interface StarButtonProps {
  paperId: string
  initialFavorite?: boolean
  isFavorite?: boolean
  onToggle?: (isFavorite: boolean) => void
}

export function StarButton({
  paperId,
  initialFavorite,
  isFavorite: isFavProp,
  onToggle,
}: StarButtonProps) {
  const [favorite, setFavorite] = useState(
    initialFavorite !== undefined ? initialFavorite : Boolean(isFavProp)
  )
  const [isAnimating, setIsAnimating] = useState(false)

  const toggle = async () => {
    const newValue = !favorite
    setFavorite(newValue)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    try {
      await fetch(`/api/papers/${paperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newValue }),
      })
      onToggle?.(newValue)
    } catch {
      setFavorite(!newValue)
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      className={`
        p-1.5 rounded-lg transition-all duration-200 cursor-pointer
        ${favorite
          ? 'text-warning hover:text-warning/80'
          : 'text-text-tertiary hover:text-warning/60'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
      `}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        size={18}
        fill={favorite ? 'currentColor' : 'none'}
        strokeWidth={favorite ? 0 : 2}
      />
    </button>
  )
}
