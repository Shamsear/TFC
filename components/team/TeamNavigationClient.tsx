"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import Image from "next/image"

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

  // Different navigation based on season participation
  const activeSeasonNavigation = [
    { name: "Dashboard", href: "/team", icon: "🏠" },
    { name: "Squad", href: "/team/squad", icon: "👥" },
    { name: "Matches", href: "/team/matches", icon: "⚽" },
    { name: "Tournaments", href: "/team/tournaments", icon: "🏆" },
    { name: "Finances", href: "/team/finances", icon: "💰" },
    { name: "Profile", href: "/team/profile", icon: "⚙️" },
  ]

  const inactiveSeasonNavigation = [
    { name: "Status", href: "/team/not-in-season", icon: "📊" },
    { name: "Profile", href: "/team/profile", icon: "⚙️" },
  ]

  const navigation = isInActiveSeason ? activeSeasonNavigation : inactiveSeasonNavigation

  const isActive = (href: string) => {
    if (href === "/team") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Team Info */}
          <div className="flex items-center gap-4">
            <Link href="/team" className="flex items-center gap-3">
              {team?.logoUrl && (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5">
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <div className="text-white font-bold text-lg">{team?.name || "Team"}</div>
                {activeSeason && (
                  <div className="text-xs text-gray-400">{activeSeason.name}</div>
                )}
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-[#E8A800] text-[#0a0a0a]"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:block relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              <div className="text-right">
                <div className="text-sm font-medium text-white">{user.name || "Team Manager"}</div>
                <div className="text-xs text-gray-400">{team?.name}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#E8A800] flex items-center justify-center text-[#0a0a0a] font-bold">
                {user.name?.charAt(0) || "T"}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-2">
                <div className="px-4 py-2 border-b border-white/10">
                  <div className="text-sm text-white font-medium">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-white"
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0a0a0a]">
          <div className="px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-[#E8A800] text-[#0a0a0a]"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/10">
              <div className="px-4 py-2">
                <div className="text-sm text-white font-medium">{user.name}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
