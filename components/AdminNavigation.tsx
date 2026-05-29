'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()

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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href={isSuperAdmin ? "/super-admin" : "/sub-admin"} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
              <div className="text-xs text-[#7A7367] font-medium">
                {isSuperAdmin ? "Super Admin" : "Sub Admin"}
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
                  isActive(item.href) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
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
                  <svg className="w-4 h-4 opacity-70 animate-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 sm:left-0 mt-2 w-48 bg-[#161616]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 hidden group-hover:block transition-all z-50">
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

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all hover:scale-105 ml-2"
            >
              Sign Out
            </button>
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
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/super-admin"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/super-admin/teams"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/teams") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Teams
                  </Link>
                  <Link
                    href="/super-admin/team-managers"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/team-managers") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Managers
                  </Link>
                  <Link
                    href="/super-admin/players"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/players") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Players
                  </Link>
                  <Link
                    href="/super-admin/seasons"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/seasons") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Seasons
                  </Link>
                  <Link
                    href="/super-admin/sub-admins"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/sub-admins") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sub Admins
                  </Link>
                  <Link
                    href="/super-admin/password-requests"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/password-requests") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Passwords
                  </Link>
                  <Link
                    href="/super-admin/audit-logs"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/audit-logs") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Audit Logs
                  </Link>
                  <Link
                    href="/super-admin/notifications"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/super-admin/notifications") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Notifications
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sub-admin"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/sub-admin") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {activeSeasonId && (
                    <>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/all-teams`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/all-teams`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Teams
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/all-players`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/all-players`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Players
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/auction`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/auction`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Auction
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/transfers`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/transfers`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Transfers
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/release-windows`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/release-windows`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Release Windows
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/tournaments`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/tournaments`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Tournaments
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/calendar`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/calendar`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Calendar
                      </Link>
                      <Link
                        href={`/sub-admin/${activeSeasonId}/tools`}
                        className={`text-sm font-bold transition-colors ${
                          isActive(`/sub-admin/${activeSeasonId}/tools`) ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Tools
                      </Link>
                    </>
                  )}
                  <Link
                    href="/sub-admin/import"
                    className={`text-sm font-bold transition-colors ${
                      isActive("/sub-admin/import") ? "text-[#F5F0E8]" : "text-[#7A7367] hover:text-[#F5F0E8]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Import
                  </Link>
                </>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold text-center transition-all"
              >
                Sign Out
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
