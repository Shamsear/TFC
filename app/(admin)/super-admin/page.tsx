import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

// Icon Components
const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function SuperAdminDashboard() {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  // Fetch overview data
  const [teamsCount, seasonsCount, latestSeason, recentTeams] = await Promise.all([
    prisma.teams.count(),
    prisma.seasons.count(),
    prisma.seasons.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        seasonTeams: {
          include: { team: true }
        }
      }
    }),
    prisma.teams.findMany({
      take: 5,
      orderBy: { createdAt: "desc" }
    })
  ])

  return (
    <div className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Super Admin Dashboard
            </span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
            Manage teams, seasons, sub-admins, and platform data
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-12">
          <Link
            href="/super-admin/teams"
            className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/[0.15] transition-all"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                <UsersIcon />
              </div>
              <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2">{teamsCount}</div>
            <div className="text-xs sm:text-sm text-gray-400 font-medium">Total Teams</div>
          </Link>

          <Link
            href="/super-admin/seasons"
            className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFB347]/10 to-[#FFC93A]/10 border border-[#FFB347]/20 p-4 sm:p-6 hover:border-[#FFB347]/40 hover:bg-[#FFB347]/[0.15] transition-all"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/20 flex items-center justify-center text-[#FFB347]">
                <CalendarIcon />
              </div>
              <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2">{seasonsCount}</div>
            <div className="text-xs sm:text-sm text-gray-400 font-medium">Total Seasons</div>
          </Link>

          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFC93A]/10 to-[#E8A800]/10 border border-[#FFC93A]/20 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#FFC93A]/10 border border-[#FFC93A]/20 flex items-center justify-center text-[#FFC93A]">
                <TrophyIcon />
              </div>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">
              {latestSeason?.name || "No seasons"}
            </div>
            <div className="text-xs sm:text-sm text-gray-400 font-medium">
              {latestSeason ? `${latestSeason.seasonTeams.length} teams` : "Latest Season"}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/super-admin/teams/new"
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#D49700] p-4 sm:p-5 lg:p-6 hover:scale-105 transition-all shadow-lg hover:shadow-[#E8A800]/50"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black/20 flex items-center justify-center">
                  <PlusIcon />
                </div>
                <div className="text-base sm:text-lg font-bold text-[#0a0a0a]">Create Team</div>
              </div>
              <div className="text-xs sm:text-sm text-[#0a0a0a]/80">Add to global registry</div>
            </Link>

            <Link
              href="/super-admin/seasons/new"
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-4 sm:p-5 lg:p-6 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFB347]/50"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black/20 flex items-center justify-center">
                  <PlusIcon />
                </div>
                <div className="text-base sm:text-lg font-bold text-[#0a0a0a]">Create Season</div>
              </div>
              <div className="text-xs sm:text-sm text-[#0a0a0a]/80">Start new tournament</div>
            </Link>

            <Link
              href="/super-admin/sub-admins/new"
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-4 sm:p-5 lg:p-6 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFC93A]/50"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black/20 flex items-center justify-center">
                  <PlusIcon />
                </div>
                <div className="text-base sm:text-lg font-bold text-[#0a0a0a]">Create Sub-Admin</div>
              </div>
              <div className="text-xs sm:text-sm text-[#0a0a0a]/80">Add new administrator</div>
            </Link>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8 lg:mb-12">
          {/* Recent Teams */}
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white">Recent Teams</h2>
              <Link
                href="/super-admin/teams"
                className="text-[#E8A800] hover:text-[#FFC93A] text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 transition-colors"
              >
                View All
                <ArrowRightIcon />
              </Link>
            </div>

            {recentTeams.length === 0 ? (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-3 sm:mb-4">
                  <UsersIcon />
                </div>
                <div className="text-sm sm:text-base text-gray-400 mb-3 sm:mb-4">No teams created yet</div>
                <Link
                  href="/super-admin/teams/new"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-xs sm:text-sm"
                >
                  <PlusIcon />
                  Create First Team
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/super-admin/teams/${team.id}`}
                    className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-base sm:text-lg font-black text-white">
                          {team.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white mb-0.5 truncate">{team.name}</div>
                      <div className="text-xs text-gray-400 truncate">Manager: {team.managerName}</div>
                    </div>
                    <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ArrowRightIcon />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Management</h2>
            <div className="space-y-3">
              <Link
                href="/super-admin/sub-admins"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                    <UsersIcon />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5">Sub-Admins</div>
                    <div className="text-xs text-gray-400">Manage administrators</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/audit-logs"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB347]/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/20 flex items-center justify-center text-[#FFB347]">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5">Audit Logs</div>
                    <div className="text-xs text-gray-400">Track all actions</div>
                  </div>
                </div>
                <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/seasons"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFC93A]/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#FFC93A]/10 border border-[#FFC93A]/20 flex items-center justify-center text-[#FFC93A]">
                    <CalendarIcon />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Seasons</div>
                    <div className="text-xs text-gray-400">View all tournaments</div>
                  </div>
                </div>
                <div className="text-[#FFC93A] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/teams"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                    <TrophyIcon />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Teams</div>
                    <div className="text-xs text-gray-400">Global team registry</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/players"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Players</div>
                    <div className="text-xs text-gray-400">Global player database</div>
                  </div>
                </div>
                <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
