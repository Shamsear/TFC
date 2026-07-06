'use client'

import { useEffect, useState } from 'react'
import PageLoader from './ui/PageLoader'

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
    }, 150)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return <PageLoader message="Initializing App" fullScreen={true} />
}
