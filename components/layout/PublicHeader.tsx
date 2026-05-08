'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#E8A800]/20">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-xl font-black bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                Turf Cats
              </div>
              <div className="text-xs text-[#7A7367] font-medium">eFootball League</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/seasons"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Seasons
            </Link>
            <Link
              href="/teams"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Teams
            </Link>
            <Link
              href="/players"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Players
            </Link>
            <Link
              href="/auctions"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Auctions
            </Link>
            <Link
              href="/calendar"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Calendar
            </Link>
            <Link
              href="/tournaments"
              className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
            >
              Tournaments
            </Link>
            <Link
              href="/auth/signin"
              className="px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all hover:scale-105"
            >
              Sign In
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-4">
              <Link
                href="/seasons"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Seasons
              </Link>
              <Link
                href="/teams"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Teams
              </Link>
              <Link
                href="/players"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Players
              </Link>
              <Link
                href="/auctions"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Auctions
              </Link>
              <Link
                href="/calendar"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Calendar
              </Link>
              <Link
                href="/tournaments"
                className="text-sm font-bold text-[#7A7367] hover:text-[#F5F0E8] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tournaments
              </Link>
              <Link
                href="/auth/signin"
                className="px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold text-center transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
