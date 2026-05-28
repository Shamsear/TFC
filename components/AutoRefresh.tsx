'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AutoRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Don't show the button on paths that don't need it
  useEffect(() => {
    if (pathname?.startsWith('/auth') || pathname === '/') {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [pathname])

  // Auto-refresh when the app comes back to foreground
  // Also poll every 30 seconds while the app is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', () => router.refresh())
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, 30000)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', () => router.refresh())
      clearInterval(interval)
    }
  }, [router])

  if (!isVisible) return null;

  return (
    <button 
      onClick={() => {
        setIsRefreshing(true)
        router.refresh()
        setTimeout(() => setIsRefreshing(false), 1000)
      }}
      className="fixed bottom-8 right-6 p-3.5 bg-[#E8A800] text-[#0a0a0a] rounded-full shadow-[0_4px_14px_0_rgba(232,168,0,0.39)] hover:bg-[#FFC93A] hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-[#FFC93A]/30"
      aria-label="Refresh Data"
      title="Refresh Data"
    >
      <svg 
        className={`w-6 h-6 ${isRefreshing ? 'animate-[spin_1s_ease-in-out_infinite]' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  )
}
