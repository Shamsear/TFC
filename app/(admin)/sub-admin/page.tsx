import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

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

const PlayersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const TransferIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function SubAdminDashboard() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Fetch active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
    include: {
      seasonTeams: {
        include: { team: true }
      }
    }
  })

  // Fetch all seasons for selection
  const allSeasons = await prisma.seasons.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seasonTeams: {
        include: { team: true }
      }
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Sub Admin Dashboard
            </span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
            Manage season operations, team selection, retention, and live auctions
          </p>
        </div>

        {/* Active Season Info */}
        {activeSeason ? (
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/30 p-4 sm:p-6 lg:p-8">
              <div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-[#E8A800]/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-[#FFB347]/5 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5"><CalendarIcon /></div>
                      <span className="font-medium">Active Season</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{activeSeason.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-emerald-500/30 font-bold text-xs sm:text-sm">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    ACTIVE
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
                  <div className="rounded-lg sm:rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5"><DollarIcon /></div>
                      <span className="font-medium">Starting Purse</span>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#E8A800]">
                      ${activeSeason.startingPurse.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg sm:rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5"><TrophyIcon /></div>
                      <span className="font-medium">Participating Teams</span>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#FFB347]">
                      {activeSeason.seasonTeams.length}
                    </div>
                  </div>
                  <div className="rounded-lg sm:rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 p-3 sm:p-4 lg:p-5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5"><TrophyIcon /></div>
                      <span className="font-medium">Season Status</span>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400">
                      In Progress
                    </div>
                  </div>
                </div>

                {/* Quick Actions for Active Season */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  <Link
                    href={`/sub-admin/${activeSeason.id}/teams`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800] to-[#D49700] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#E8A800]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <UsersIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Team Selection</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Select participating teams</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/all-players`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFB347]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <PlayersIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">All Players</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">View all players by team</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/all-teams`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFC93A]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <UsersIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">All Teams</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">View all teams overview</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/transfers`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800] to-[#D49700] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#E8A800]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <TransferIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Transfer History</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">View auction history</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/retention`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFB347]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <TrophyIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Player Retention</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Manage retained players</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/tournaments`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFC93A]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <TrophyIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Tournaments</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Create & manage tournaments</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/calendar`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800] to-[#D49700] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#E8A800]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <CalendarIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Auction Calendar</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Schedule auction dates</div>
                  </Link>

                  <Link
                    href={`/sub-admin/${activeSeason.id}/auction-v2`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFB347] to-[#FFA500] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFB347]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <DollarIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Auction System</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Manage auction rounds</div>
                  </Link>

                  <Link
                    href="/sub-admin/import"
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFC93A] to-[#FFB800] p-4 sm:p-5 hover:scale-105 transition-all shadow-lg hover:shadow-[#FFC93A]/50"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/20 flex items-center justify-center">
                        <UploadIcon />
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base lg:text-lg">Import Database</div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/80">Upload player data</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 lg:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mx-auto mb-4 sm:mb-6">
                <CalendarIcon />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white mb-2">No Active Season</div>
              <p className="text-sm sm:text-base text-gray-400">
                There is currently no active season. Please contact a Super Admin to create and activate a season.
              </p>
            </div>
          </div>
        )}

        {/* All Seasons */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white">All Seasons</h2>
          </div>
          
          {allSeasons.length === 0 ? (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 lg:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-400 mx-auto mb-4 sm:mb-6">
                <CalendarIcon />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white mb-2">No seasons created yet</div>
              <p className="text-sm sm:text-base text-gray-400">
                Contact a Super Admin to create a season.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {allSeasons.map((season) => (
                <div
                  key={season.id}
                  className="group rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex-1 w-full lg:w-auto">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="text-xl sm:text-2xl font-black text-white">{season.name}</div>
                        {season.isActive && (
                          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 sm:px-3 py-1 rounded-full border border-emerald-500/30 text-xs font-bold">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4"><DollarIcon /></div>
                          <span>Starting Purse: <span className="text-[#E8A800] font-bold">${season.startingPurse.toLocaleString()}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4"><TrophyIcon /></div>
                          <span><span className="text-[#FFB347] font-bold">{season.seasonTeams.length}</span> teams</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <Link
                        href={`/sub-admin/${season.id}/teams`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-[#E8A800] hover:text-[#FFC93A] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#E8A800]/30 hover:border-[#E8A800]/50 hover:bg-[#E8A800]/10 transition-all font-medium"
                      >
                        Teams
                        <ArrowRightIcon />
                      </Link>
                      <Link
                        href={`/sub-admin/${season.id}/retention`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-[#FFB347] hover:text-[#FFC93A] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#FFB347]/30 hover:border-[#FFB347]/50 hover:bg-[#FFB347]/10 transition-all font-medium"
                      >
                        Retention
                        <ArrowRightIcon />
                      </Link>
                      <Link
                        href={`/sub-admin/${season.id}/tournaments`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-[#FFC93A] hover:text-[#FFB347] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#FFC93A]/30 hover:border-[#FFC93A]/50 hover:bg-[#FFC93A]/10 transition-all font-medium"
                      >
                        Tournaments
                        <ArrowRightIcon />
                      </Link>
                      <Link
                        href={`/sub-admin/${season.id}/calendar`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-[#E8A800] hover:text-[#FFB347] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#E8A800]/30 hover:border-[#E8A800]/50 hover:bg-[#E8A800]/10 transition-all font-medium"
                      >
                        Calendar
                        <ArrowRightIcon />
                      </Link>
                      <Link
                        href={`/sub-admin/${season.id}/auction-v2`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-[#FFB347] hover:text-[#FFC93A] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#FFB347]/30 hover:border-[#FFB347]/50 hover:bg-[#FFB347]/10 transition-all font-medium"
                      >
                        Auction
                        <ArrowRightIcon />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
