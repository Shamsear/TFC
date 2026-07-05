import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PushToggle from "@/components/notifications/PushToggle"

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Page Title */}
      <div className="mb-8 lg:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Super Admin Dashboard
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Manage teams, seasons, sub-admins, and platform data
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="/super-admin/teams"
          className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/25 transition-all duration-300 shadow-xl backdrop-blur-xl"
        >
          <div className="absolute top-[-50%] right-[-20%] w-[200px] h-[200px] bg-[#E8A800]/[0.02] rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
              <UsersIcon />
            </div>
            <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRightIcon />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mb-1 font-mono">{teamsCount}</div>
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Total Teams</div>
        </Link>

        <Link
          href="/super-admin/seasons"
          className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#FFB347]/25 transition-all duration-300 shadow-xl backdrop-blur-xl"
        >
          <div className="absolute top-[-50%] right-[-20%] w-[200px] h-[200px] bg-[#FFB347]/[0.02] rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/20 flex items-center justify-center text-[#FFB347]">
              <CalendarIcon />
            </div>
            <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRightIcon />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mb-1 font-mono">{seasonsCount}</div>
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Total Seasons</div>
        </Link>

        <div className="relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 shadow-xl backdrop-blur-xl sm:col-span-2 lg:col-span-1">
          <div className="absolute top-[-50%] right-[-20%] w-[200px] h-[200px] bg-[#FFC93A]/[0.02] rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFC93A]/10 border border-[#FFC93A]/20 flex items-center justify-center text-[#FFC93A]">
              <TrophyIcon />
            </div>
          </div>
          <div className="text-2xl font-black text-white mb-1 truncate">
            {latestSeason?.name || "No seasons"}
          </div>
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">
            {latestSeason ? `${latestSeason.seasonTeams.length} teams` : "Latest Season"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 lg:mb-12">
        <h2 className="text-2xl font-black text-white mb-4 sm:mb-6 uppercase tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link
            href="/super-admin/teams/new"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-5 hover:scale-[1.02] transition-all shadow-lg hover:shadow-[#E8A800]/20 text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                <PlusIcon />
              </div>
              <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Create Team</div>
              <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Add to global registry</div>
            </div>
          </Link>

          <Link
            href="/super-admin/seasons/new"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.02] transition-all shadow-lg hover:shadow-[#FFB347]/20 text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                <PlusIcon />
              </div>
              <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Create Season</div>
              <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Start new tournament</div>
            </div>
          </Link>

          <Link
            href="/super-admin/sub-admins/new"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.02] transition-all shadow-lg hover:shadow-[#FFC93A]/20 text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                <PlusIcon />
              </div>
              <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Create Sub-Admin</div>
              <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Add new administrator</div>
            </div>
          </Link>

          <Link
            href="/super-admin/historical-data"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 hover:scale-[1.02] transition-all shadow-lg hover:shadow-emerald-500/20 text-white flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Import History</div>
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Add past season data</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 lg:mb-12">
        {/* Recent Teams */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Recent Teams</h2>
            <Link
              href="/super-admin/teams"
              className="text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] flex items-center gap-1.5 transition-colors"
            >
              View All
              <ArrowRightIcon />
            </Link>
          </div>

          {recentTeams.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 text-center backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
                <UsersIcon />
              </div>
              <div className="text-sm text-gray-400 mb-4 uppercase font-bold tracking-wider">No teams created yet</div>
              <Link
                href="/super-admin/teams/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-xs uppercase tracking-wider cursor-pointer"
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
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-base font-black text-white">
                        {team.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-bold text-white mb-0.5 truncate">{team.name}</div>
                    <div className="text-xs text-gray-500 font-medium truncate">Manager: {team.managerName}</div>
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
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-4 sm:mb-6">Management</h2>
          <div className="space-y-3">
            <Link
              href="/super-admin/sub-admins"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                  <UsersIcon />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">Sub-Admins</div>
                  <div className="text-xs text-gray-500 font-medium">Manage administrators</div>
                </div>
              </div>
              <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              href="/super-admin/audit-logs"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#FFB347]/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/20 flex items-center justify-center text-[#FFB347]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">Audit Logs</div>
                  <div className="text-xs text-gray-500 font-medium">Track all actions</div>
                </div>
              </div>
              <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              href="/super-admin/seasons"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#FFC93A]/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFC93A]/10 border border-[#FFC93A]/20 flex items-center justify-center text-[#FFC93A]">
                  <CalendarIcon />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Seasons</div>
                  <div className="text-xs text-gray-500 font-medium">View all tournaments</div>
                </div>
              </div>
              <div className="text-[#FFC93A] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              href="/super-admin/teams"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                  <TrophyIcon />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Teams</div>
                  <div className="text-xs text-gray-500 font-medium">Global team registry</div>
                </div>
              </div>
              <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              href="/super-admin/players"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-emerald-500/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">All Players</div>
                  <div className="text-xs text-gray-500 font-medium">Global player database</div>
                </div>
              </div>
              <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              href="/super-admin/notifications"
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white mb-0.5">Notification Hub</div>
                  <div className="text-xs text-gray-500 font-medium">Broadcast & audit alerts</div>
                </div>
              </div>
              <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon />
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Push Notification Controls */}
      <div className="mt-8 lg:mt-12">
        <PushToggle />
      </div>
    </div>
  )
}
