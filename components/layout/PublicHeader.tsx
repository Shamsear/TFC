'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function PublicHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Seasons', href: '/seasons' },
    { name: 'Teams', href: '/teams' },
    { name: 'Players', href: '/players' },
    { name: 'Auctions', href: '/auctions' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'Tournaments', href: '/tournaments' },
  ]

  const isActive = (href: string) => {
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity group relative z-10">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ring-white/5 bg-black/40 p-1 flex-shrink-0 group-hover:ring-[#E8A800]/30 transition-all shadow-2xl">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                fill
                className="object-contain p-1 rounded-xl group-hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black bg-gradient-to-r from-[#FFC93A] via-[#FFD066] to-[#E8A800] bg-clip-text text-transparent group-hover:brightness-110 transition-all leading-tight">
                Turf Cats
              </div>
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mt-0.5 font-mono">
                eFootball League
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 relative z-10">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-xs font-black uppercase tracking-wider transition-colors relative py-1.5 ${
                  isActive(item.href)
                    ? 'text-[#FFB347] drop-shadow-[0_0_8px_rgba(255,179,71,0.15)]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E8A800] to-[#FFB347] rounded-full shadow-[0_0_10px_rgba(232,168,0,0.5)]" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-4 relative z-10">
            <Link
              href="/auth/signin"
              className="px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(232,168,0,0.25)] hover:shadow-[0_0_20px_rgba(232,168,0,0.45)]"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-white transition-colors relative z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5 relative z-10 animate-[fadeIn_0.2s_ease-out]">
            <nav className="flex flex-col gap-3.5 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-xs font-black uppercase tracking-wider transition-colors py-1.5 ${
                    isActive(item.href)
                      ? 'text-[#FFB347]'
                      : 'text-gray-500 hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-white/5 mt-2">
                <Link
                  href="/auth/signin"
                  className="block w-full px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all cursor-pointer shadow-[0_0_20px_rgba(232,168,0,0.3)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
