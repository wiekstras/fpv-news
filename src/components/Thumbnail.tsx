'use client'

import { useEffect, useRef, useState } from 'react'

// Hotlinked preview image; falls back to a labelled placeholder when missing or blocked.
export function Thumbnail({ src, label, className }: { src?: string | null; label: string; className: string }) {
  const [failed, setFailed] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  // The image may already have failed before React hydrated and attached onError.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true)
  }, [])
  if (src && !failed) {
    return (
      <img
        ref={img}
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} bg-surface object-cover`}
      />
    )
  }
  return (
    <div className={`${className} flex items-center justify-center border border-border bg-surface`}>
      <span className="osd text-accent">{label}</span>
    </div>
  )
}
