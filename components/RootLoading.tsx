'use client'

import { useEffect, useState } from 'react'

/**
 * Root loading overlay
 * Shows immediately on initial page load to prevent flash of unstyled content
 * Hides once React hydrates and content is ready
 */
export function RootLoading() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Remove the loading class from html element
      document.documentElement.classList.remove('loading')
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999
      }}
    >
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#E8A800] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm font-semibold">Loading...</p>
      </div>
    </div>
  )
}
