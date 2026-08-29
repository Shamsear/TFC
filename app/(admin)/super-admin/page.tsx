import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PushToggle from "@/components/notifications/PushToggle"
import { resolveTeamManagerNames } from '@/lib/resolve-manager'
import { getActiveSeasonId } from '@/lib/get-active-season'

// Icon Components
const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const TrophyBigIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const CalendarBigIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
)

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const TerminalIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const PlayersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

export default async function SuperAdminDashboard() {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  // Fetch overview data
  const [teamsCount, seasonsCount, activeSeasonId, recentTeamsRaw] = await Promise.all([
    prisma.teams.count(),
    prisma.seasons.count(),
    getActiveSeasonId(),
    prisma.teams.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        managerLinks: {
          where: { isCurrent: true },
          include: { manager: true },
          take: 1
        }
      }
    })
  ])

  const latestSeason = activeSeasonId ? await prisma.seasons.findUnique({
    where: { id: activeSeasonId },
    include: { seasonTeams: { include: { team: true } } }
  }) : null

  // Resolve current manager for each recent team
  const mgrMap = await resolveTeamManagerNames(recentTeamsRaw.map(t => t.id))
  const recentTeams = recentTeamsRaw.map(team => ({
    ...team,
    managerName: mgrMap.get(team.id) || team.managerLinks[0]?.manager?.name || team.managerName
  }))

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
              <CalendarBigIcon />
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
              <TrophyBigIcon />
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Actions & Utilities (Col Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Registry Actions */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/super-admin/teams/new"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
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
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
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
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
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
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 hover:scale-[1.01] transition-all shadow-md text-white flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-white">
                    <CalendarBigIcon />
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

          {/* Database & Asset Utilities */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Database & Asset Utilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/sub-admin/import"
                className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <UploadIcon />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Import Database</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide font-mono">Upload player details</div>
                  </div>
                </div>
                <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#E8A800] transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/sub-admin/upload-images"
                className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 hover:border-[#FFB347]/25 hover:bg-white/[0.04] transition-all flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFB347]/10 flex items-center justify-center text-[#FFB347]">
                    <CameraIcon />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Upload Images</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide font-mono">Push images to GitHub</div>
                  </div>
                </div>
                <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#FFB347] transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/sub-admin/check-images"
                className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <SearchIcon />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Image Scanner</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide font-mono">Audit missing assets</div>
                  </div>
                </div>
                <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#E8A800] transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/sub-admin/delete-images"
                className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 hover:border-red-500/25 hover:bg-white/[0.04] transition-all flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <TrashIcon />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Manage Images</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide font-mono">Delete photos & cards</div>
                  </div>
                </div>
                <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-red-500 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Teams */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Recent Teams</h2>
              <Link
                href="/super-admin/teams"
                className="text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] flex items-center gap-1.5 transition-colors"
              >
                View All
                <ArrowRightIcon />
              </Link>
            </div>

            {recentTeams.length === 0 ? (
              <div className="rounded-xl border border-white/5 p-8 text-center bg-white/[0.01]">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 mx-auto mb-3">
                  <UsersIcon />
                </div>
                <div className="text-xs text-gray-400 mb-4 uppercase font-bold tracking-wider">No teams created yet</div>
                <Link
                  href="/super-admin/teams/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black rounded-lg font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  <PlusIcon />
                  Create First Team
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/super-admin/teams/${team.id}`}
                    className="group flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-black text-white font-mono">
                          {team.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white mb-0.5 truncate uppercase tracking-tight">{team.name}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Mgr: {team.managerName}</div>
                    </div>
                    <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ArrowRightIcon />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sidebar Directories & System Controls */}
        <div className="space-y-8">
          
          {/* Global Directories */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">Global Directories</h2>
            <div className="space-y-2">
              <Link
                href="/super-admin/seasons"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <CalendarIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">All Seasons</div>
                    <div className="text-[10px] text-gray-500 font-medium">View all tournaments</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/teams"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFB347]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FFB347]/10 flex items-center justify-center text-[#FFB347]">
                    <TrophyIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">All Teams</div>
                    <div className="text-[10px] text-gray-500 font-medium">Global team registry</div>
                  </div>
                </div>
                <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/players"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <PlayersIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">All Players</div>
                    <div className="text-[10px] text-gray-500 font-medium font-sans">Global player database</div>
                  </div>
                </div>
                <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/team-emails"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <MailIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Team Emails</div>
                    <div className="text-[10px] text-gray-500 font-medium">Export managers emails</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>
            </div>
          </div>

          {/* System Control & Security */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">Administration & Security</h2>
            <div className="space-y-2">
              <Link
                href="/super-admin/sub-admins"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <ShieldIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Sub-Admins</div>
                    <div className="text-[10px] text-gray-500 font-medium">Manage panel roles</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/audit-logs"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFB347]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FFB347]/10 flex items-center justify-center text-[#FFB347]">
                    <TerminalIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Audit Logs</div>
                    <div className="text-[10px] text-gray-500 font-medium font-sans">Track platform commits</div>
                  </div>
                </div>
                <div className="text-[#FFB347] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>

              <Link
                href="/super-admin/notifications"
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                    <BellIcon />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Notification Hub</div>
                    <div className="text-[10px] text-gray-500 font-medium">Global push alerts</div>
                  </div>
                </div>
                <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
                </div>
              </Link>
            </div>
          </div>

          {/* Web Push Toggle Card */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
            <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-4">Device Settings</h2>
            <PushToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
