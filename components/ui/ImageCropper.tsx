'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react'

/** Side of the square preview window, in CSS pixels. */
const FRAME = 288
/** Side of the picture that actually gets saved. */
const OUTPUT = 256
const MAX_ZOOM = 4

interface ImageCropperProps {
  /** Data URL of the picture they picked. Mount this component with a `key`
   *  of the same value so each new picture starts from a fresh frame. */
  src: string
  onCancel: () => void
  /** Receives the cropped square as a JPEG data URL. */
  onCropped: (dataUrl: string) => void
  saving?: boolean
  /** Show the frame as a circle (purely cosmetic — the crop is always square). */
  round?: boolean
}

/**
 * Lets someone position and size their own crop frame instead of taking a
 * blind centre crop: drag the picture to move it, use the slider to zoom.
 * Whatever fills the square is what gets saved.
 */
export function ImageCropper({
  src,
  onCancel,
  onCropped,
  saving = false,
  round = false,
}: ImageCropperProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Scale that makes the picture just cover the frame at zoom = 1
  const baseScale = natural ? FRAME / Math.min(natural.w, natural.h) : 1
  const scale = baseScale * zoom
  const displayW = natural ? natural.w * scale : 0
  const displayH = natural ? natural.h * scale : 0

  /** Never let the picture pull away from an edge of the frame. */
  const clamp = useCallback(
    (value: number, displaySide: number) => Math.min(0, Math.max(FRAME - displaySide, value)),
    []
  )

  const centre = useCallback((w: number, h: number, z: number) => {
    const s = (FRAME / Math.min(w, h)) * z
    return { x: (FRAME - w * s) / 2, y: (FRAME - h * s) / 2 }
  }, [])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setOffset(centre(img.naturalWidth, img.naturalHeight, 1))
  }

  const handleZoom = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next))
    if (!natural) return setZoom(z)

    // Keep whatever is in the middle of the frame in the middle
    const oldScale = baseScale * zoom
    const newScale = baseScale * z
    const ratio = newScale / oldScale
    const cx = FRAME / 2
    setZoom(z)
    setOffset({
      x: clamp(cx - (cx - offset.x) * ratio, natural.w * newScale),
      y: clamp(cx - (cx - offset.y) * ratio, natural.h * newScale),
    })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !natural) return
    const { x, y, ox, oy } = dragStart.current
    setOffset({
      x: clamp(ox + (e.clientX - x), displayW),
      y: clamp(oy + (e.clientY - y), displayH),
    })
  }

  const endDrag = () => {
    dragStart.current = null
  }

  const reset = () => {
    if (!natural) return
    setZoom(1)
    setOffset(centre(natural.w, natural.h, 1))
  }

  const cropAndSave = () => {
    const img = imageRef.current
    if (!img || !natural) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Translate the on-screen frame back into the picture's own pixels
    const sourceSide = FRAME / scale
    ctx.drawImage(
      img,
      -offset.x / scale,
      -offset.y / scale,
      sourceSide,
      sourceSide,
      0,
      0,
      OUTPUT,
      OUTPUT
    )
    onCropped(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <Modal
      isOpen
      onClose={() => (saving ? undefined : onCancel())}
      size="sm"
      title="Position your photo"
      description="Drag the picture to move it and zoom until the frame holds what you want."
    >
      <div className="space-y-5">
        {/* Frame */}
        <div className="flex justify-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ width: FRAME, height: FRAME }}
            className={`relative overflow-hidden bg-bg-tertiary border-2 border-accent/50 select-none touch-none ${
              round ? 'rounded-full' : 'rounded-2xl'
            } ${natural ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={src}
              alt="Your new profile photo"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: displayW || undefined,
                height: displayH || undefined,
                maxWidth: 'none',
                visibility: natural ? 'visible' : 'hidden',
              }}
            />

            {/* Rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
            </div>
          </div>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3">
          <ZoomOut size={15} className="text-text-tertiary shrink-0" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 h-1.5 rounded-full accent-accent cursor-pointer"
          />
          <ZoomIn size={15} className="text-text-tertiary shrink-0" />
          <button
            type="button"
            onClick={reset}
            title="Reset"
            aria-label="Reset the frame"
            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={cropAndSave}
            loading={saving}
            disabled={!natural}
            icon={<Check size={15} />}
          >
            Save Photo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
