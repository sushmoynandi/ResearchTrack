import React from 'react'

type SkeletonVariant = 'text' | 'circle' | 'card' | 'rect'

interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  className?: string
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const baseClass = 'skeleton'

  const variantStyles: Record<SkeletonVariant, React.CSSProperties> = {
    text: {
      width: width || '100%',
      height: height || '1rem',
      borderRadius: '0.25rem',
    },
    circle: {
      width: width || '2.5rem',
      height: height || width || '2.5rem',
      borderRadius: '50%',
    },
    card: {
      width: width || '100%',
      height: height || '8rem',
      borderRadius: '0.75rem',
    },
    rect: {
      width: width || '100%',
      height: height || '2.5rem',
      borderRadius: '0.5rem',
    },
  }

  return (
    <div
      className={`${baseClass} ${className}`}
      style={variantStyles[variant]}
      aria-hidden
    />
  )
}
