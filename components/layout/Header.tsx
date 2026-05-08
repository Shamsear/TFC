'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  
  // Don't show header on auth pages
  if (pathname?.startsWith('/auth')) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-black text-white">Turf Cats</div>
              <div className="text-xs text-gray-400">Tournament Platform</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            {pathname?.includes('/sub-admin') && (
              <>
                <Link
                  href="/sub-admin"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </>
            )}
            {pathname?.includes('/super-admin') && (
              <>
                <Link
                  href="/super-admin"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/super-admin/teams"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Teams
                </Link>
                <Link
                  href="/super-admin/seasons"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Seasons
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
