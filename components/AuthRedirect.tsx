'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Client-side authentication redirect component
 * Provides additional layer of protection for PWA users
 * Redirects authenticated users from public pages to their dashboard
 */
export function AuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect from root path
    if (pathname !== '/') return
    
    // Wait for session to load
    if (status === 'loading') return

    // Redirect authenticated users to their dashboard
    if (session?.user) {
      const role = session.user.role
      
      if (role === 'SUPER_ADMIN') {
        router.replace('/super-admin')
      } else if (role === 'SUB_ADMIN') {
        router.replace('/sub-admin')
      } else if (role === 'TEAM_MANAGER') {
        router.replace('/team')
      }
    }
  }, [session, status, pathname, router])

  return null
}
