'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Client-side authentication redirect component
 * Redirects authenticated users from public pages to their dashboard
 * This runs on the client to avoid middleware redirect issues
 */
export function AuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Only redirect from root path
    if (pathname !== '/') return
    
    // Wait for session to load
    if (status === 'loading') return

    // Prevent multiple redirects
    if (hasRedirected) return

    // Redirect authenticated users to their dashboard
    if (session?.user) {
      const role = session.user.role
      
      setHasRedirected(true)
      
      if (role === 'SUPER_ADMIN') {
        router.replace('/super-admin')
      } else if (role === 'SUB_ADMIN') {
        router.replace('/sub-admin')
      } else if (role === 'TEAM_MANAGER') {
        router.replace('/team')
      }
    }
  }, [session, status, pathname, router, hasRedirected])

  // Show nothing while redirecting
  if (status === 'loading' || (session?.user && pathname === '/')) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E8A800] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
