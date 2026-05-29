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
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/team/notifications', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (e) {
      console.error("Failed to fetch unread notification count:", e)
    }
  }

  // Close user menu when clicking outside and poll notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    
    // Fetch count initially
    fetchUnreadCount()
    
    // Listen for custom mark-as-read events from the inbox page
    window.addEventListener('notificationsUpdated', fetchUnreadCount)
    
    // Polling every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener('notificationsUpdated', fetchUnreadCount)
      clearInterval(interval)
    }
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
    { name: "Retentions", href: "/team/retentions" },
    { name: "Achievements", href: "/team/achievements" },
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
      { name: "Retentions", href: "/team/retentions" },
      { name: "Achievements", href: "/team/achievements" },
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <Link href="/team" className="flex items-center gap-3 hover:opacity-90 transition-opacity relative z-10 group">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ring-white/5 bg-black/40 p-1 flex-shrink-0 group-hover:ring-[#E8A800]/30 transition-all">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                fill
                className="object-contain p-1 rounded-xl"
                priority
              />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black bg-gradient-to-r from-[#FFC93A] via-[#FFD066] to-[#E8A800] bg-clip-text text-transparent group-hover:brightness-110 transition-all leading-tight">
                Turf Cats
              </div>
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mt-0.5 font-mono">
                Team Manager
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 relative z-10">
            {primaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-xs font-black uppercase tracking-wider transition-colors relative py-1.5 ${
                  isActive(item.href)
                    ? "text-[#FFB347] drop-shadow-[0_0_8px_rgba(255,179,71,0.15)]"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E8A800] to-[#FFB347] rounded-full shadow-[0_0_10px_rgba(232,168,0,0.5)]" />
                )}
              </Link>
            ))}

            {moreNavigation.length > 0 && (
              <div className="relative group py-2">
                <button
                  className={`text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
                    moreNavigation.some((item) => isActive(item.href))
                      ? "text-[#FFB347] drop-shadow-[0_0_8px_rgba(255,179,71,0.15)]"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  More
                  <svg className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2.5 w-52 bg-[#0e0e0f]/95 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl py-2 hidden group-hover:block transition-all z-50 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                  {moreNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
                        isActive(item.href)
                          ? "text-[#E8A800] bg-white/[0.03]"
                          : "text-gray-500 hover:text-white hover:bg-white/[0.01]"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Right Side Controls */}
          <div className="hidden md:flex items-center gap-4 relative z-10">
            {/* Notification Bell */}
            <Link
              href="/team/notifications"
              className="relative p-2.5 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-gray-500 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Notification Inbox"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E8A800] text-[#0a0a0a] text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(232,168,0,0.5)]">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Team Info with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer shadow-md select-none"
              >
                {team && (
                  <div className="ring-2 ring-white/5 rounded-lg p-0.5 flex-shrink-0 bg-black/40">
                    <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                  </div>
                )}
                <div className="text-right">
                  <div className="text-xs font-black text-white truncate max-w-[120px]">{team?.name || "Team"}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{user.name || "Manager"}</div>
                </div>
                <svg 
                  className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-[#0e0e0f]/95 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl py-2 overflow-hidden z-50 animate-[fadeIn_0.2s_ease-out]">
                  <div className="px-4 py-3.5 border-b border-white/5 bg-white/[0.01]">
                    <div className="text-sm text-white font-black mb-0.5 leading-tight">{user.name || "Team Manager"}</div>
                    <div className="text-xs text-gray-500 mb-1 truncate font-mono">{user.email}</div>
                    <div className="text-[10px] text-[#E8A800] bg-[#E8A800]/10 border border-[#E8A800]/25 px-2 py-0.5 rounded font-black uppercase tracking-wider w-fit">{team?.name}</div>
                  </div>
                  <Link
                    href="/team/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full text-left block px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-white/[0.02] hover:text-white border-b border-white/5 transition-all flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </Link>
                  {team && (
                    <Link
                      href="/team/achievements"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left block px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-white/[0.02] hover:text-white border-b border-white/5 transition-all flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                      </svg>
                      Achievements Showcase
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-red-400 hover:bg-white/[0.02] hover:text-red-300 transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
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
                      ? "text-[#FFB347]"
                      : "text-gray-500 hover:text-white"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Team Info */}
              <div className="pt-4 border-t border-white/5 mt-2">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 mb-3">
                  {team && (
                    <div className="ring-2 ring-white/5 rounded-lg p-0.5 bg-black/40">
                      <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black text-white">{team?.name || "Team"}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{user.name || "Manager"}</div>
                  </div>
                </div>

                {team && (
                  <Link
                    href="/team/achievements"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-2 border border-[#E8A800]/20 rounded-xl bg-[#E8A800]/5"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                    </svg>
                    Achievements Showcase
                  </Link>
                )}
                <Link
                  href="/team/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-2.5 text-xs font-black uppercase tracking-wider text-center text-gray-500 hover:text-white transition-colors mb-4 border border-white/5 rounded-xl bg-white/[0.01]"
                >
                  View Profile
                </Link>
                
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all cursor-pointer shadow-[0_0_20px_rgba(232,168,0,0.3)]"
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
