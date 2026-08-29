import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PushToggle from "@/components/notifications/PushToggle"
import { getActiveSeasonId } from "@/lib/get-active-season"

// Icon Components
const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const PlayersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const TransferIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ToolsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
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

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

const StatsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

export default async function SubAdminDashboard() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Get the sub-admin's assigned season IDs from the sub_admin_seasons table
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { 
      subAdminSeasons: {
        select: { seasonId: true }
      }
    }
  })

  const assignedSeasonIds = user?.subAdminSeasons.map(s => s.seasonId) || []

  // Fetch active season (reliable: uses TFCS-N ID sorting)
  const activeSeasonId = await getActiveSeasonId()
  const activeSeason = activeSeasonId && assignedSeasonIds.includes(activeSeasonId)
    ? await prisma.seasons.findUnique({
        where: { id: activeSeasonId },
        include: {
          seasonTeams: {
            include: { team: true }
          }
        }
      })
    : await prisma.seasons.findFirst({
        where: { 
          isActive: true,
          id: { in: assignedSeasonIds }
        },
        include: {
          seasonTeams: {
            include: { team: true }
          }
        }
      })

  // Fetch only seasons assigned to this sub-admin
  const allSeasons = await prisma.seasons.findMany({
    where: {
      id: { in: assignedSeasonIds }
    },
    orderBy: { createdAt: "desc" },
    include: {
      seasonTeams: {
        include: { team: true }
      }
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Page Title */}
      <div className="mb-8 lg:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Sub Admin Dashboard
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Manage season operations, team selection, retention, and live auctions
        </p>
      </div>

      {/* Active Season Info */}
      {activeSeason ? (
        <div className="mb-8 lg:mb-12">
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
            {/* Ambient glows inside card */}
            <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] bg-[#E8A800]/[0.02] rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-50%] left-[-20%] w-[400px] h-[400px] bg-[#FFB347]/[0.02] rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-white/5 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
                    <div className="w-4 h-4"><CalendarIcon /></div>
                    <span>Active Season</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{activeSeason.name}</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  ACTIVE
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 transition-all hover:border-[#E8A800]/25 duration-300 shadow-md">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
                    <div className="w-4 h-4"><DollarIcon /></div>
                    <span>Starting Purse</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#E8A800] font-mono">
                    ${activeSeason.startingPurse.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 transition-all hover:border-[#FFB347]/25 duration-300 shadow-md">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
                    <div className="w-4 h-4"><TrophyIcon /></div>
                    <span>Participating Teams</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {activeSeason.seasonTeams.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 transition-all hover:border-[#E8A800]/25 duration-300 shadow-md sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
                    <div className="w-4 h-4"><TrophyIcon /></div>
                    <span>Season Status</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    In Progress
                  </div>
                </div>
              </div>

              {/* Operations Categorized Grid */}
              <div className="space-y-8">
                
                {/* Category 1: Squads & Teams */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono mb-4 border-l-2 border-[#E8A800] pl-2">
                    Squads & Registries
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href={`/sub-admin/${activeSeason.id}/teams`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <UsersIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Team Selection</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Select participating teams</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/all-players`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <PlayersIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">All Players</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">View all players by team</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/all-teams`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <UsersIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">All Teams</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">View all teams overview</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/position-groups`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <PlayersIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Position Groups</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Manage position groups</div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Category 2: Auction & Retention */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono mb-4 border-l-2 border-[#FFB347] pl-2">
                    Auction & Retention
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href={`/sub-admin/${activeSeason.id}/auction`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <DollarIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Auction System</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Manage auction rounds</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/auction-settings`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <SettingsIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Auction Settings</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Configure auction rules</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/calendar`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <CalendarIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Auction Calendar</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Schedule auction dates</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/retention`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <TrophyIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Player Retention</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Manage retained players</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/retention-requests`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <TrophyIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Retention Requests</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Review team retentions</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/retention-windows`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <TrophyIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Retention Windows</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Manage retention windows</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/transfers`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <TransferIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Transfer History</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">View auction history</div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Category 3: Tournaments, Stats & Tools */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono mb-4 border-l-2 border-emerald-500 pl-2">
                    Tournaments & Tools
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href={`/sub-admin/${activeSeason.id}/tournaments`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 hover:scale-[1.01] transition-all shadow-md text-white flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-white">
                          <TrophyIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Tournaments</div>
                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Create & manage tournaments</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/season-stats`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <StatsIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Season Stats</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">View cumulative season stats</div>
                      </div>
                    </Link>

                    <Link
                      href={`/sub-admin/${activeSeason.id}/tools`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-5 hover:scale-[1.01] transition-all shadow-md text-[#0a0a0a] flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <ToolsIcon />
                        </div>
                        <div className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wider mb-0.5">Admin Tools</div>
                        <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">Balance audit & management</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mx-auto mb-6">
              <CalendarIcon />
            </div>
            <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No Active Season Assigned</div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
              You don't have access to the currently active season. Please contact a Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* All Seasons */}
      <div className="mb-8 lg:mb-12">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Your Assigned Seasons</h2>
        </div>
        
        {allSeasons.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto mb-6">
              <CalendarIcon />
            </div>
            <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No Seasons Assigned</div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
              You haven't been assigned to any seasons yet. Contact a Super Admin.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {allSeasons.map((season) => (
              <div
                key={season.id}
                className="group rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-xl"
              >
                <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] bg-[#E8A800]/[0.01] rounded-full blur-[80px] pointer-events-none" />

                {/* Season Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight">{season.name}</div>
                  {season.isActive && (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Season Stats */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-xs text-gray-400 mb-6 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 text-gray-500"><DollarIcon /></div>
                    <span>Starting Purse: <span className="text-[#E8A800] font-bold font-mono">${season.startingPurse.toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 text-gray-500"><TrophyIcon /></div>
                    <span><span className="text-[#FFB347] font-bold font-mono">{season.seasonTeams.length}</span> Participating Teams</span>
                  </div>
                </div>

                {/* Action Buttons - Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2 relative z-10">
                  <Link
                    href={`/sub-admin/${season.id}/teams`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 hover:bg-[#E8A800]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Teams
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/retention`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFB347]/30 hover:bg-[#FFB347]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Retention
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/tournaments`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFC93A]/30 hover:bg-[#FFC93A]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Tournaments
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/calendar`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 hover:bg-[#E8A800]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Calendar
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/auction`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFB347]/30 hover:bg-[#FFB347]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Auction
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/auction-settings`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 hover:bg-[#E8A800]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Settings
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/position-groups`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFB347]/30 hover:bg-[#FFB347]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Groups
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/sub-admin/${season.id}/tools`}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FFC93A]/30 hover:bg-[#FFC93A]/5 transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Tools
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Global Utilities */}
      <div className="mt-8 lg:mt-12">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Global Utilities</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <Link
            href="/sub-admin/import"
            className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                <UploadIcon />
              </div>
              <div className="font-sans">
                <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Import Database</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Upload player data</div>
              </div>
            </div>
            <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#E8A800] transition-opacity">
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            href="/sub-admin/upload-images"
            className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#FFB347]/25 hover:bg-white/[0.03] transition-all flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFB347]/10 flex items-center justify-center text-[#FFB347]">
                <CameraIcon />
              </div>
              <div className="font-sans">
                <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Upload Images</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Upload photos & cards to GitHub</div>
              </div>
            </div>
            <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#FFB347] transition-opacity">
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            href="/sub-admin/check-images"
            className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 flex items-center justify-center text-[#E8A800]">
                <SearchIcon />
              </div>
              <div className="font-sans">
                <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Image Scanner</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Find & fetch missing images</div>
              </div>
            </div>
            <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-[#E8A800] transition-opacity">
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            href="/sub-admin/delete-images"
            className="group relative overflow-hidden rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-red-500/25 hover:bg-white/[0.03] transition-all flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <TrashIcon />
              </div>
              <div className="font-sans">
                <div className="font-extrabold text-sm text-white uppercase tracking-wider mb-0.5">Manage Images</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Delete photos & cards</div>
              </div>
            </div>
            <div className="w-5 h-5 opacity-50 group-hover:opacity-100 text-red-500 transition-opacity">
              <ArrowRightIcon />
            </div>
          </Link>
        </div>
      </div>
      
      {/* Push Notification Controls */}
      <div className="mt-8 lg:mt-12">
        <PushToggle />
      </div>
    </div>
  )
}
