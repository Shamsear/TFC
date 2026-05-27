"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import TeamLogo from "./TeamLogo"

interface TeamNavigationClientProps {
  user: {
    name?: string | null
    email?: string | null
  }
  team: {
    id: string
    name: string
    logoUrl: string
  } | null
  activeSeason: {
    id: string
    name: string
  } | null
  isInActiveSeason: boolean
}

export default function TeamNavigationClient({ user, team, activeSeason, isInActiveSeason }: TeamNavigationClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Different navigation based on season participation
  const activeSeasonNavigation = [
    { name: "Dashboard", href: "/team" },
    { name: "Squad", href: "/team/squad" },
    { name: "Transfers", href: "/team/transfers" },
    { name: "Auction", href: "/team/auction" },
    { name: "Players", href: "/team/players" },
    { name: "Starred", href: "/team/starred" },
    { name: "Teams", href: "/team/teams" },
    { name: "Matches", href: "/team/matches" },
    { name: "Tournaments", href: "/team/tournaments" },
    { name: "Calendar", href: "/team/calendar" },
    { name: "Finances", href: "/team/finances" },
  ]

  const inactiveSeasonNavigation = [
    { name: "Status", href: "/team/not-in-season" },
    { name: "Profile", href: "/team/profile" },
  ]

  // Setup desktop vs mobile navigation
  const primaryNavigation = isInActiveSeason 
    ? [
        { name: "Dashboard", href: "/team" },
        { name: "Squad", href: "/team/squad" },
        { name: "Transfers", href: "/team/transfers" },
        { name: "Auction", href: "/team/auction" },
        { name: "Players", href: "/team/players" },
        { name: "Matches", href: "/team/matches" },
      ]
    : inactiveSeasonNavigation

  const moreNavigation = isInActiveSeason
    ? [
        { name: "Starred", href: "/team/starred" },
        { name: "Teams", href: "/team/teams" },
        { name: "Tournaments", href: "/team/tournaments" },
        { name: "Calendar", href: "/team/calendar" },
        { name: "Finances", href: "/team/finances" },
      ]
    : []

  const navigation = isInActiveSeason ? activeSeasonNavigation : inactiveSeasonNavigation

  const isActive = (href: string) => {
    if (href === "/team") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <Link href="/team" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#E8A800]/20 bg-white/5">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="text-xl font-black bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                Turf Cats
              </div>
              <div className="text-xs text-[#7A7367] font-medium">
                Team Manager
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {primaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-bold transition-colors ${
                  isActive(item.href)
                    ? "text-[#F5F0E8]"
                    : "text-[#7A7367] hover:text-[#F5F0E8]"
                }`}
              >
                {item.name}
              </Link>
            ))}

            {moreNavigation.length > 0 && (
              <div className="relative group py-2">
                <button
                  className={`text-sm font-bold transition-colors flex items-center gap-1 ${
                    moreNavigation.some((item) => isActive(item.href))
                      ? "text-[#F5F0E8]"
                      : "text-[#7A7367] hover:text-[#F5F0E8]"
                  }`}
                >
                  More
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-[#161616]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 hidden group-hover:block transition-all z-50">
                  {moreNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block px-4 py-2 text-sm font-bold transition-colors ${
                        isActive(item.href)
                          ? "text-[#E8A800] bg-white/5"
                          : "text-[#7A7367] hover:text-[#F5F0E8] hover:bg-white/5"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Team Info with Dropdown - Right Side */}
          <div className="hidden md:block relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {team && (
                <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
              )}
              <div className="text-right">
                <div className="text-sm font-bold text-white">{team?.name || "Team"}</div>
                <div className="text-xs text-[#7A7367]">{user.name || "Manager"}</div>
              </div>
              <svg 
                className={`w-4 h-4 text-[#7A7367] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-sm text-white font-bold mb-1">{user.name || "Team Manager"}</div>
                  <div className="text-xs text-[#7A7367] mb-1">{user.email}</div>
                  <div className="text-xs text-[#E8A800] font-medium">{team?.name}</div>
                </div>
                <Link
                  href="/team/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full text-left block px-4 py-3 text-sm text-[#7A7367] hover:bg-white/5 hover:text-white border-b border-white/10 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-3 text-sm text-[#7A7367] hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
 
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
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-bold transition-colors ${
                    isActive(item.href)
                      ? "text-[#F5F0E8]"
                      : "text-[#7A7367] hover:text-[#F5F0E8]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Team Info */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 mb-2">
                  {team && (
                    <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">{team?.name || "Team"}</div>
                    <div className="text-xs text-[#7A7367]">{user.name || "Manager"}</div>
                  </div>
                </div>

                <Link
                  href="/team/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-2 text-sm text-center font-bold text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-4"
                >
                  View Profile
                </Link>
                
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold text-center transition-all"
                >
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
