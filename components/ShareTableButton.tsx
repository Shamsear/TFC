'use client'

import { useRef, useState } from 'react'
import { captureTableAsPng, shareOrDownloadPng } from '@/lib/share-table'

interface ShareTableButtonProps {
  /** The element to capture. Pass a render function that receives the ref. */
  children: (ref: React.RefObject<HTMLDivElement>) => React.ReactNode
  /** Filename for the PNG, e.g. "league-table.png" */
  filename: string
  /** Title for native share sheet */
  shareTitle?: string
  /** Label shown on the button */
  label?: string
  /** Extra classes for the trigger button */
  className?: string
}

export default function ShareTableButton({
  children,
  filename,
  shareTitle,
  label = 'Share Table',
  className = '',
}: ShareTableButtonProps) {
  const hiddenRef = useRef<HTMLDivElement>(null!)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleShare = async () => {
    if (!hiddenRef.current || loading) return
    setLoading(true)
    try {
      const dataUrl = await captureTableAsPng(hiddenRef.current)
      await shareOrDownloadPng(dataUrl, filename, shareTitle)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleShare}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${className}`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating…
          </>
        ) : done ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Done!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {label}
          </>
        )}
      </button>

      {/* Off-screen hidden capture area */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '1200px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div ref={hiddenRef}>
          {children(hiddenRef)}
        </div>
      </div>
    </>
  )
}
