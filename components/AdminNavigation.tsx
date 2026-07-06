'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface AdminNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  isSuperAdmin: boolean
  activeSeasonId: string | null
}

export default function AdminNavigationClient({ user, isSuperAdmin, activeSeasonId }: AdminNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut({ 
        redirect: false
      })
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      window.location.href = '/'
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isActive = (href: string) => {
    if (href === "/super-admin" || href === "/sub-admin") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const superAdminPrimary = [
    { name: "Dashboard", href: "/super-admin" },
    { name: "Teams", href: "/super-admin/teams" },
    { name: "Managers", href: "/super-admin/team-managers" },
    { name: "Players", href: "/super-admin/players" },
    { name: "Seasons", href: "/super-admin/seasons" },
  ]

  const superAdminMore = [
    { name: "Sub Admins", href: "/super-admin/sub-admins" },
    { name: "Passwords", href: "/super-admin/password-requests" },
    { name: "Audit Logs", href: "/super-admin/audit-logs" },
    { name: "Notifications", href: "/super-admin/notifications" },
    { name: "News", href: "/super-admin/news" },
  ]

  const subAdminPrimary = [
    { name: "Dashboard", href: "/sub-admin" },
    ...(activeSeasonId ? [
      { name: "Teams", href: `/sub-admin/${activeSeasonId}/all-teams` },
      { name: "Players", href: `/sub-admin/${activeSeasonId}/all-players` },
      { name: "Auction", href: `/sub-admin/${activeSeasonId}/auction` },
      { name: "Transfers", href: `/sub-admin/${activeSeasonId}/transfers` },
    ] : [])
  ]

  const subAdminMore = [
    ...(activeSeasonId ? [
      { name: "Achievements", href: `/sub-admin/${activeSeasonId}/achievements` },
      { name: "Release Windows", href: `/sub-admin/${activeSeasonId}/release-windows` },
      { name: "Tournaments", href: `/sub-admin/${activeSeasonId}/tournaments` },
      { name: "Calendar", href: `/sub-admin/${activeSeasonId}/calendar` },
      { name: "Tools", href: `/sub-admin/${activeSeasonId}/tools` },
    ] : []),
    { name: "Import", href: "/sub-admin/import" },
  ]

  const primaryNavigation = isSuperAdmin ? superAdminPrimary : subAdminPrimary
  const moreNavigation = isSuperAdmin ? superAdminMore : subAdminMore

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href={isSuperAdmin ? "/super-admin" : "/sub-admin"} className="flex items-center gap-3 hover:opacity-90 transition-opacity relative z-10 group">
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
                {isSuperAdmin ? "Super Admin" : "Sub Admin"}
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
                <div className="absolute right-0 sm:left-0 mt-2.5 w-48 bg-[#0e0e0f]/95 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl py-2 hidden group-hover:block transition-all z-50 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
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

            {/* Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer shadow-md select-none"
              >
                <div className="text-right">
                  <div className="text-xs font-black text-white truncate max-w-[120px]">{user.name || "Admin"}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{isSuperAdmin ? "Super Admin" : "Sub Admin"}</div>
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
                    <div className="text-sm text-white font-black mb-0.5 leading-tight">{user.name || "Administrator"}</div>
                    <div className="text-xs text-gray-500 mb-1 truncate font-mono">{user.email}</div>
                    <div className="text-[10px] text-[#E8A800] bg-[#E8A800]/10 border border-[#E8A800]/25 px-2 py-0.5 rounded font-black uppercase tracking-wider w-fit">
                      {isSuperAdmin ? "Super Admin" : "Sub Admin"}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
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
          </nav>

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
          <div className="md:hidden py-4 border-t border-white/5 relative z-10 animate-[fadeIn_0.2s_ease-out] max-h-[70vh] overflow-y-auto">
            <nav className="flex flex-col gap-2 px-2">
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/super-admin"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/super-admin/teams"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/teams") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Teams
                  </Link>
                  <Link
                    href="/super-admin/team-managers"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/team-managers") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Managers
                  </Link>
                  <Link
                    href="/super-admin/players"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/players") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Players
                  </Link>
                  <Link
                    href="/super-admin/seasons"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/seasons") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Seasons
                  </Link>
                  <Link
                    href="/super-admin/sub-admins"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/sub-admins") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sub Admins
                  </Link>
                  <Link
                    href="/super-admin/password-requests"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/password-requests") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Passwords
                  </Link>
                  <Link
                    href="/super-admin/audit-logs"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/audit-logs") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Audit Logs
                  </Link>
                  <Link
                    href="/super-admin/notifications"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/notifications") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Notifications
                  </Link>
                  <Link
                    href="/super-admin/news"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/super-admin/news") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    News
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sub-admin"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/sub-admin") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {activeSeasonId && (
                    <>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/all-teams`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/all-teams`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Teams
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/all-players`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/all-players`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Players
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/auction`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/auction`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Auction
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/transfers`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/transfers`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Transfers
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/achievements`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/achievements`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Achievements
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/release-windows`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/release-windows`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Release Windows
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/tournaments`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/tournaments`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Tournaments
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/calendar`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/calendar`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Calendar
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/tools`}
                        className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                          isActive(`/sub-admin/${activeSeasonId}/tools`) ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Tools
                      </Link>
                    </>
                  )}
                  <Link
                    href="/sub-admin/import"
                    className={`text-xs font-black uppercase tracking-wider transition-colors py-2 px-3 rounded-lg ${
                      isActive("/sub-admin/import") ? "text-[#FFB347] bg-white/[0.03]" : "text-gray-500 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Import
                  </Link>
                </>
              )}

              {/* Mobile Profile & Logout */}
              <div className="pt-4 border-t border-white/5 mt-2">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 mb-3">
                  <div>
                    <div className="text-xs font-black text-white">{user.name || "Administrator"}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{user.email}</div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
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
